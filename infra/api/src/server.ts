import { config as loadEnv } from "dotenv";

import { loadAppEnv } from "@ai-alm/sdk";

import { createApp } from "./app.js";

loadEnv();
loadEnv({ path: ".env.local", override: true });

const env = loadAppEnv();
const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`ai-alm-demo-api listening on port ${env.API_PORT}`);
});
