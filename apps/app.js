const deployment = {
  profileId: "xlayer-mainnet-demo",
  owner: "0x9bDC39182287433881ACfC560627502f5A40499a",
  chain: {
    name: "xLayer Mainnet",
    chainId: 196,
    rpcUrl: "https://rpc.xlayer.tech"
  },
  addresses: {
    weth9: "0x1218462bc262022ce9d5E01F98aD7B30c7610a97",
    stk: "0x4c7f9cA5D59E4A14c43E0e7D75feBE72188c3d0F",
    factory: "0x1255A20517896089F021D2850b6F9a4c42Ee5cE4",
    swapRouter: "0x583C75ed4f68Fe9C4432BbEefc045EEE9cAAcc9d",
    positionManager: "0x74A0EF7215EBeEc325ACecf6dB432053930e2E78",
    quoterV2: "0x9b070b87f63841fe909D6D541653B4735015b8f6",
    pool: "0x7E2819583d2B33E7e5eeC8Ab1F91c75a865D165A",
    demoVault: "0x255Be80F7d7795f092e556d34F03917fc4FA3a58",
    demoManager: "0xb8B626338081670B8aF6897515ef249524c07B3b",
    userVault: "0xEff2d0bd0C62Dec93D54A2206EEF6864a14681E9",
    userManager: "0x7bFcEe18a53ac3C694A07581364B4eF04e94CA32",
    token: "0x2381461d501e8951939113768C8D71e1B3cABE43",
    lumoraUsdt: "0x3A9E822239F057fB31789D237B21A66F14d3850a"
  }
};

const marketPlayback = {
  standby: {
    label: "Pool fallback warmup",
    pair: "WETH-STK",
    source: "lumora-market-feed",
    price: 1999.84,
    emaShort: 1999.62,
    emaLong: 1998.91,
    volatility: 0.004,
    returns1h: 0.002,
    history: [1996.2, 1997.1, 1998.3, 1999.2, 1998.8, 1999.1, 1999.7, 2000.2, 1999.9, 2000.4, 2000.1, 1999.84]
  },
  loaded: {
    label: "Volatility pickup detected",
    pair: "WETH-STK",
    source: "lumora-market-feed",
    price: 2011.34,
    emaShort: 2006.41,
    emaLong: 2001.12,
    volatility: 0.016,
    returns1h: 0.011,
    history: [1997.4, 1999.5, 2000.1, 2002.6, 2004.3, 2006.9, 2008.2, 2007.4, 2010.6, 2012.2, 2014.5, 2011.34]
  },
  decision: {
    label: "Boundary pressure regime",
    pair: "WETH-STK",
    source: "lumora-market-feed",
    price: 2018.66,
    emaShort: 2012.18,
    emaLong: 2003.47,
    volatility: 0.024,
    returns1h: 0.016,
    history: [1998.6, 2001.2, 2003.1, 2006.8, 2009.4, 2011.5, 2010.7, 2014.8, 2017.6, 2021.4, 2019.3, 2018.66]
  }
};

const vaultState = {
  vaultAddress: deployment.addresses.userVault,
  managerAddress: deployment.addresses.userManager,
  poolAddress: deployment.addresses.pool,
  tvlUsd: 39.98,
  accountedBalances: {
    weth: "0.0100",
    stk: "20.0000"
  },
  idleBalances: {
    weth: "0.0009",
    stk: "0.0000"
  },
  position: {
    tokenId: "1",
    tickLower: -200940,
    tickUpper: -199740,
    currentTick: -200118,
    inRange: true,
    liquidity: "14449873569309"
  },
  lastRebalanceAt: "2026-03-25T14:11:57Z"
};

const agentDecision = {
  action: "REBALANCE_WIDER",
  targetRange: {
    tickLower: -201060,
    tickUpper: -199620
  },
  confidence: 0.84,
  reason: [
    "Price is moving toward the upper half of the active range.",
    "Volatility accelerated versus the earlier pool fallback snapshot.",
    "A wider range reduces churn while preserving active liquidity."
  ],
  shouldExecute: true
};

