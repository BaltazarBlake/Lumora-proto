---
name: lumora
description: Use when an external agent needs to manage a user's own Uniswap V3 vault through the local AI ALM API, including per-user target selection, vault profiles, request-scoped signer policies, delegated execution, market snapshots, decisions, previews, execution, and history.
---

# Lumora

Use this skill when an agent needs to manage a user's own LP / vault through the local `lumora` API skill instead of relying on the server's single global deployment.

This skill assumes the AI ALM API is running locally and exposes:

- `POST /api/skill/lumora`

## Quick start

1. Build a payload for one of these operations:
   - `market_snapshot`
   - `vault_state`
   - `decision`
   - `preview_rebalance`
   - `execute_rebalance`
   - `history`
2. Provide either:
   - `target.deploymentsFile`
   - `target.profileId`
   - `target.addresses`
3. Choose execution auth:
   - omit `auth` or use `env-signer`
   - `request-signer`
   - `delegated`
4. Call `scripts/call_skill.mjs`.

## Payload rules

- Use `target.profileId` when the user already has a saved vault profile.
- Use `target.deploymentsFile` when the user has a manifest file for their vault.
- Use `target.addresses` when the user wants to point at a vault without a saved manifest.
- Use `auth.policy = "request-signer"` when the user's own agent should provide the signing key per request.
- Use `auth.policy = "delegated"` when the agent should receive unsigned transaction payloads and submit them elsewhere.
- Keep `decideRebalance` as the source of truth for decision logic; do not replace it with free-form prompting.

## Scripts

- `scripts/call_skill.mjs`
  Call the local `lumora` API with a JSON payload.
- `scripts/save_vault_profile.mjs`
  Save a reusable vault profile into `data/vault-profiles/<profileId>.json`.

## Reference map

Read only what you need:

- `references/schema.md`
  Operation payloads and response shapes.
- `references/profiles.md`
  How to save and reuse user-specific vault profiles.
- `references/integration.md`
  Suggested flows for external agents such as OpenClaw-like tool-using agents.

## Recommended flow

For a new user target:

1. Save a profile with `scripts/save_vault_profile.mjs`, or pass `target` inline.
2. Call `decision`.
3. If execution is desired, call `preview_rebalance`.
4. If the user wants self-custody execution:
   - use `request-signer`, or
   - use `delegated` and submit the returned transaction externally.

For ongoing usage:

1. Reuse `target.profileId`.
2. Read `history` for that target namespace.
3. Keep execution policy explicit in every rebalance request.
