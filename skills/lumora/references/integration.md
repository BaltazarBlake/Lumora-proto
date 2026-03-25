# Integration

Use this skill when an external tool-using agent needs to manage a user's own vault without embedding vault-specific logic in the agent itself.

## Recommended agent loop

1. Load or create a user vault profile.
2. Call `decision`.
3. If the result is actionable, call `preview_rebalance`.
4. If self-custody is required:
   - use `request-signer`, or
   - use `delegated` and submit the returned transaction outside the API.
5. Read `history` for the same `target`.

## Why this works for external agents

The agent does not need to know:

- how OKX market data is fetched
- how vault state is read
- how rebalances are encoded
- how history is namespaced

It only needs:

- one skill endpoint
- a target
- an execution policy

## Delegated execution

`delegated` is useful when:

- the external agent cannot or should not hand the signing key to the server
- the agent wants to inspect or route the transaction elsewhere
- the user wants a self-custody execution path

In delegated mode:

- preview still works
- execute returns an unsigned transaction payload
- the caller is responsible for signing and broadcasting