const executionPreview = {
  gasEstimate: "702744",
  gasUsd: 0.48,
  slippageBps: 120,
  mode: "onchain-preview",
  txHash: "0x8e33f0bb0ab3b4e1fb4896405163df458f6d2425ee76b33e87424011b682d22e"
};

const delegatedPayload = {
  chainId: deployment.chain.chainId,
  from: deployment.owner,
  to: deployment.addresses.userManager,
  data: "0xa929c971fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffcf040fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffcf4f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000069c3f2b0",
  value: "0"
};

const apiViewOrder = ["bind", "vault", "market", "decision", "preview", "delegated", "history"];

const steps = [
  {
    id: "bind",
    title: "Bind xLayer Vault",
    description: "Register the user manifest as a profile and resolve the vault target.",
    apiView: "bind",
    highlight: ["vault-card"],
    run() {
      state.bound = true;
      setStatus("vault-status", "Bound", "success");
      text("profile-id", deployment.profileId);
      code("user-vault-address", deployment.addresses.userVault);
      code("user-manager-address", deployment.addresses.userManager);
      code("pool-address", deployment.addresses.pool);
      text("position-state", "Profile bound | analysis pending");
      upsertEvent("bind", {
        label: "Step 1",
        title: "Vault profile bound",
        body: "The demo resolves xlayer-mainnet-demo to the user manifest and keeps the runtime target-aware."
      });
      state.selectedApi = "bind";
    }
  },
  {
    id: "skill",
    title: "Install Agent Skill",
    description: "Activate univ3-vault-agent and expose the market, state, and execution surfaces.",
    apiView: "bind",
    highlight: ["skill-card"],
    run() {
      state.skillInstalled = true;
      setStatus("skill-status", "Active", "success");
      renderSkillTags(true);
      upsertEvent("skill", {
        label: "Step 2",
        title: "Skill activated",
        body: "The orchestration layer exposes market_snapshot, vault_state, decision, preview, execute, and history operations."
      });
      state.selectedApi = "bind";
    }
  },
  {
    id: "market",
    title: "Load Market Snapshot",
    description: "Load the market sequence so the front-end can show the full whitepaper flow.",
    apiView: "market",
    highlight: ["market-card"],
    run() {
      state.marketStage = "loaded";
      setStatus("market-status", "Live Feed", "live");
      renderMarket(marketPlayback.loaded);
      upsertEvent("market", {
        label: "Step 3",
        title: "Market snapshot refreshed",
        body: "A volatility pickup sequence is loaded to demonstrate the agent loop with a stable recording flow."
      });
      state.selectedApi = "market";
    }
  },
  {
    id: "analysis",
    title: "Analyze Position",
    description: "Read vault balances, active range, current tick, and determine whether the vault is still healthy.",
    apiView: "vault",
    highlight: ["vault-card", "decision-card"],
    run() {
      state.positionAnalyzed = true;
      text("position-state", `In range | tick ${vaultState.position.currentTick} | token #${vaultState.position.tokenId}`);
      upsertEvent("analysis", {
        label: "Step 4",
        title: "Vault state analyzed",
        body: `Pool ${shortAddress(vaultState.poolAddress)} remains active, but price is drifting toward the upper half of the range.`
      });
      state.selectedApi = "vault";
    }
  },
  {
    id: "decision",
    title: "Produce Decision",
    description: "Convert market and vault context into a structured HOLD or REBALANCE output with reasons.",
    apiView: "decision",
    highlight: ["decision-card", "market-card"],
    run() {
      state.marketStage = "decision";
      state.decisionReady = true;
      renderMarket(marketPlayback.decision);
      setStatus("decision-status", "REBALANCE WIDER", "alert");
      text("decision-action", agentDecision.action);
      text(
        "decision-range",
        `${agentDecision.targetRange.tickLower} to ${agentDecision.targetRange.tickUpper}`
      );
      text("decision-confidence", `${Math.round(agentDecision.confidence * 100)}%`);
      renderReasons(agentDecision.reason);
      upsertEvent("decision", {
        label: "Step 5",
        title: "Decision emitted",
        body: "The agent recommends REBALANCE_WIDER and returns a new range with human-readable reasons."
      });
      state.selectedApi = "decision";
    }
  },
  {
    id: "preview",
    title: "Preview + Simulate Execute",
    description: "Show gas, slippage, and a direct execute result so the recording includes the execution branch.",
    apiView: "preview",
    highlight: ["execution-card"],
    run() {
      state.previewReady = true;
      setStatus("execution-status", "Preview Ready", "success");
      text("preview-gas", executionPreview.gasEstimate);
      text("preview-gas-usd", `$${executionPreview.gasUsd.toFixed(2)}`);
      text("preview-slippage", `${executionPreview.slippageBps} bps`);
      text("execution-mode", "Onchain preview");
      text(
        "payload-viewer",
        [
          "EXECUTION PREVIEW",
          "",
          `txHash: ${executionPreview.txHash}`,
          `targetRange: ${agentDecision.targetRange.tickLower} -> ${agentDecision.targetRange.tickUpper}`,
          `gasEstimate: ${executionPreview.gasEstimate}`,
          `gasUsd: ${executionPreview.gasUsd.toFixed(2)}`,
          `slippageBps: ${executionPreview.slippageBps}`
        ].join("\n")
      );
      upsertEvent("preview", {
        label: "Step 6",
        title: "Direct execution previewed",
        body: "Gas and slippage are surfaced, and the execution preview hash is shown for recording clarity."
      });
      state.selectedApi = "preview";
    }
  },
  {
    id: "delegated",
    title: "Delegated Payload + History",
    description: "Reveal the delegated payload and the final API history so the whole whitepaper loop is visible.",
    apiView: "delegated",
    highlight: ["execution-card", "history-card", "api-console"],
    run() {
      state.delegatedReady = true;
      setStatus("execution-status", "Delegated Ready", "live");
      setStatus("history-status", "Visible", "success");
      text("execution-mode", "Delegated payload");
      text("payload-viewer", JSON.stringify(delegatedPayload, null, 2));
      upsertEvent("delegated", {
        label: "Step 7",
        title: "Delegated payload returned",
        body: "The flow ends with a signable payload plus a history surface that mirrors the API-first product shape."
      });
      state.selectedApi = "history";
    }
  }
];

