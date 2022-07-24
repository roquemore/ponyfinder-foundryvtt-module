import CopyPlugin from "copy-webpack-plugin";
import FileManagerPlugin from "filemanager-webpack-plugin";
import imagemin from "imagemin";
import imageminPngquant from "imagemin-pngquant";
import imageminSvgo from "imagemin-svgo";
import imageminWebp from "imagemin-webp";
import JsonMinimizerPlugin from "json-minimizer-webpack-plugin";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebpackManifestPlugin } from "webpack-manifest-plugin";

import packageJson from "./package.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('webpack').Configuration} */
const config = {
    entry: {
        "scripts/heritage-ability-boosts": resolve(
            __dirname,
            "src",
            "scripts",
            "heritage-ability-boosts.ts"
        ),
    },
    experiments: { outputModule: true },
    output: {
        assetModuleFilename: "[name][ext]",
        clean: true,
        filename: "[name].js",
        library: { type: "module" },
        path: resolve(__dirname, "dist"),
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: "ts-loader",
                exclude: /node_modules/,
                options: { compilerOptions: { noEmit: false } },
            },
        ],
    },
    optimization: {
        minimize: true,
        minimizer: ["...", new JsonMinimizerPlugin()],
    },
    resolve: { extensions: [".ts", ".js"] },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    context: "src",
                    from: "lang/**/*.json",
                    to: resolve(__dirname, "dist"),
                },
                {
                    context: "src",
                    from: "assets/**/*.{png,svg,webp}",
                    to: resolve(__dirname, "dist"),
                    async transform(content) {
                        return imagemin.buffer(content, {
                            plugins: [
                                imageminPngquant(),
                                imageminSvgo(),
                                imageminWebp(),
                            ],
                        });
                    },
                },
            ],
        }),
        new WebpackManifestPlugin({
            fileName: "module.json",
            filter: (file) =>
                file.name.endsWith(".js") || file.name.endsWith(".json"),
            generate: (_, files, __) => ({
                name: packageJson.name,
                title: packageJson.title,
                description: packageJson.description,
                version: packageJson.version,
                author: packageJson.author.name,
                system: ["pf2e"],
                minimumCoreVersion: "9",
                compatibleCoreVersion: "9",
                url: packageJson.homepage,
                download: `${packageJson.homepage}/releases/download/latest/ponyfinder-foundryvtt-module.zip`,
                manifest: `${packageJson.homepage}/releases/download/latest/module.json`,
                esmodules: files
                    .filter(
                        (file) =>
                            file.name.startsWith("scripts/") &&
                            file.name.endsWith(".js")
                    )
                    .map((file) => file.name),
                languages: files
                    .filter(
                        (file) =>
                            file.name.startsWith("lang/") &&
                            file.name.endsWith(".json")
                    )
                    .map((file) => ({
                        lang: file.name
                            .replace(/.*\//, "")
                            .replace(/\.json$/i, ""),
                        name: new Intl.DisplayNames("en-US", {
                            type: "language",
                        }).of(
                            file.name
                                .replace(/.*\//, "")
                                .replace(/\.json$/i, "")
                        ),
                        path: file.name,
                    })),
                packs: [
                    {
                        name: "ponyfinder-actions",
                        label: "Ponyfinder Actions",
                        path: "packs/ponyfinder-actions.db",
                        entity: "Item",
                        type: "Item",
                    },
                    {
                        name: "ponyfinder-ancestries",
                        label: "Ponyfinder Ancestries",
                        path: "packs/ponyfinder-ancestries.db",
                        entity: "Item",
                        type: "Item",
                    },
                    {
                        name: "ponyfinder-ancestry-features",
                        label: "Ponyfinder Ancestry Features",
                        path: "packs/ponyfinder-ancestry-features.db",
                        entity: "Item",
                        type: "Item",
                    },
                    {
                        name: "ponyfinder-archetypes",
                        label: "Ponyfinder Archetypes",
                        path: "packs/ponyfinder-archetypes.db",
                        entity: "Item",
                        type: "JournalEntry",
                    },
                    {
                        name: "ponyfinder-deities",
                        label: "Ponyfinder Deities",
                        path: "packs/ponyfinder-deities.db",
                        entity: "Item",
                        type: "Item",
                    },
                    {
                        name: "ponyfinder-domains",
                        label: "Ponyfinder Domains",
                        path: "packs/ponyfinder-domains.db",
                        entity: "Item",
                        type: "Item",
                    },
                    {
                        name: "ponyfinder-effects",
                        label: "Ponyfinder Effects",
                        path: "packs/ponyfinder-effects.db",
                        entity: "Item",
                        type: "Item",
                    },
                    {
                        name: "ponyfinder-feats",
                        label: "Ponyfinder Feats",
                        path: "packs/ponyfinder-feats.db",
                        entity: "Item",
                        type: "Item",
                    },
                    {
                        name: "ponyfinder-heritages",
                        label: "Ponyfinder Heritages",
                        path: "packs/ponyfinder-heritages.db",
                        entity: "Item",
                        type: "Item",
                    },
                    {
                        name: "ponyfinder-spells",
                        label: "Ponyfinder Spells",
                        path: "packs/ponyfinder-spells.db",
                        entity: "Item",
                        type: "Item",
                    },
                ],
                flags: {
                    "ponyfinder-foundryvtt-module": {
                        "pf2e-homebrew": {
                            creatureTraits: {
                                cloven: "Cloven",
                                doppelganger: "Doppelganger",
                                flutterpony: "Flutterpony",
                                griffon: "Griffon",
                                "half-construct": "Half-Construct",
                                krava: "Krava",
                                "phoenix-wolf": "Phoenix Wolf",
                                ponykind: "Ponykind",
                                purrsian: "Purrsian",
                                steelheart: "Steelheart",
                                "sun-cat": "Sun Cat",
                            },
                            featTraits: {
                                cloven: "Cloven",
                                doppelganger: "Doppelganger",
                                flutterpony: "Flutterpony",
                                griffon: "Griffon",
                                "half-construct": "Half-Construct",
                                krava: "Krava",
                                "phoenix-wolf": "Phoenix Wolf",
                                ponykind: "Ponykind",
                                purrsian: "Purrsian",
                                "spirit-tribe": "Spirit Tribe",
                                steelheart: "Steelheart",
                                "sun-cat": "Sun Cat",
                            },
                        },
                    },
                },
            }),
        }),
        new FileManagerPlugin({
            events: {
                onEnd: {
                    archive: [
                        {
                            source: resolve(__dirname, "dist"),
                            destination: resolve(
                                __dirname,
                                "dist",
                                "ponyfinder-foundryvtt-module.zip"
                            ),
                        },
                    ],
                    mkdir: [resolve(__dirname, "dist", "packs")],
                },
            },
        }),
    ],
};
export default config;
