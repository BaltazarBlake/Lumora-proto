# Lumora: AI-Native Concentrated Liquidity DEX
## Product Whitepaper (MVP Version)

---

## 1. Project Overview

Lumora is an **AI-native concentrated liquidity DEX protocol** that integrates intelligent liquidity management at the protocol level, powered by **X Layer Onchain OS**.

In simple terms, it works like this:

- Lumora is a DEX with concentrated liquidity pools (similar to Uniswap V3 architecture)
- Users provide liquidity and can bring their own AI agents
- Agents install the `lumora` Skill to manage liquidity positions
- The Skill reads **X Layer Onchain OS / Market MCP** market data and combines it with liquidity pool state
- AI agents determine whether liquidity ranges need adjustment and produce structured decisions
- The Manager contract executes rebalances, or returns delegated execution payloads for self-custody

The goal of this project is not to build a fully automated, highly predictive, consistently profitable trading system on day one.

The goal of the MVP is to deliver a **working, explainable, demo-ready** DEX that proves three things:

1. Lumora functions as a concentrated liquidity DEX where users can provide liquidity
2. AI agents can manage liquidity positions through the installed Skill
3. The system generates intelligent decisions from X Layer Onchain OS market data and executes rebalances through smart contracts

This will become the foundation for a more complete AI-native DEX ecosystem.

---

## 2. Problem Background

### 2.1 The Opportunity and Difficulty of Concentrated Liquidity

Concentrated liquidity DEXs offer a major innovation: LPs are no longer limited to providing liquidity across the full price curve. They can choose narrower price ranges and achieve higher capital efficiency.

But this also introduces new problems:

- once price moves out of range, position efficiency drops
- LPs need to monitor the market continuously
- they must decide manually whether to rebalance
- frequent rebalances consume gas and create slippage costs
- most users cannot manage this optimally on an ongoing basis

In other words, concentrated liquidity gives LPs more control, but it also hands them the full complexity of active management.

### 2.2 The Problem Lumora Solves

Lumora addresses this challenge at the protocol level:

> How can a DEX integrate AI-powered liquidity management so that LPs benefit from concentrated liquidity without the management burden?

Lumora is not mainly about "AI predicting price." It is about building a complete DEX protocol that combines:

- concentrated liquidity pools
- X Layer Onchain OS market data integration
- AI agent decision-making
- automated rebalance execution
- explainable and transparent operations

---

## 3. Product Vision

The long-term vision of Lumora is to become the **first truly AI-native DEX protocol**.

At the MVP stage, we focus on one clear value proposition:

> A DEX where liquidity providers can delegate position management to AI agents that use X Layer Onchain OS market intelligence to optimize their positions automatically.

From a product perspective, Lumora provides:

- A concentrated liquidity DEX with competitive trading fees
- Built-in AI agent integration for LP management
- X Layer Onchain OS market data for intelligent decision-making
- Bring-your-own-agent architecture for flexibility
- Explainable rebalance decisions

In the future, Lumora can expand to:

- multi-pool support across different token pairs
- multiple AI strategy modes (conservative, balanced, aggressive)
- richer market signals and predictive models
- user-specific risk preference settings
- cross-chain liquidity management
- a complete LP management dashboard

---

## 4. Product Scope

### 4.1 What the MVP Includes

The MVP includes:

- a **Vault contract** for LP deposits and share accounting
- a **Manager contract** for concentrated liquidity position operations and rebalancing
- a public **`lumora` Skill** for AI agent integration
- internal orchestration between **X Layer Onchain OS / Market MCP** and local execution tools
- an **API layer** for external agents and future frontends
- basic execution history, decision history, and multi-vault support

### 4.2 What the MVP Does Not Include

The MVP does not aim to include:

- a complete frontend application
- reinforcement learning training
- advanced predictive models
- high-frequency autonomous execution
- multi-chain deployment
- advanced yield analytics

This is intentional product narrowing, not a lack of ambition.
The purpose of the MVP is to **prove that an AI-native DEX works**.

---

## 5. Target Users

### Primary Users
- DeFi builders and liquidity providers
- Hackathon judges
- Protocol developers
- Technical early adopters