const addressInventory = [
  ["WETH9", deployment.addresses.weth9],
  ["STK", deployment.addresses.stk],
  ["UniswapV3Factory", deployment.addresses.factory],
  ["SwapRouter", deployment.addresses.swapRouter],
  ["NonfungiblePositionManager", deployment.addresses.positionManager],
  ["QuoterV2", deployment.addresses.quoterV2],
  ["WETH-STK Pool", deployment.addresses.pool],
  ["Demo Vault", deployment.addresses.demoVault],
  ["Demo Manager", deployment.addresses.demoManager],
  ["User Vault", deployment.addresses.userVault],
  ["User Manager", deployment.addresses.userManager],
  ["Token", deployment.addresses.token],
  ["Lumora USDT", deployment.addresses.lumoraUsdt]
];

const state = {
  drawerOpen: false,
  selectedApi: "bind",
  currentStep: -1,
  marketStage: "standby",
  bound: false,
  skillInstalled: false,
  positionAnalyzed: false,
  decisionReady: false,
  previewReady: false,
  delegatedReady: false,
  events: []
};

function init() {
  renderAddressList();
  renderSkillTags(false);
  renderMarket(marketPlayback.standby);
  renderReasons(["Run the flow to surface the decision payload."]);
  renderStepList();
  renderApiTabs();
  renderHistory();
  renderDrawerEvents();
  renderApiConsole();
  bindEvents();
}

