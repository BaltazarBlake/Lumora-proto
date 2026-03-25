#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = parseArgs(process.argv.slice(2));
const profileId = args["profile-id"];

if (!profileId) {
  console.error("Usage: node scripts/save_vault_profile.mjs --profile-id my-vault --input profile.json");
  process.exit(1);
}

if (!args.input && !args.payload) {
  console.error("Provide --input profile.json or --payload '{...}'");
  process.exit(1);
}

const profile = args.input
  ? JSON.parse(await fs.readFile(args.input, "utf8"))
  : JSON.parse(args.payload);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
const profileDir = path.join(repoRoot, "data/vault-profiles");
const outputPath = path.join(profileDir, `${profileId}.json`);

await fs.mkdir(profileDir, { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(profile, null, 2)}\n`, "utf8");

console.log(`Saved vault profile: ${outputPath}`);

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    parsed[key] = argv[index + 1];
    index += 1;
  }

  return parsed;
}