### Secondary Users
- LPs who want intelligent concentrated liquidity management
- Protocols that want to integrate AI-powered DEX infrastructure
- Product teams interested in AI + DeFi use cases

---

## 6. Core Product Concepts

Lumora consists of four core modules:

1. **DEX Protocol Layer** (Vault + Manager contracts)
2. **X Layer Market Intelligence** (X Layer Onchain OS integration)
3. **AI Agent Skill** (public agent interface)
4. **Decision Engine** (testable rule-based decision core)

---

## 7. Core Module Descriptions

### 7.1 Vault

The Vault is the entry and aggregation layer for LP funds.

It is mainly responsible for:

- LP deposits
- LP withdrawals
- share accounting
- vault-level asset state aggregation

The Vault is the DEX's liquidity container.

### 7.2 Manager

The Manager is the execution layer that handles concentrated liquidity position management.

It is mainly responsible for:

- reading the current LP position state
- removing old liquidity
- collecting fees
- rebuilding positions with new ranges
- executing rebalance actions derived from AI agents

The Manager is the execution engine of the DEX.

### 7.3 X Layer Onchain OS Market Intelligence

This capability reads market data from **X Layer Onchain OS / Market MCP** and formats it for AI agent use.

It is mainly responsible for:

- retrieving the current index price
- retrieving recent historical prices
- computing simple indicators such as:
  - short EMA
  - long EMA
  - volatility
  - short-term price movement

Its purpose is not to make decisions, but to provide standardized market inputs for AI agents.

### 7.4 `lumora` Skill and Decision Core

The public interface is one unified Skill: `lumora`.

It is mainly responsible for:

- reading market snapshots from X Layer Onchain OS
- reading current LP position state
- calling the testable rule module to determine whether the current range is still appropriate
- determining whether a rebalance is justified
- producing HOLD or REBALANCE decisions
- returning human-readable reasons

The goal of this Skill is not magical prediction. Its job is to orchestrate external agents, X Layer Onchain OS market data, local tools, and the rule-based decision core into a **structured, explainable, executable** capability.

---

## 8. Product Workflow

The product workflow can be described very simply.

### Step 1: User Provides Liquidity to Lumora DEX

The user deposits assets into a Lumora liquidity vault.

### Step 2: The User's Agent Installs and Calls the Skill

The user's own agent installs the `lumora` Skill and passes `target` plus the desired execution strategy in each request.

### Step 3: The System Reads Market Data

The Skill internally calls X Layer Onchain OS / Market MCP to fetch the latest price and recent price changes.

### Step 4: The Agent Evaluates the Current Position

The Skill evaluates the following:

- current price
- current LP range
- how close price is to the boundaries
- volatility changes
- time since last rebalance
- estimated gas and slippage cost

### Step 5: The Agent Outputs a Decision

It outputs one of two outcomes:

- HOLD
- REBALANCE with a target range

### Step 6: Execute or Return a Delegated Transaction

If execution is allowed, the system can:

- directly call the Manager contract to rebalance
- or return a delegated execution transaction payload for the user's agent or wallet to submit

### Step 7: The System Returns Results Through API / Skill

It returns:

- current market state
- current liquidity position state
- agent decision result
- rebalance execution result
- decision reasons

---

## 9. Why AI Is Used Here

AI is not used here just for trend appeal. It is used to do one clear job:

> convert market state and position state into a structured rebalance decision

In this context, the value of AI is not perfect price prediction. Its value is that it can:

- combine multiple inputs
- make context-aware judgments
- produce explainable reasons
- become the foundation for more advanced strategies later

At the MVP stage, a **rule-driven strategy with explainable output** is actually the more sensible choice because it is:

- easier to validate
- easier to debug
- easier for judges and PMs to understand
- better suited to a first product version

More advanced predictive models or RL can be added later.

---

## 10. MVP Decision Logic

At the MVP stage, the decision logic should remain simple and transparent.

It mainly considers:

- current price
- current range boundaries
- distance from price to those boundaries
- recent volatility
- recent trend
- current execution cost (gas/slippage preview)
- time since the last rebalance

### When to Rebalance

Examples of conditions that may trigger a rebalance:

