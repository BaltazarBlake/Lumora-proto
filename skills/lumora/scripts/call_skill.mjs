#!/usr/bin/env node

import fs from "node:fs/promises";

const args = parseArgs(process.argv.slice(2));
const endpoint = args.url ?? process.env.LUMORA_API_URL ?? "http://127.0.0.1:3000/api/skill/lumora";

if (!args.input && !args.payload) {
  console.error("Usage: node scripts/call_skill.mjs --input payload.json");
  console.error('   or: node scripts/call_skill.mjs --payload \'{"operation":"decision"}\'');
  process.exit(1);
}

const payload = args.input
  ? JSON.parse(await fs.readFile(args.input, "utf8"))
  : JSON.parse(args.payload);

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

const text = await response.text();
if (!response.ok) {
  console.error(`Request failed with status ${response.status}`);
  console.error(text);
  process.exit(1);
}

console.log(JSON.stringify(JSON.parse(text), null, 2));

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
