/**
 * This is a stripped-down version of the Pathfinder 2e pack script with
 * Typescript stripped out and some sanity checks removed.
 * @see https://github.com/foundryvtt/pf2e/blob/master/packs/scripts/packman/compendium-pack.ts
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sluggify from "./sluggify.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PackError = (message) => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

function isObject(value) {
    return typeof value === "object" && value !== null;
}

function isActorSource(docSource) {
    return (
        "data" in docSource &&
        isObject(docSource.data) &&
        "items" in docSource &&
        Array.isArray(docSource.items)
    );
}

function isItemSource(docSource) {
    return (
        "data" in docSource &&
        isObject(docSource.data) &&
        !isActorSource(docSource)
    );
}

export default class CompendiumPack {
    name;
    packDir;
    documentType;
    systemId = "pf2e";
    data;

    static outDir = resolve(process.cwd(), "dist", "packs");
    static namesToIds = new Map();
    static packsMetadata = JSON.parse(
        readFileSync(
            resolve(__dirname, "..", "..", "dist", "module.json"),
            "utf-8"
        )
    ).packs;
    static worldItemLinkPattern = new RegExp(
        /@(?:Item|JournalEntry|Actor)\[[^\]]+\]|@Compendium\[world\.[^\]]+\]/
    );

    constructor(packDir, parsedData) {
        const metadata = CompendiumPack.packsMetadata.find(
            (pack) => basename(pack.path) === basename(packDir)
        );
        if (metadata === undefined) {
            throw PackError(
                `Compendium at ${packDir} has no metadata in the local module.json file.`
            );
        }
        this.name = metadata.name;
        this.documentType = metadata.type;

        if (!this.isPackData(parsedData)) {
            throw PackError(
                `Data supplied for ${this.name} does not resemble Foundry document source data.`
            );
        }

        this.packDir = packDir;

        CompendiumPack.namesToIds.set(this.name, new Map());
        const packMap = CompendiumPack.namesToIds.get(this.name);
        if (!packMap) {
            throw PackError(
                `Compendium ${this.name} (${packDir}) was not found.`
            );
        }

        parsedData.sort((a, b) => {
            if (a._id === b._id) {
                throw PackError(`_id collision in ${this.name}: ${a._id}`);
            }
            return a._id > b._id ? 1 : -1;
        });

        this.data = parsedData;

        for (const docSource of this.data) {
            // Populate CompendiumPack.namesToIds for later conversion of compendium links
            packMap.set(docSource.name, docSource._id);

            // Check img paths
            if ("img" in docSource && typeof docSource.img === "string") {
                const imgPaths = [docSource.img ?? ""].concat(
                    isActorSource(docSource)
                        ? docSource.items.map((itemData) => itemData.img ?? "")
                        : []
                );
                const documentName = docSource.name;
                for (const imgPath of imgPaths) {
                    if (imgPath.startsWith("data:image")) {
                        const imgData = imgPath.slice(0, 64);
                        const msg = `${documentName} (${this.name}) has base64-encoded image data: ${imgData}...`;
                        throw PackError(msg);
                    }

                    if (!(imgPath === "" || imgPath.match(/\.(?:svg|webp)$/))) {
                        console.info(
                            `${documentName} (${this.name}) references a non-WEBP/SVG image: ${imgPath}`
                        );
                    }
                }
            }
            if ("type" in docSource && docSource.type === "script") {
                docSource.permission ??= { default: 1 };
            }
        }
    }

    static loadJSON(dirPath) {
        if (!dirPath.replace(/\/$/, "").endsWith(".db")) {
            const dirName = basename(dirPath);
            throw PackError(
                `JSON directory (${dirName}) does not end in ".db"`
            );
        }

        const filenames = readdirSync(dirPath);
        const filePaths = filenames.map((filename) =>
            resolve(dirPath, filename)
        );
        const parsedData = filePaths.map((filePath) => {
            const jsonString = readFileSync(filePath, "utf-8");
            const packSource = (() => {
                try {
                    return JSON.parse(jsonString);
                } catch (error) {
                    if (error instanceof Error) {
                        throw PackError(
                            `File ${filePath} could not be parsed: ${error.message}`
                        );
                    }
                }
            })();

            const documentName = packSource?.name;
            if (documentName === undefined) {
                throw PackError(
                    `Document contained in ${filePath} has no name.`
                );
            }

            const filenameForm = sluggify(documentName).concat(".json");
            if (basename(filePath) !== filenameForm) {
                throw PackError(
                    `Filename at ${filePath} does not reflect document name (should be ${filenameForm}).`
                );
            }

            return packSource;
        });

        const dbFilename = basename(dirPath);
        return new CompendiumPack(dbFilename, parsedData);
    }

    finalize(docSource) {
        // Replace all compendium entities linked by name to links by ID
        const stringified = JSON.stringify(docSource);
        const worldItemLink =
            CompendiumPack.worldItemLinkPattern.exec(stringified);
        if (worldItemLink !== null) {
            throw PackError(
                `${docSource.name} (${this.name}) has a link to a world item: ${worldItemLink[0]}`
            );
        }

        docSource.flags ??= {};
        docSource.flags.core = { sourceId: this.sourceIdOf(docSource._id) };

        if (isItemSource(docSource)) {
            docSource.data.slug = sluggify(docSource.name);
            docSource.data.schema = { version: 0.75, lastMigration: null };

            // if (isPhysicalData(docSource)) {
            //     docSource.data.equipped = { carryType: "worn" };
            // }

            // Convert uuids with names in GrantItem REs to well-formedness
            CompendiumPack.convertRuleUUIDs(docSource, {
                to: "ids",
                map: CompendiumPack.namesToIds,
            });
        }

        return JSON.stringify(docSource).replace(
            /@Compendium\[pf2e\.(?<packName>[^.]+)\.(?<documentName>[^\]]+)\]\{?/g,
            (match, packName, documentName) => {
                const namesToIds = CompendiumPack.namesToIds.get(packName);
                if (namesToIds === undefined) {
                    return match;
                }

                const documentId = namesToIds.get(documentName);
                if (documentId === undefined) {
                    throw PackError(
                        `${docSource.name} (${this.name}) has broken link to ${documentName} (${packName}).`
                    );
                }
                const labelBrace = match.endsWith("{") ? "{" : "";

                return `@Compendium[pf2e.${packName}.${documentId}]${labelBrace}`;
            }
        );
    }

    sourceIdOf(documentId) {
        return `Compendium.${this.systemId}.${this.name}.${documentId}`;
    }

    /** Convert UUIDs in ChoiceSet/GrantItem REs to resemble links by name or back again */
    static convertRuleUUIDs(source, { to, map }) {
        const hasUUIDChoices = (choices) =>
            typeof choices === "object" &&
            Object.values(choices ?? {}).every(
                (c) =>
                    typeof c.value === "string" &&
                    c.value.startsWith("Compendium.")
            );

        const toNameRef = (uuid) => {
            const parts = uuid.split(".");
            const [packId, docId] = parts.slice(2, 4);
            const docName = map.get(packId)?.get(docId);
            if (docName) {
                return parts.slice(0, 3).concat(docName).join(".");
            } else {
                throw PackError(
                    `Unable to find document name corresponding with ${uuid}`
                );
            }
        };

        const toIDRef = (uuid) => {
            const match =
                /(?<=^Compendium\.ponyfinder-foundryvtt-module\.)([^.]+)\.(.+)$/.exec(
                    uuid
                );
            if (!match) {
                return uuid;
            }

            const [, packId, docName] = match ?? [null, null, null];
            const docId = map.get(packId ?? "")?.get(docName ?? "");
            if (docName && docId) {
                return uuid.replace(docName, docId);
            } else {
                throw PackError(
                    `Unable to resolve UUID in ${source.name}: ${uuid}`
                );
            }
        };

        const convert = to === "ids" ? toIDRef : toNameRef;
        const rules = source.data.rules;
        for (const rule of rules) {
            if (
                rule.key === "GrantItem" &&
                typeof rule.uuid === "string" &&
                !rule.uuid.startsWith("{")
            ) {
                rule.uuid = convert(rule.uuid);
            } else if (
                rule.key === "ChoiceSet" &&
                hasUUIDChoices(rule.choices)
            ) {
                for (const [key, choice] of Object.entries(rule.choices)) {
                    rule.choices[key].value = convert(choice.value);
                }
            }
        }

        if (source.data.ancestry) {
            if (
                typeof source.data.ancestry.uuid === "string" &&
                !source.data.ancestry.uuid.startsWith("{")
            ) {
                source.data.ancestry.uuid = convert(source.data.ancestry.uuid);
            }
        }
    }

    save() {
        writeFileSync(
            resolve(CompendiumPack.outDir, this.packDir),
            this.data
                .map((datum) => this.finalize(datum))
                .join("\n")
                .concat("\n")
        );
        console.log(
            `Pack "${this.name}" with ${this.data.length} entries built successfully.`
        );

        return this.data.length;
    }

    isDocumentSource(maybeDocSource) {
        if (!isObject(maybeDocSource)) return false;
        const checks = Object.entries({
            name: (data) => typeof data.name === "string",
            permission: (data) =>
                !data.permission ||
                (typeof data.permission === "object" &&
                    data.permission !== null &&
                    Object.keys(data.permission).length === 1 &&
                    Number.isInteger(data.permission.default)),
        });

        const failedChecks = checks
            .map(([key, check]) => (check(maybeDocSource) ? null : key))
            .filter((key) => key !== null);

        if (failedChecks.length > 0) {
            throw PackError(
                `Document source in (${
                    this.name
                }) has invalid or missing keys: ${failedChecks.join(", ")}`
            );
        }

        return true;
    }

    isPackData(packData) {
        return packData.every((maybeDocSource) =>
            this.isDocumentSource(maybeDocSource)
        );
    }
}