- price is approaching a boundary
- volatility has risen significantly
- current rules indicate that range position, volatility, trend, and minimum interval conditions are satisfied
- gas and slippage estimates are acceptable
- sufficient time has elapsed since the last rebalance

### When Not to Rebalance

Examples:

- price remains near the middle of the range
- volatility is low
- gas cost is too high
- the position was rebalanced recently

### Example Output

```json
{
  "action": "REBALANCE_SHIFT_UP",
  "reason": [
    "price is close to the upper boundary",
    "volatility has risen, suggesting a range adjustment"
  ],
  "executionPreview": {
    "gasEstimate": "250000",
    "slippageBps": 120
  }
}
```

This explanation layer is critical because it directly affects whether users trust the DEX.

---

## 11. API-First Product Design

The MVP does not require a frontend, but it must be **API-first**.

That means the frontend is not required for the DEX to exist.
Any future frontend, script, bot, or console can integrate directly through the API.

Recommended endpoints:

- `GET /health`
- `GET /api/market/snapshot`
- `GET /api/vault/state`
- `GET /api/agent/decision`
- `POST /api/rebalance/execute`
- `GET /api/agent/history`
- `POST /api/skill/lumora`

The unified Skill endpoint supports:

- request-scoped `target.deploymentsFile`
- request-scoped `target.profileId`
- request-scoped `target.addresses`
- execution strategy selection via `env-signer / request-signer / delegated`

This gives the DEX a clear layering model:

- contracts handle assets and execution
- backend services handle logic and orchestration
- the API handles external exposure
- the future frontend is just a presentation shell

---

## 12. System Architecture

### 12.1 System Components

#### Onchain Components
- Vault contract (LP deposits)
- Manager contract (position management)

#### Backend Service Components
- X Layer Onchain OS market data reader
- Liquidity position state reader
- AI decision module
- execution module

#### Agent Skills / Tooling
- X Layer Onchain OS / Market MCP Skills
- `lumora` unified skill
- local execution tools

#### API Layer
- externally exposed query and execution interfaces

### 12.2 Data Flow

1. the user's own agent or an API request triggers the system
2. `lumora` resolves the vault target from `target.profileId`, `target.deploymentsFile`, or `target.addresses`
3. the Skill reads X Layer Onchain OS market data and liquidity position state
4. the Skill calls the rule module for decision-making
5. if execution is needed, it either calls the Manager directly or returns delegated transaction data
6. the system writes namespaced history for that target and returns the result

---

## 13. MVP Feature Checklist

### Required
- Vault deposit / withdrawal
- Manager rebalance execution
- X Layer Onchain OS / Market MCP price reading
- current position state reading
- AI agent decision output
- rebalance execution or delegated execution payload generation
- human-readable decision reasons
- basic history isolated by vault target / profile
- support for external agents managing liquidity via the Skill

### Recommended
- gas estimation
- slippage estimation
- dry-run mode
- minimum rebalance interval
- pause switch
- event logging

### Can Come Later
- more advanced predictive models
- multi-pool support
- multi-vault support
- automation scheduler
- visual dashboard
- multi-risk strategy tiers

---

## 14. Security and Control Principles

Even as an MVP, the DEX cannot be designed as a total black box.

At a minimum it should provide:

- only authorized executors can call rebalance
- emergency pause capability
- minimum rebalance interval control
- protection against excessive range shifts
- event logging for each rebalance
- dry-run before execution
- support for `request-signer` and `delegated` so users maintain control

Why this matters:

One of the biggest risks in DeFi automation is not lack of automation, but automation that is too aggressive.

Lumora aims to represent:

> controllable intelligence, not uncontrolled automation

---

## 15. Product Advantages

### 15.1 Clear Demo Flow

Lumora is very demo-friendly because the flow is immediately understandable:

- market price changes
- the AI agent reads the price from X Layer Onchain OS
- the agent makes a decision
- the Manager rebalances the liquidity position
- the API returns the result

This is easy for judges, PMs, and developers to follow.

### 15.2 A Natural Combination of AI and DeFi

AI is not forced into the product here. It is applied to a real problem:

- liquidity range selection
- rebalance timing
- execution cost awareness

