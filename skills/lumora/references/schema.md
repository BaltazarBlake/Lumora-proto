# Schema

The local API endpoint is:

```text
POST /api/skill/lumora
```

## Common fields

### `target`

Use one of:

```json
{
  "target": {
    "profileId": "alice-xlayer-vault"
  }
}
```

```json
{
  "target": {
    "deploymentsFile": "deployments/alice-xlayer-mainnet.json"
  }
}
```

```json
{
  "target": {
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
}
```

### `auth`

Use one of:

```json
{
  "auth": {
    "policy": "env-signer"
  }
}
```

```json
{
  "auth": {
    "policy": "request-signer",
    "signerPrivateKey": "0x..."
  }
}
```

```json
{
  "auth": {
    "policy": "delegated",
    "executorAddress": "0x..."
  }
}
```

## Operations

### `decision`

```json
{
  "operation": "decision",
  "pair": "WETH-STK",
  "target": {
    "profileId": "alice-xlayer-vault"
  },
  "auth": {
    "policy": "delegated",
    "executorAddress": "0x1111111111111111111111111111111111111111"
  },
  "options": {
    "includeMarketHistory": true,
    "includeExecutionPreview": true
  }
}
```

### `preview_rebalance`

```json
{
  "operation": "preview_rebalance",
  "pair": "WETH-STK",
  "mode": "agent",
  "target": {
    "profileId": "alice-xlayer-vault"
  },
  "auth": {
    "policy": "request-signer",
    "signerPrivateKey": "0x..."
  }
}
```

### `execute_rebalance`

```json
{
  "operation": "execute_rebalance",
  "pair": "WETH-STK",
  "mode": "manual",
  "manualRange": {
    "tickLower": -200820,
    "tickUpper": -199620
  },
  "target": {
    "profileId": "alice-xlayer-vault"
  },
  "auth": {
    "policy": "delegated",
    "executorAddress": "0x1111111111111111111111111111111111111111"
  }
}
```

When `auth.policy = "delegated"`, the result includes `delegatedTransaction` instead of submitting a tx directly.