function bindEvents() {
  document.getElementById("wallet-toggle").addEventListener("click", () => {
    state.drawerOpen = true;
    toggleDrawer();
    upsertEvent("wallet", {
      label: "Intro",
      title: "Wallet connected",
      body: "Recorder wallet opens the Lumora-style account drawer before the whitepaper flow starts."
    });
    renderHistory();
    renderDrawerEvents();
  });

  document.getElementById("close-drawer").addEventListener("click", () => {
    state.drawerOpen = false;
    toggleDrawer();
  });

  document.getElementById("start-demo").addEventListener("click", () => {
    document.getElementById("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("jump-workspace").addEventListener("click", () => {
    document.getElementById("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("reset-demo").addEventListener("click", resetDemo);
}

function resetDemo() {
  state.currentStep = -1;
  state.drawerOpen = false;
  state.marketStage = "standby";
  state.bound = false;
  state.skillInstalled = false;
  state.positionAnalyzed = false;
  state.decisionReady = false;
  state.previewReady = false;
  state.delegatedReady = false;
  state.selectedApi = "bind";
  state.events = state.events.filter((event) => event.key === "wallet");

  setStatus("vault-status", "Pending", "muted");
  setStatus("skill-status", "Inactive", "muted");
  setStatus("market-status", "Standby", "muted");
  setStatus("decision-status", "HOLD", "muted");
  setStatus("execution-status", "Preview first", "muted");
  setStatus("history-status", "Hidden", "muted");
  text("profile-id", "Waiting for bind");
  code("user-vault-address", "-");
  code("user-manager-address", "-");
  code("pool-address", "-");
  text("position-state", "Awaiting analysis");
  text("decision-action", "Waiting");
  text("decision-range", "-");
  text("decision-confidence", "-");
  text("preview-gas", "-");
  text("preview-gas-usd", "-");
  text("preview-slippage", "-");
  text("execution-mode", "-");
  text("payload-viewer", "Delegated payload will appear here.");
  renderSkillTags(false);
  renderMarket(marketPlayback.standby);
  renderReasons(["Run the flow to surface the decision payload."]);
  highlightCards([]);
  toggleDrawer();
  renderStepList();
  renderHistory();
  renderDrawerEvents();
  renderApiConsole();
}

function renderStepList() {
  const root = document.getElementById("step-list");
  root.innerHTML = "";

  steps.forEach((step, index) => {
    const item = document.createElement("div");
    item.className = "step-item";
    if (index === state.currentStep) {
      item.classList.add("active");
    }
    if (index <= state.currentStep) {
      item.classList.add("completed");
    }

    const meta = document.createElement("div");
    meta.className = "step-meta";
    meta.innerHTML = `<span class="step-index">0${index + 1}</span><span class="status-pill ${index <= state.currentStep ? "success" : "muted"}">${index <= state.currentStep ? "Done" : "Ready"}</span>`;

    const title = document.createElement("h4");
    title.textContent = step.title;

    const description = document.createElement("p");
    description.textContent = step.description;

    const button = document.createElement("button");
    button.className = "step-action";
    button.textContent = index <= state.currentStep ? "Replay" : "Run";
    button.disabled = index > state.currentStep + 1;
    button.addEventListener("click", () => runStep(index));

    item.append(meta, title, description, button);
    root.append(item);
  });
}

function runStep(index) {
  const step = steps[index];
  if (!step || index > state.currentStep + 1) {
    return;
  }

  step.run();
  state.currentStep = Math.max(state.currentStep, index);
  highlightCards(step.highlight);
  renderStepList();
  renderHistory();
  renderDrawerEvents();
  renderApiConsole();
}

function renderSkillTags(active) {
  const tags = [
    "market_snapshot",
    "vault_state",
    "decision",
    "preview_rebalance",
    "execute_rebalance",
    "history"
  ];
  const root = document.getElementById("skill-tags");
  root.innerHTML = tags
    .map((tag) => `<span class="tag" style="border-color:${active ? "rgba(61,220,151,0.32)" : "rgba(255,255,255,0.1)"};color:${active ? "#f5f1e8" : "rgba(245,241,232,0.62)"};">${tag}</span>`)
    .join("");
}

function renderMarket(snapshot) {
  const metrics = [
    ["Source", snapshot.source],
    ["Price", `$${snapshot.price.toFixed(2)}`],
    ["EMA Short", `$${snapshot.emaShort.toFixed(2)}`],
    ["EMA Long", `$${snapshot.emaLong.toFixed(2)}`],
    ["Volatility", `${(snapshot.volatility * 100).toFixed(2)}%`],
    ["Returns 1H", `${(snapshot.returns1h * 100).toFixed(2)}%`]
  ];

  document.getElementById("market-metrics").innerHTML = metrics
    .map(([label, value]) => `<div class="market-metric"><span class="info-label">${label}</span><strong>${value}</strong></div>`)
    .join("");

  renderChart(snapshot.history);
}

function renderChart(series) {
  const svg = document.getElementById("market-chart");
  const width = 320;
  const height = 160;
  const padding = 14;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = Math.max(max - min, 1);

  const points = series.map((value, index) => {
    const x = padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const pathData = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaData = `${pathData} L ${points[points.length - 1].x.toFixed(2)} ${(height - padding).toFixed(2)} L ${points[0].x.toFixed(2)} ${(height - padding).toFixed(2)} Z`;
  const lastPoint = points[points.length - 1];

  svg.innerHTML = `
    <defs>
      <linearGradient id="market-gradient" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="rgba(255,138,61,0.95)"></stop>
        <stop offset="100%" stop-color="rgba(25,212,255,0.95)"></stop>
      </linearGradient>
      <linearGradient id="market-area-gradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(25,212,255,0.32)"></stop>
        <stop offset="100%" stop-color="rgba(25,212,255,0.02)"></stop>
      </linearGradient>
    </defs>
    <path class="market-grid-line" d="M 14 40 H 306"></path>
    <path class="market-grid-line" d="M 14 80 H 306"></path>
    <path class="market-grid-line" d="M 14 120 H 306"></path>
    <path class="market-area" d="${areaData}"></path>
    <path class="market-line" d="${pathData}"></path>
    <circle class="market-point" cx="${lastPoint.x.toFixed(2)}" cy="${lastPoint.y.toFixed(2)}" r="6"></circle>
  `;
}

function renderReasons(reasons) {
  document.getElementById("decision-reasons").innerHTML = reasons.map((reason) => `<li>${reason}</li>`).join("");
}

function renderApiTabs() {
  const labels = {
    bind: "Bind",
    vault: "Vault",
    market: "Market",
    decision: "Decision",
    preview: "Preview",
    delegated: "Delegated",
    history: "History"
  };

  document.getElementById("api-tabs").innerHTML = apiViewOrder
    .map((key) => `<button class="api-tab ${state.selectedApi === key ? "active" : ""}" data-api="${key}">${labels[key]}</button>`)
    .join("");

  document.querySelectorAll(".api-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedApi = button.dataset.api;
      renderApiTabs();
      renderApiConsole();
    });
  });
}

function renderApiConsole() {
  renderApiTabs();
  const view = buildApiViews()[state.selectedApi];
  document.getElementById("api-endpoint").textContent = `${view.method} ${view.endpoint}`;
  document.getElementById("api-mode").textContent = view.mode;
  document.getElementById("api-response").textContent = JSON.stringify(view.payload, null, 2);
}

function renderAddressList() {
  document.getElementById("address-list").innerHTML = addressInventory
    .map(([label, address]) => `<div class="address-item"><span class="address-name">${label}</span><code>${address}</code></div>`)
    .join("");
}

function renderHistory() {
  document.getElementById("history-timeline").innerHTML = state.events.length === 0
    ? `<div class="timeline-item"><small>Waiting</small><strong>No events yet</strong><p>Open the wallet drawer or start the step sequence.</p></div>`
    : state.events
        .map((event) => `<div class="timeline-item"><small>${event.label}</small><strong>${event.title}</strong><p>${event.body}</p></div>`)
        .join("");
}

function renderDrawerEvents() {
  const recentEvents = state.events.slice(-5).reverse();
  document.getElementById("drawer-events").innerHTML = recentEvents.length === 0
    ? `<div class="drawer-event"><strong>Ready</strong><p>Connect the wallet or start the demo.</p></div>`
    : recentEvents
        .map((event) => `<div class="drawer-event"><strong>${event.title}</strong><p>${event.body}</p></div>`)
        .join("");
}

function buildApiViews() {
  return {
    bind: {
      method: "POST",
      endpoint: "/api/vault/profiles/bind",
      mode: "real addresses + recording flow",
      payload: {
        request: {
          profileId: deployment.profileId,
          target: {
            deploymentsFile: "deployments/xlayer-mainnet-user.json"
          }
        },
        response: {
          ok: true,
          profile: {
            profileId: deployment.profileId,
            namespace: `profile-${deployment.profileId}`,
            target: {
              deploymentsFile: "deployments/xlayer-mainnet-user.json"
            },
            manifestSummary: {
              network: deployment.chain,
              addresses: {
                vault: deployment.addresses.userVault,
                manager: deployment.addresses.userManager,
                token0: deployment.addresses.weth9,
                token1: deployment.addresses.stk,
                weth9: deployment.addresses.weth9
              }
            }
          }
        }
      }
    },
    vault: {
      method: "GET",
      endpoint: `/api/vault/state?profileId=${deployment.profileId}`,
      mode: "vault surface",
      payload: {
        vaultAddress: vaultState.vaultAddress,
        managerAddress: vaultState.managerAddress,
        poolAddress: vaultState.poolAddress,
        tvlUsd: vaultState.tvlUsd,
        accountedBalances: vaultState.accountedBalances,
        idleBalances: vaultState.idleBalances,
        position: vaultState.position,
        lastRebalanceAt: vaultState.lastRebalanceAt
      }
    },
    market: {
      method: "GET",
      endpoint: "/api/market/snapshot?pair=WETH-STK",
      mode: "market feed",
      payload: marketPlayback[state.marketStage]
    },
    decision: {
      method: "GET",
      endpoint: `/api/agent/decision?profileId=${deployment.profileId}`,
      mode: "decision output",
      payload: {
        ...agentDecision,
        marketSource: marketPlayback.decision.source,
        pair: marketPlayback.decision.pair
      }
    },
    preview: {
      method: "POST",
      endpoint: "/api/rebalance/execute",
      mode: "execution preview",
      payload: {
        request: {
          mode: "agent",
          dryRun: true,
          target: {
            profileId: deployment.profileId
          }
        },
        response: {
          success: true,
          dryRun: true,
          reason: agentDecision.reason,
          executionPreview,
          txHash: executionPreview.txHash
        }
      }
    },
    delegated: {
      method: "POST",
      endpoint: "/api/rebalance/execute",
      mode: "delegated payload",
      payload: {
        request: {
          mode: "manual",
          dryRun: false,
          tickLower: agentDecision.targetRange.tickLower,
          tickUpper: agentDecision.targetRange.tickUpper,
          target: {
            profileId: deployment.profileId
          },
          auth: {
            policy: "delegated",
            executorAddress: deployment.owner
          }
        },
        response: {
          success: true,
          executionMode: "delegated",
          submitted: false,
          delegatedTransaction: delegatedPayload
        }
      }
    },
    history: {
      method: "POST",
      endpoint: "/api/skill/univ3-vault-agent",
      mode: "whitepaper timeline",
      payload: {
        operation: "history",
        target: {
          profileId: deployment.profileId
        },
        items: state.events.map((event, index) => ({
          id: index + 1,
          label: event.label,
          title: event.title,
          body: event.body
        }))
      }
    }
  };
}

function upsertEvent(key, event) {
  const existingIndex = state.events.findIndex((entry) => entry.key === key);
  const nextEvent = { ...event, key };

  if (existingIndex >= 0) {
    state.events[existingIndex] = nextEvent;
    return;
  }

  state.events.push(nextEvent);
}

function setStatus(id, label, variant) {
  const element = document.getElementById(id);
  element.textContent = label;
  element.className = `status-pill ${variant}`;
}

function toggleDrawer() {
  document.getElementById("account-drawer").classList.toggle("open", state.drawerOpen);
}

function highlightCards(ids) {
  document.querySelectorAll(".board-card").forEach((card) => card.classList.remove("card-glow"));
  ids.forEach((id) => document.getElementById(id)?.classList.add("card-glow"));
}

function text(id, value) {
  document.getElementById(id).textContent = value;
}

function code(id, value) {
  document.getElementById(id).textContent = value;
}

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

init();
