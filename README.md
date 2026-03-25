# Lumora

> Next-Generation DEX with AI-Powered Liquidity Management, powered by X Layer Onchain OS

## Overview

Lumora is a concentrated liquidity DEX protocol that integrates AI-driven liquidity management at its core. By leveraging **X Layer Onchain OS Market Data**, Lumora enables autonomous agents to optimize liquidity positions in real-time, bringing intelligent automation directly into the DEX layer.

### The Problem

Traditional concentrated liquidity DEXs offer higher capital efficiency but create a management burden for liquidity providers:
- Positions falling out of range reduce fee earnings
- Manual monitoring and rebalancing is time-consuming
- Most LPs lack the expertise to optimize positions
- High gas costs make frequent rebalancing uneconomical

### The Solution

Lumora is a **DEX protocol with native AI liquidity management**, combining:

- **Concentrated Liquidity DEX**: Efficient capital deployment with customizable price ranges
- **X Layer Onchain OS Integration**: Real-time market intelligence for informed decision-making
- **AI Agent Layer**: Autonomous agents that optimize LP positions based on market conditions
- **Flexible Execution**: Multiple execution modes for security and control
- **Agent Ecosystem**: External agents can integrate via the Lumora skill

## Key Features

### 🔗 X Layer Onchain OS Integration

Lumora leverages **X Layer Onchain OS** as its market intelligence foundation:

- Real-time index prices and historical data
- EMA (Exponential Moving Average) calculations
- Volatility metrics and trend analysis
- High-quality market signals for AI decision-making

### 🤖 AI-Native DEX Architecture

The `lumora` skill provides a unified interface for AI agents to manage liquidity:

1. **Monitor**: Read real-time market snapshots and position state
2. **Decide**: Generate rebalance decisions based on market conditions
3. **Preview**: Simulate rebalance operations before execution
4. **Execute**: Perform rebalances with configurable execution policies

### 🏦 Smart Liquidity Management

- **Vault.sol**: LP deposit and share accounting
- **Manager.sol**: Concentrated liquidity position management and rebalancing
- **Multi-vault Support**: Manage multiple liquidity pools with isolated profiles
- **Execution History**: Track all decisions and rebalances for transparency

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     External AI Agent                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Lumora Skill API                          │
│                 POST /api/skill/lumora                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ X Layer      │   │ Liquidity    │   │  Rebalance   │
│ Onchain OS   │   │ Pool State   │   │   Executor   │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                    ┌──────────────┐
                    │   AI Decision│
                    │    Engine    │
                    └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Lumora DEX  │
                    │   Protocol   │
                    └──────────────┘
```

## Project Structure

```text
hackathon/
├── infra/api/             # REST API and skill endpoint
├── packages/
│   ├── contracts/         # Vault.sol, Manager.sol (DEX core)
│   └── sdk/              # Market integration, AI decision logic
├── skills/lumora/         # Installable agent skill package
├── WHITEPAPER.md         # Product whitepaper
```

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
# Network
XLAYER_MAINNET_RPC_URL=https://rpc.xlayer.tech
WALLET_PRIVATE_KEY=<your-private-key>

# X Layer Onchain OS
OKX_API_KEY=<your-okx-api-key>
OKX_MARKET_MCP_URL=<okx-market-mcp-endpoint>
```

### Build and Deploy

```bash
# Build all packages
npm run build

# Compile DEX contracts
npm run contracts:compile

# Deploy Lumora DEX to X Layer mainnet
npm run deploy

# Initialize liquidity pool
npm run seed:pool
npm run seed:vault

# Start API server
npm run api:dev
```

## API Endpoints

### Core Operations

- `GET /health` - Health check
- `GET /api/market/snapshot` - Get current market data from X Layer Onchain OS
- `GET /api/vault/state` - Read vault and liquidity position state
- `GET /api/agent/decision` - Get AI rebalance decision
- `POST /api/rebalance/execute` - Execute rebalance operation
- `GET /api/agent/history` - View decision and execution history

### Unified Skill Endpoint

- `POST /api/skill/lumora` - Unified agent skill interface

**Supported Operations:**
- `market_snapshot` - Fetch X Layer Onchain OS market data
- `decision` - Generate rebalance decision
- `preview_rebalance` - Simulate rebalance
- `execute_rebalance` - Execute rebalance

## Use Cases

### For Liquidity Providers

- Provide liquidity to Lumora DEX
- Let AI agents optimize your positions automatically
- Benefit from X Layer Onchain OS market intelligence
- Maintain control with flexible execution modes

### For AI Agents

External agents can integrate with Lumora to manage liquidity:

```json
{
  "operation": "decision",
  "pair": "WETH-STK",
  "target": {
    "profileId": "user-vault-profile"
  },
  "auth": {
    "policy": "delegated",
    "executorAddress": "0x..."
  }
}
```

### Execution Modes

- **env-signer**: Use server-side signer (development)
- **request-signer**: Agent provides signing key per request
- **delegated**: Return unsigned transaction for external signing (self-custody)

## Why X Layer Onchain OS?

Lumora integrates **X Layer Onchain OS** as its market data foundation because:

1. **Reliable Data**: High-quality, real-time market data from a trusted exchange
2. **Rich Metrics**: Beyond price - includes volatility, trends, and technical indicators
3. **MCP Integration**: Seamless integration through Model Context Protocol
4. **Onchain Focus**: Purpose-built for onchain DeFi applications

This integration enables Lumora's AI agents to make informed decisions based on comprehensive market intelligence, creating a truly intelligent DEX experience.

## Documentation

- [WHITEPAPER.md](WHITEPAPER.md) - Detailed product whitepaper
- [skills/lumora/SKILL.md](skills/lumora/SKILL.md) - Skill integration guide

## Hackathon Highlights

### Innovation

- **First AI-native DEX protocol** built on X Layer Onchain OS
- **Concentrated liquidity** with built-in intelligent management
- **Agent-first design** - external agents can manage user liquidity
- **Explainable AI** - every decision includes human-readable reasoning

### Technical Excellence

- Production-ready DEX smart contracts (Vault + Manager)
- Comprehensive SDK with X Layer Onchain OS integration
- RESTful API + unified skill endpoint
- Multi-vault management with isolated profiles

### Real-world Impact

- Reduces LP management complexity for concentrated liquidity
- Improves capital efficiency through AI optimization
- Enables AI-powered DeFi automation at the protocol level
- Demonstrates practical X Layer Onchain OS integration in DEX design

---

**Built for OKX Hackathon** | Powered by X Layer Onchain OS | Next-Gen AI-Native DEX
