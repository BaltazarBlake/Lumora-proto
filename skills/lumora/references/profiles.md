# Profiles

Profiles let an external agent reuse a user-specific vault target without passing the full target object every time.

Profiles are stored at:

```text
data/vault-profiles/<profileId>.json
```

## Save a profile

```bash
node skills/lumora/scripts/save_vault_profile.mjs \
  --profile-id alice-xlayer-vault \
  --input /path/to/profile.json
```

## Example profile

```json
{
  "deploymentsFile": "deployments/alice-xlayer-mainnet.json"
}
```

Or:

```json
{
  "addresses": {
    "vault": "0x...",
    "manager": "0x...",
    "token0": "0x...",
    "token1": "0x...",
    "weth9": "0x..."
  },
  "metadata": {
    "networkName": "xlayer-mainnet",
    "chainId": 196,
    "poolFee": 3000
  }
}
```

## Use a profile

```json
{
  "operation": "history",
  "target": {
    "profileId": "alice-xlayer-vault"
  }
}
```

The system uses the profile to:

- resolve the vault target
- isolate history namespace
- let each user agent manage its own vault context
