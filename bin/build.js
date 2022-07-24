import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import CompendiumPack, { PackError } from "./util/compendium-pack.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packsDataPath = resolve(__dirname, "..", "src", "packs");
const packDirPaths = readdirSync(packsDataPath).map((dirName) =>
    resolve(__dirname, packsDataPath, dirName)
);

// Loads all packs into memory for the sake of making all entity name/id mappings available
const packs = packDirPaths.map((dirPath) => CompendiumPack.loadJSON(dirPath));
const entityCounts = packs.map((pack) => pack.save());
const total = entityCounts.reduce(
    (runningTotal, entityCount) => runningTotal + entityCount,
    0
);

if (entityCounts.length > 0) {
    console.log(`Created ${entityCounts.length} packs with ${total} entities.`);
} else {
    throw PackError("No data available to build packs.");
}