That gives the story more credibility than a generic "AI + Web3" narrative.

### 15.3 Expandable Architecture

The overall architecture is modular:

- data sources can be replaced
- strategies can be upgraded
- contracts can evolve
- APIs can expand
- frontends can be plugged in later

---

## 16. Product Risks

### 16.1 The Strategy May Not Beat Simpler Rules

The biggest risk is not integration difficulty. It is:

> the current AI strategy may not actually outperform simpler rule-based baselines

Mitigation:

- start from simple, explainable rules
- compare against baselines later
- do not overclaim "AI alpha"

### 16.2 Over-Rebalancing

If the agent is too aggressive, frequent rebalancing may destroy value through gas and slippage.

Mitigation:

- add cooldown windows
- add minimum profit thresholds
- allow human confirmation in the MVP

### 16.3 Data Source Instability

External market data can be delayed, malformed, or temporarily unavailable.

Mitigation:

- check timestamps
- use stale-data detection
- add fallback logic

### 16.4 Lack of User Trust in AI

The phrase "AI will rebalance for me" naturally causes caution.

Mitigation:

- provide reasons
- provide history
- keep a manual trigger mode
- maintain API transparency

---

## 17. MVP Success Criteria

If the MVP can do the following, it is already a successful DEX prototype:

### Functional Success
- users can deposit into Lumora liquidity vaults
- the current LP position can be read
- market prices can be retrieved from X Layer Onchain OS
- AI agents can output HOLD / REBALANCE decisions
- the Manager can execute a rebalance based on that decision
- the API can return state, results, and reasons

### Product Success
- a product manager can understand the full flow
- a frontend team can integrate using only the API
- judges can clearly see the loop from AI to execution
- the system looks like a real DEX rather than disconnected scripts

---

## 18. Roadmap

### Phase 1: MVP
- Vault + Manager (DEX core)
- X Layer Onchain OS market data reading
- `lumora` Skill
- API output
- manual, controlled, or delegated rebalance execution
- support for users bringing their own agents to manage liquidity

### Phase 2: Demo Strengthening
- clearer explanation layer
- decision history
- better logs and metrics
- stronger contract protections

### Phase 3: Strategy Upgrade
- richer market features
- better range recommendations
- backtesting framework
- higher-quality cost-benefit judgment

### Phase 4: Productization
- frontend console
- automation mode switch
- multi-pool support
- multi-vault support
- user-defined risk preferences
- full performance analytics
- external agent ecosystem integrations

---

## 19. Conclusion

Lumora is an **AI-native concentrated liquidity DEX** built on **X Layer Onchain OS**.

Its value is not a vague claim that "AI makes money." Its value is:

- providing a concentrated liquidity DEX
- integrating X Layer Onchain OS for reliable market data
- enabling AI agents to manage liquidity positions
- outputting explainable rebalance decisions
- executing through smart contracts or generating delegated transactions
- exposing the full capability through API + Skill

The meaning of the MVP is to prove:

> an AI-native DEX where liquidity providers can delegate position management to intelligent agents is not just a concept—it's real, working infrastructure

If that loop works, Lumora becomes the foundation for the next generation of intelligent DeFi protocols.

---

## Appendix A: One-Sentence Version

Lumora is a concentrated liquidity DEX where AI agents use X Layer Onchain OS market data to automatically optimize LP positions.

---

## Appendix B: Simplest Demo Flow

1. the user provides liquidity to Lumora DEX
2. the user's AI agent installs the `lumora` Skill
3. the Skill reads prices from X Layer Onchain OS / Market MCP
4. the Skill combines liquidity position state and the rule module to decide whether the current range is still appropriate
5. the Skill outputs HOLD or REBALANCE
6. the Manager contract executes the rebalance, or the system returns a delegated execution payload
7. the API / Skill returns results and reasons

---

## Appendix C: Suggested Module Names

- `lumora` (public skill)
- `okx-market-reader`
- `vault-state-reader`
- `rebalance-decider`
- `rebalance-executor`
- `Vault.sol`
- `Manager.sol`
- `marketSnapshotService`
- `vaultStateService`
- `decideRebalance`
- `executionService`
