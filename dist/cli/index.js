#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/cli/index.ts
var import_commander = require("commander");
var import_chalk8 = __toESM(require("chalk"));

// src/cli/commands/config.ts
var import_inquirer = __toESM(require("inquirer"));
var import_chalk2 = __toESM(require("chalk"));

// src/cli/config.ts
var import_conf = __toESM(require("conf"));
var config = new import_conf.default({
  projectName: "memoreum",
  defaults: {
    config: {
      baseUrl: "https://api.memoreum.app",
      network: "mainnet"
    },
    agents: [],
    currentAgent: null,
    aiProviders: {}
  }
});
function getConfig() {
  return config.get("config");
}
function setConfig(updates) {
  const current = getConfig();
  config.set("config", { ...current, ...updates });
}
function setApiKey(apiKey) {
  setConfig({ apiKey });
}
function setBaseUrl(url) {
  setConfig({ baseUrl: url });
}
function setNetwork(network) {
  setConfig({ network });
}
function getAgents() {
  return config.get("agents");
}
function addAgent(agent) {
  const agents = getAgents();
  agents.push(agent);
  config.set("agents", agents);
}
function removeAgent(agentId) {
  const agents = getAgents().filter((a) => a.id !== agentId);
  config.set("agents", agents);
}
function getCurrentAgentId() {
  return config.get("currentAgent");
}
function setCurrentAgent(agentId) {
  config.set("currentAgent", agentId);
}
function getCurrentAgent() {
  const currentId = getCurrentAgentId();
  if (!currentId) return null;
  return getAgents().find((a) => a.id === currentId) || null;
}
function getAIProviders() {
  return config.get("aiProviders");
}
function setAIProvider(name, providerConfig) {
  const providers = getAIProviders();
  providers[name] = providerConfig;
  config.set("aiProviders", providers);
}
function removeAIProvider(name) {
  const providers = getAIProviders();
  delete providers[name];
  config.set("aiProviders", providers);
}
function getDefaultAIProvider() {
  const providers = getAIProviders();
  return providers["default"] || Object.values(providers)[0];
}
function setDefaultAIProvider(providerConfig) {
  setAIProvider("default", providerConfig);
}
function clearConfig() {
  config.clear();
}

// src/cli/utils.ts
var import_chalk = __toESM(require("chalk"));
var import_ora = __toESM(require("ora"));
var import_boxen = __toESM(require("boxen"));
var import_table = require("table");

// src/sdk/MemoreumClient.ts
var import_ethers = require("ethers");
var DEFAULT_BASE_URL = "https://api.memoreum.app";
var TESTNET_BASE_URL = "https://testnet-api.memoreum.app";
var MemoreumClient = class {
  apiKey;
  baseUrl;
  network;
  provider = null;
  wallet = null;
  _agentData = null;
  constructor(config2) {
    this.apiKey = config2.apiKey;
    this.network = config2.network || "mainnet";
    this.baseUrl = config2.baseUrl || (this.network === "testnet" ? TESTNET_BASE_URL : DEFAULT_BASE_URL);
  }
  // ============================================
  // HTTP Methods
  // ============================================
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      ...options.headers || {}
    };
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }
      return {
        success: true,
        data: data.data || data
      };
    } catch (error2) {
      return {
        success: false,
        error: error2 instanceof Error ? error2.message : "Unknown error occurred"
      };
    }
  }
  async get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }
  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
  // ============================================
  // Agent Methods
  // ============================================
  /**
   * Get the current agent's profile
   */
  async getAgent() {
    const response = await this.get("/api/v1/auth/me");
    if (response.success && response.data) {
      this._agentData = response.data;
    }
    return response;
  }
  /**
   * Get cached agent data (call getAgent() first)
   */
  getCachedAgent() {
    return this._agentData;
  }
  /**
   * Register a new agent (no API key required)
   */
  async registerAgent(name) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: name })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}`
        };
      }
      return {
        success: true,
        data: data.data
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Registration failed"
      };
    }
  }
  /**
   * Get agent statistics
   */
  async getAgentStats() {
    return this.get("/api/v1/analytics/me");
  }
  /**
   * Regenerate API key
   */
  async regenerateApiKey() {
    return this.post("/api/v1/auth/regenerate-key", {});
  }
  // ============================================
  // Memory Methods
  // ============================================
  /**
   * Store a new memory
   */
  async storeMemory(input) {
    return this.post("/api/v1/memories", {
      title: input.title,
      description: input.content,
      categoryId: input.categoryId,
      memoryData: input.memoryData,
      tags: input.tags ?? [],
      isForSale: input.isPublic ?? false,
      priceEth: input.priceEth
    });
  }
  /**
   * Get a memory by ID
   */
  async getMemory(memoryId) {
    return this.get(`/api/v1/memories/${memoryId}`);
  }
  /**
   * List agent's memories
   */
  async listMemories(params) {
    const queryParams = new URLSearchParams();
    if (params?.isPublic !== void 0) queryParams.set("isForSale", String(params.isPublic));
    if (params?.categoryId) queryParams.set("categoryId", String(params.categoryId));
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.offset) queryParams.set("page", String(Math.floor((params.offset || 0) / (params.limit || 20)) + 1));
    const query = queryParams.toString();
    return this.get(`/api/v1/memories${query ? `?${query}` : ""}`);
  }
  /**
   * Search marketplace memories
   */
  async searchMemories(query, limit = 10) {
    const queryParams = new URLSearchParams();
    queryParams.set("q", query);
    queryParams.set("limit", String(limit));
    return this.get(`/api/v1/memories/search/marketplace?${queryParams.toString()}`);
  }
  /**
   * Update a memory
   */
  async updateMemory(memoryId, updates) {
    return this.request(`/api/v1/memories/${memoryId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: updates.title,
        description: updates.content,
        tags: updates.tags,
        isForSale: updates.isPublic,
        priceEth: updates.priceEth
      })
    });
  }
  /**
   * Delete a memory
   */
  async deleteMemory(memoryId) {
    return this.delete(`/api/v1/memories/${memoryId}`);
  }
  /**
   * Get memory template
   */
  async getMemoryTemplate() {
    return this.get("/api/v1/memories/template");
  }
  /**
   * Get memory categories
   */
  async getCategories() {
    return this.get("/api/v1/memories/categories");
  }
  // ============================================
  // Marketplace Methods
  // ============================================
  /**
   * List a memory for sale
   */
  async createListing(input) {
    return this.post("/api/v1/marketplace/listings", {
      memoryId: input.memoryId,
      priceEth: input.priceEth,
      expiresAt: input.expiresAt
    });
  }
  /**
   * Get a listing by ID
   */
  async getListing(listingId) {
    return this.get(`/api/v1/marketplace/listings/${listingId}`);
  }
  /**
   * Browse marketplace listings
   */
  async browseMarketplace(params) {
    const queryParams = new URLSearchParams();
    if (params?.categoryId) queryParams.set("categoryId", String(params.categoryId));
    if (params?.minPrice) queryParams.set("minPrice", params.minPrice);
    if (params?.maxPrice) queryParams.set("maxPrice", params.maxPrice);
    if (params?.sortBy) queryParams.set("sortBy", params.sortBy);
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.offset) queryParams.set("page", String(Math.floor((params.offset || 0) / (params.limit || 20)) + 1));
    const query = queryParams.toString();
    return this.get(`/api/v1/marketplace${query ? `?${query}` : ""}`);
  }
  /**
   * Get my listings
   */
  async getMyListings() {
    return this.get("/api/v1/marketplace/my-listings");
  }
  /**
   * Update a listing
   */
  async updateListing(listingId, updates) {
    return this.request(`/api/v1/marketplace/listings/${listingId}`, {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
  }
  /**
   * Remove a listing (deactivate)
   */
  async removeListing(listingId) {
    return this.request(`/api/v1/marketplace/listings/${listingId}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: false })
    });
  }
  // ============================================
  // Purchase Methods
  // ============================================
  /**
   * Purchase a memory from the marketplace
   */
  async purchaseMemory(input) {
    return this.post(`/api/v1/marketplace/listings/${input.listingId}/purchase`, {});
  }
  /**
   * Get transaction history
   */
  async getTransactionHistory(type = "all") {
    return this.get(`/api/v1/marketplace/transactions?type=${type}`);
  }
  /**
   * Get purchase history
   */
  async getPurchaseHistory() {
    return this.getTransactionHistory("purchases");
  }
  /**
   * Get sales history
   */
  async getSalesHistory() {
    return this.getTransactionHistory("sales");
  }
  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId) {
    return this.get(`/api/v1/marketplace/transactions/${transactionId}`);
  }
  /**
   * Get purchased memories
   */
  async getPurchasedMemories() {
    return this.get("/api/v1/memories/purchased");
  }
  /**
   * Get marketplace info
   */
  async getMarketplaceInfo() {
    return this.get("/api/v1/marketplace/info");
  }
  // ============================================
  // Wallet Methods
  // ============================================
  /**
   * Initialize wallet with private key
   */
  async initializeWallet(privateKey) {
    const rpcUrl = this.network === "mainnet" ? "https://mainnet.base.org" : "https://sepolia.base.org";
    this.provider = new import_ethers.ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new import_ethers.ethers.Wallet(privateKey, this.provider);
  }
  /**
   * Get wallet information
   */
  async getWalletInfo() {
    if (!this.wallet || !this.provider) {
      return { success: false, error: "Wallet not initialized. Call initializeWallet() first." };
    }
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      const network = await this.provider.getNetwork();
      return {
        success: true,
        data: {
          address: this.wallet.address,
          balanceEth: import_ethers.ethers.formatEther(balance),
          balanceWei: balance.toString(),
          network: network.name
        }
      };
    } catch (error2) {
      return {
        success: false,
        error: error2 instanceof Error ? error2.message : "Failed to get wallet info"
      };
    }
  }
  /**
   * Transfer ETH
   */
  async transfer(input) {
    if (!this.wallet) {
      return { success: false, error: "Wallet not initialized. Call initializeWallet() first." };
    }
    try {
      const tx = await this.wallet.sendTransaction({
        to: input.to,
        value: import_ethers.ethers.parseEther(input.amountEth)
      });
      const receipt = await tx.wait();
      return {
        success: true,
        data: {
          txHash: tx.hash,
          from: this.wallet.address,
          to: input.to,
          amountEth: input.amountEth,
          gasUsed: receipt?.gasUsed.toString() || "0"
        }
      };
    } catch (error2) {
      return {
        success: false,
        error: error2 instanceof Error ? error2.message : "Transfer failed"
      };
    }
  }
  /**
   * Get wallet balance from API
   */
  async getBalance() {
    return this.get("/api/v1/auth/wallet/balance");
  }
  /**
   * Get full wallet info from API
   */
  async getWalletFromApi() {
    return this.get("/api/v1/auth/wallet");
  }
  /**
   * Transfer ETH via API
   */
  async transferViaApi(toAddress, amountEth) {
    return this.post("/api/v1/auth/wallet/transfer", { toAddress, amountEth });
  }
  // ============================================
  // Utility Methods
  // ============================================
  /**
   * Generate content hash for a memory
   */
  generateContentHash(content) {
    return import_ethers.ethers.keccak256(import_ethers.ethers.toUtf8Bytes(content));
  }
  /**
   * Verify API key is valid
   */
  async verifyApiKey() {
    const response = await this.getAgent();
    return response.success;
  }
  /**
   * Get the current network
   */
  getNetwork() {
    return this.network;
  }
  /**
   * Get wallet address
   */
  getWalletAddress() {
    return this.wallet?.address || null;
  }
};

// src/cli/utils.ts
var spinner = import_ora.default;
function success(message) {
  console.log(import_chalk.default.green("\u2713"), message);
}
function error(message) {
  console.log(import_chalk.default.red("\u2717"), message);
}
function warn(message) {
  console.log(import_chalk.default.yellow("!"), message);
}
function info(message) {
  console.log(import_chalk.default.blue("i"), message);
}
function heading(text) {
  console.log("\n" + import_chalk.default.bold.cyan(text) + "\n");
}
function printBox(content, title) {
  console.log(
    (0, import_boxen.default)(content, {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
      title,
      titleAlignment: "center"
    })
  );
}
function printTable(data, headers) {
  const tableData = headers ? [headers, ...data] : data;
  console.log(
    (0, import_table.table)(tableData, {
      border: {
        topBody: "\u2500",
        topJoin: "\u252C",
        topLeft: "\u250C",
        topRight: "\u2510",
        bottomBody: "\u2500",
        bottomJoin: "\u2534",
        bottomLeft: "\u2514",
        bottomRight: "\u2518",
        bodyLeft: "\u2502",
        bodyRight: "\u2502",
        bodyJoin: "\u2502",
        joinBody: "\u2500",
        joinLeft: "\u251C",
        joinRight: "\u2524",
        joinJoin: "\u253C"
      }
    })
  );
}
function formatEth(eth) {
  const value = typeof eth === "string" ? parseFloat(eth) : eth;
  return `${value.toFixed(6)} ETH`;
}
function formatDate(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function truncate(str, length) {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + "...";
}
function printWelcome() {
  const banner = `
${import_chalk.default.cyan("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557")}
${import_chalk.default.cyan("\u2551")}  ${import_chalk.default.bold.white("MEMOREUM")} ${import_chalk.default.gray("- AI Agent Memory Network")}  ${import_chalk.default.cyan("\u2551")}
${import_chalk.default.cyan("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D")}
`;
  console.log(banner);
}
async function withSpinner(message, fn) {
  const s = spinner(message).start();
  try {
    const result = await fn();
    s.succeed();
    return result;
  } catch (err) {
    s.fail();
    throw err;
  }
}

// src/cli/commands/config.ts
var AI_PROVIDERS = ["openai", "anthropic", "google", "groq", "together", "ollama", "deepseek", "mistral"];
function registerConfigCommands(program2) {
  const configCmd = program2.command("config").description("Manage Memoreum CLI configuration");
  configCmd.command("show").description("Show current configuration").action(() => {
    const config2 = getConfig();
    heading("Current Configuration");
    const configData = [
      ["API Key", config2.apiKey ? "********" + config2.apiKey.slice(-8) : import_chalk2.default.gray("Not set")],
      ["Network", config2.network],
      ["Base URL", config2.baseUrl]
    ];
    printTable(configData, ["Setting", "Value"]);
    const providers = getAIProviders();
    if (Object.keys(providers).length > 0) {
      heading("AI Providers");
      const providerData = Object.entries(providers).map(([name, p]) => [
        name,
        p.provider,
        p.model || "default",
        "********" + p.apiKey.slice(-4)
      ]);
      printTable(providerData, ["Name", "Provider", "Model", "API Key"]);
    }
  });
  configCmd.command("set-key <apiKey>").description("Set your Memoreum API key").action((apiKey) => {
    setApiKey(apiKey);
    success("API key saved successfully");
  });
  configCmd.command("network <network>").description("Set network (mainnet or testnet)").action((network) => {
    if (network !== "mainnet" && network !== "testnet") {
      error('Network must be "mainnet" or "testnet"');
      return;
    }
    setNetwork(network);
    success(`Network set to ${network}`);
  });
  configCmd.command("url <url>").description("Set custom API base URL").action((url) => {
    setBaseUrl(url);
    success(`Base URL set to ${url}`);
  });
  configCmd.command("add-provider").description("Add an AI provider configuration").action(async () => {
    const answers = await import_inquirer.default.prompt([
      {
        type: "input",
        name: "name",
        message: 'Configuration name (e.g., "default", "fast", "smart"):',
        default: "default"
      },
      {
        type: "list",
        name: "provider",
        message: "Select AI provider:",
        choices: AI_PROVIDERS
      },
      {
        type: "input",
        name: "apiKey",
        message: "Enter your API key:",
        validate: (input) => input.length > 0 || "API key is required"
      },
      {
        type: "input",
        name: "model",
        message: "Model name (leave empty for default):"
      },
      {
        type: "number",
        name: "temperature",
        message: "Temperature (0-2):",
        default: 0.7
      },
      {
        type: "number",
        name: "maxTokens",
        message: "Max tokens:",
        default: 4096
      }
    ]);
    setAIProvider(answers.name, {
      provider: answers.provider,
      apiKey: answers.apiKey,
      model: answers.model || void 0,
      temperature: answers.temperature,
      maxTokens: answers.maxTokens
    });
    success(`AI provider "${answers.name}" configured successfully`);
  });
  configCmd.command("remove-provider <name>").description("Remove an AI provider configuration").action((name) => {
    const providers = getAIProviders();
    if (!providers[name]) {
      error(`Provider "${name}" not found`);
      return;
    }
    removeAIProvider(name);
    success(`Provider "${name}" removed`);
  });
  configCmd.command("providers").description("List configured AI providers").action(() => {
    const providers = getAIProviders();
    if (Object.keys(providers).length === 0) {
      info("No AI providers configured. Run `memoreum config add-provider` to add one.");
      return;
    }
    heading("Configured AI Providers");
    const data = Object.entries(providers).map(([name, p]) => [
      name,
      p.provider,
      p.model || "default",
      String(p.temperature ?? 0.7),
      String(p.maxTokens ?? 4096)
    ]);
    printTable(data, ["Name", "Provider", "Model", "Temperature", "Max Tokens"]);
  });
  configCmd.command("reset").description("Reset all configuration").action(async () => {
    const { confirm } = await import_inquirer.default.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Are you sure you want to reset all configuration?",
        default: false
      }
    ]);
    if (confirm) {
      clearConfig();
      success("Configuration reset");
    }
  });
  configCmd.command("setup").description("Interactive setup wizard").action(async () => {
    printBox(
      "Welcome to Memoreum CLI Setup!\n\nThis wizard will help you configure:\n\u2022 Your Memoreum API key\n\u2022 AI provider (OpenAI, Claude, etc.)\n\u2022 Network settings",
      "Setup Wizard"
    );
    const answers = await import_inquirer.default.prompt([
      {
        type: "input",
        name: "apiKey",
        message: "Enter your Memoreum API key:",
        validate: (input) => input.length > 0 || "API key is required"
      },
      {
        type: "list",
        name: "network",
        message: "Select network:",
        choices: ["mainnet", "testnet"],
        default: "mainnet"
      },
      {
        type: "confirm",
        name: "setupAI",
        message: "Would you like to configure an AI provider now?",
        default: true
      }
    ]);
    setApiKey(answers.apiKey);
    setNetwork(answers.network);
    if (answers.setupAI) {
      const aiAnswers = await import_inquirer.default.prompt([
        {
          type: "list",
          name: "provider",
          message: "Select AI provider:",
          choices: AI_PROVIDERS
        },
        {
          type: "input",
          name: "aiApiKey",
          message: "Enter your AI provider API key:",
          validate: (input) => input.length > 0 || "API key is required"
        }
      ]);
      setDefaultAIProvider({
        provider: aiAnswers.provider,
        apiKey: aiAnswers.aiApiKey
      });
    }
    success("Setup complete! You can now use Memoreum CLI.");
    info("Run `memoreum --help` to see available commands.");
  });
}

// src/cli/commands/agent.ts
var import_inquirer2 = __toESM(require("inquirer"));
var import_chalk3 = __toESM(require("chalk"));
function registerAgentCommands(program2) {
  const agentCmd = program2.command("agent").description("Manage Memoreum agents");
  agentCmd.command("register <name>").description("Register a new agent on Memoreum").action(async (name) => {
    try {
      const client = new MemoreumClient({ apiKey: "" });
      const agent = await withSpinner("Registering agent...", async () => {
        const response = await client.registerAgent(name);
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to register agent");
        }
        return response.data;
      });
      const agentData = agent;
      const localAgent = {
        id: agentData.agentId,
        name: agentData.agentName,
        apiKey: agentData.apiKey,
        walletAddress: agentData.wallet.address,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      addAgent(localAgent);
      setCurrentAgent(agentData.agentId);
      success(`Agent "${name}" registered successfully!`);
      console.log();
      console.log(import_chalk3.default.gray("Agent ID:"), agentData.agentId);
      console.log(import_chalk3.default.gray("API Key:"), agentData.apiKey);
      console.log(import_chalk3.default.gray("Wallet:"), agentData.wallet.address);
      console.log();
      console.log(import_chalk3.default.yellow("IMPORTANT: Save these credentials securely!"));
      console.log(import_chalk3.default.gray("Private Key:"), agentData.wallet.privateKey);
      console.log(import_chalk3.default.gray("Mnemonic:"), agentData.wallet.mnemonic);
      console.log();
      warn("These credentials cannot be retrieved later!");
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to register agent");
    }
  });
  agentCmd.command("list").description("List locally saved agents").action(() => {
    const agents = getAgents();
    const currentId = getCurrentAgentId();
    if (agents.length === 0) {
      info("No agents saved locally. Run `memoreum agent register <name>` to create one.");
      return;
    }
    heading("Local Agents");
    const data = agents.map((a) => [
      a.id === currentId ? import_chalk3.default.green("*") : " ",
      a.name,
      a.id.slice(0, 16) + "...",
      a.walletAddress.slice(0, 10) + "...",
      formatDate(a.createdAt)
    ]);
    printTable(data, ["", "Name", "ID", "Wallet", "Created"]);
  });
  agentCmd.command("use <idOrName>").description("Select an agent to use").action((idOrName) => {
    const agents = getAgents();
    const agent = agents.find(
      (a) => a.id === idOrName || a.id.startsWith(idOrName) || a.name === idOrName
    );
    if (!agent) {
      error(`Agent "${idOrName}" not found`);
      return;
    }
    setCurrentAgent(agent.id);
    success(`Now using agent "${agent.name}"`);
  });
  agentCmd.command("current").description("Show currently selected agent").action(() => {
    const agent = getCurrentAgent();
    if (!agent) {
      info("No agent selected. Run `memoreum agent use <id>` to select one.");
      return;
    }
    heading("Current Agent");
    const data = [
      ["Name", agent.name],
      ["ID", agent.id],
      ["Wallet", agent.walletAddress],
      ["API Key", "********" + agent.apiKey.slice(-8)],
      ["Created", formatDate(agent.createdAt)]
    ];
    printTable(data, ["Field", "Value"]);
  });
  agentCmd.command("info").description("Get current agent info from Memoreum API").action(async () => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const agentData = await withSpinner("Fetching agent info...", async () => {
        const response = await client.getAgent();
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch agent");
        }
        return response.data;
      });
      heading("Agent Info");
      const data = [
        ["Name", agentData.agentName],
        ["ID", agentData.id],
        ["Wallet", agentData.walletAddress],
        ["Reputation", `${(agentData.reputationScore * 100).toFixed(1)}%`],
        ["Total Sales", String(agentData.totalSales)],
        ["Total Purchases", String(agentData.totalPurchases)],
        ["Status", agentData.isActive ? import_chalk3.default.green("Active") : import_chalk3.default.red("Inactive")],
        ["Created", formatDate(agentData.createdAt)]
      ];
      printTable(data, ["Field", "Value"]);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch agent");
    }
  });
  agentCmd.command("stats").description("Get agent statistics").action(async () => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const stats = await withSpinner("Fetching stats...", async () => {
        const response = await client.getAgentStats();
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch stats");
        }
        return response.data;
      });
      heading("Agent Statistics");
      const data = [
        ["Memories Stored", String(stats.memoriesStored)],
        ["Memories Sold", String(stats.memoriesSold)],
        ["Memories Purchased", String(stats.memoriesPurchased)],
        ["Total Earnings", `${stats.totalEarnings} ETH`],
        ["Total Spent", `${stats.totalSpent} ETH`],
        ["Reputation", `${(stats.reputationScore * 100).toFixed(1)}%`]
      ];
      printTable(data, ["Metric", "Value"]);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch stats");
    }
  });
  agentCmd.command("remove <idOrName>").description("Remove an agent from local storage").action(async (idOrName) => {
    const agents = getAgents();
    const agent = agents.find(
      (a) => a.id === idOrName || a.id.startsWith(idOrName) || a.name === idOrName
    );
    if (!agent) {
      error(`Agent "${idOrName}" not found`);
      return;
    }
    const { confirm } = await import_inquirer2.default.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `Remove agent "${agent.name}" from local storage?`,
        default: false
      }
    ]);
    if (confirm) {
      removeAgent(agent.id);
      if (getCurrentAgentId() === agent.id) {
        setCurrentAgent(null);
      }
      success(`Agent "${agent.name}" removed`);
      warn("Note: This only removes from local storage, not from Memoreum.");
    }
  });
  agentCmd.command("import").description("Import an existing agent using API key").action(async () => {
    const { apiKey } = await import_inquirer2.default.prompt([
      {
        type: "input",
        name: "apiKey",
        message: "Enter agent API key:",
        validate: (input) => input.length > 0 || "API key is required"
      }
    ]);
    try {
      const client = new MemoreumClient({ apiKey });
      const agentData = await withSpinner("Importing agent...", async () => {
        const response = await client.getAgent();
        if (!response.success || !response.data) {
          throw new Error(response.error || "Invalid API key");
        }
        return response.data;
      });
      const existing = getAgents().find((a) => a.id === agentData.id);
      if (existing) {
        warn(`Agent "${agentData.agentName}" already exists locally`);
        return;
      }
      const localAgent = {
        id: agentData.id,
        name: agentData.agentName,
        apiKey,
        walletAddress: agentData.walletAddress,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      addAgent(localAgent);
      setCurrentAgent(agentData.id);
      success(`Agent "${agentData.agentName}" imported successfully!`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to import agent");
    }
  });
}

// src/cli/commands/memory.ts
var import_inquirer3 = __toESM(require("inquirer"));
var import_chalk4 = __toESM(require("chalk"));
var MEMORY_TYPES = [
  "conversation",
  "experience",
  "knowledge",
  "transaction",
  "observation",
  "decision",
  "learning",
  "error",
  "success",
  "interaction"
];
function registerMemoryCommands(program2) {
  const memoryCmd = program2.command("memory").description("Manage agent memories");
  memoryCmd.command("store").description("Store a new memory").option("-t, --title <title>", "Memory title").option("-c, --content <content>", "Memory content").option("--type <type>", "Memory type").option("--tags <tags>", "Comma-separated tags").option("--public", "Make memory public").option("--importance <n>", "Importance (0-1)", parseFloat).action(async (options) => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    let { title, content, type, tags, importance } = options;
    const isPublic = options.public || false;
    if (!title || !content) {
      const answers = await import_inquirer3.default.prompt([
        {
          type: "input",
          name: "title",
          message: "Memory title:",
          when: !title,
          validate: (input) => input.length > 0 || "Title is required"
        },
        {
          type: "editor",
          name: "content",
          message: "Memory content (opens editor):",
          when: !content,
          validate: (input) => input.length > 0 || "Content is required"
        },
        {
          type: "list",
          name: "type",
          message: "Memory type:",
          choices: MEMORY_TYPES,
          when: !type,
          default: "knowledge"
        },
        {
          type: "input",
          name: "tags",
          message: "Tags (comma-separated):",
          when: !tags
        },
        {
          type: "number",
          name: "importance",
          message: "Importance (0-1):",
          when: importance === void 0,
          default: 0.5
        }
      ]);
      title = title || answers.title;
      content = content || answers.content;
      type = type || answers.type;
      tags = tags || answers.tags;
      importance = importance ?? answers.importance;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const memory = await withSpinner("Storing memory...", async () => {
        const response = await client.storeMemory({
          memoryType: type,
          title,
          content,
          importance: importance || 0.5,
          tags: tags ? tags.split(",").map((t) => t.trim()) : [],
          isPublic
        });
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to store memory");
        }
        return response.data;
      });
      success("Memory stored successfully!");
      console.log(import_chalk4.default.gray("Memory ID:"), memory.id);
      console.log(import_chalk4.default.gray("Content Hash:"), memory.contentHash);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to store memory");
    }
  });
  memoryCmd.command("list").description("List your memories").option("-l, --limit <n>", "Number of memories", "20").option("--type <type>", "Filter by type").option("--public", "Show only public memories").action(async (options) => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const result = await withSpinner("Fetching memories...", async () => {
        const response = await client.listMemories({
          limit: parseInt(options.limit),
          memoryType: options.type,
          isPublic: options.public ? true : void 0
        });
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch memories");
        }
        return response.data;
      });
      if (result.items.length === 0) {
        info("No memories found.");
        return;
      }
      heading(`Memories (${result.total} total)`);
      const data = result.items.map((m) => [
        truncate(m.id, 12),
        m.memoryType,
        truncate(m.title, 30),
        m.isPublic ? import_chalk4.default.green("Yes") : import_chalk4.default.gray("No"),
        String(m.totalSold),
        formatDate(m.createdAt)
      ]);
      printTable(data, ["ID", "Type", "Title", "Public", "Sold", "Created"]);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch memories");
    }
  });
  memoryCmd.command("get <id>").description("Get memory details").action(async (id) => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const memory = await withSpinner("Fetching memory...", async () => {
        const response = await client.getMemory(id);
        if (!response.success || !response.data) {
          throw new Error(response.error || "Memory not found");
        }
        return response.data;
      });
      heading("Memory Details");
      console.log(import_chalk4.default.bold("Title:"), memory.title);
      console.log(import_chalk4.default.bold("Type:"), memory.memoryType);
      console.log(import_chalk4.default.bold("ID:"), memory.id);
      console.log(import_chalk4.default.bold("Public:"), memory.isPublic ? "Yes" : "No");
      console.log(import_chalk4.default.bold("Importance:"), memory.importance);
      console.log(import_chalk4.default.bold("Tags:"), memory.tags.length > 0 ? memory.tags.join(", ") : "None");
      console.log(import_chalk4.default.bold("Total Sold:"), memory.totalSold);
      console.log(import_chalk4.default.bold("Created:"), formatDate(memory.createdAt));
      console.log();
      console.log(import_chalk4.default.bold("Content:"));
      console.log(import_chalk4.default.gray("\u2500".repeat(40)));
      console.log(memory.content);
      console.log(import_chalk4.default.gray("\u2500".repeat(40)));
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch memory");
    }
  });
  memoryCmd.command("search <query>").description("Search memories semantically").option("-l, --limit <n>", "Number of results", "10").action(async (query, options) => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const memories = await withSpinner("Searching...", async () => {
        const response = await client.searchMemories(query, parseInt(options.limit));
        if (!response.success) {
          throw new Error(response.error || "Search failed");
        }
        return response.data || [];
      });
      if (memories.length === 0) {
        info("No matching memories found.");
        return;
      }
      heading(`Search Results for "${query}"`);
      const data = memories.map((m) => [
        truncate(m.id, 12),
        m.memoryType,
        truncate(m.title, 40),
        formatDate(m.createdAt)
      ]);
      printTable(data, ["ID", "Type", "Title", "Created"]);
    } catch (err) {
      error(err instanceof Error ? err.message : "Search failed");
    }
  });
  memoryCmd.command("delete <id>").description("Delete a memory").action(async (id) => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    const { confirm } = await import_inquirer3.default.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Are you sure you want to delete this memory?",
        default: false
      }
    ]);
    if (!confirm) return;
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      await withSpinner("Deleting memory...", async () => {
        const response = await client.deleteMemory(id);
        if (!response.success) {
          throw new Error(response.error || "Failed to delete memory");
        }
      });
      success("Memory deleted successfully");
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to delete memory");
    }
  });
  memoryCmd.command("purchased").description("List purchased memories").action(async () => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const memories = await withSpinner("Fetching purchased memories...", async () => {
        const response = await client.getPurchasedMemories();
        if (!response.success) {
          throw new Error(response.error || "Failed to fetch");
        }
        return response.data || [];
      });
      if (memories.length === 0) {
        info("No purchased memories yet.");
        return;
      }
      heading("Purchased Memories");
      const data = memories.map((m) => [
        truncate(m.id, 12),
        m.memoryType,
        truncate(m.title, 40),
        formatDate(m.createdAt)
      ]);
      printTable(data, ["ID", "Type", "Title", "Purchased"]);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch");
    }
  });
}

// src/cli/commands/marketplace.ts
var import_inquirer4 = __toESM(require("inquirer"));
var import_chalk5 = __toESM(require("chalk"));
function registerMarketplaceCommands(program2) {
  const marketCmd = program2.command("marketplace").alias("market").description("Browse and trade on the Memoreum marketplace");
  marketCmd.command("browse").description("Browse marketplace listings").option("-l, --limit <n>", "Number of listings", "20").option("--type <type>", "Filter by memory type").option("--min-price <eth>", "Minimum price in ETH").option("--max-price <eth>", "Maximum price in ETH").option("--sort <sort>", "Sort by: price_asc, price_desc, recent, popular").action(async (options) => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const result = await withSpinner("Fetching listings...", async () => {
        const response = await client.browseMarketplace({
          limit: parseInt(options.limit),
          memoryType: options.type,
          minPrice: options.minPrice,
          maxPrice: options.maxPrice,
          sortBy: options.sort
        });
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch listings");
        }
        return response.data;
      });
      if (result.items.length === 0) {
        info("No listings found.");
        return;
      }
      heading(`Marketplace Listings (${result.total} total)`);
      const data = result.items.map((l) => [
        truncate(l.id, 12),
        l.memory?.title ? truncate(l.memory.title, 30) : "Unknown",
        l.memory?.memoryType || "-",
        formatEth(l.priceEth),
        String(l.views),
        l.seller?.agentName ? truncate(l.seller.agentName, 15) : "Unknown",
        formatDate(l.listedAt)
      ]);
      printTable(data, ["ID", "Title", "Type", "Price", "Views", "Seller", "Listed"]);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch listings");
    }
  });
  marketCmd.command("view <listingId>").description("View listing details").action(async (listingId) => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const listing = await withSpinner("Fetching listing...", async () => {
        const response = await client.getListing(listingId);
        if (!response.success || !response.data) {
          throw new Error(response.error || "Listing not found");
        }
        return response.data;
      });
      heading("Listing Details");
      console.log(import_chalk5.default.bold("Listing ID:"), listing.id);
      console.log(import_chalk5.default.bold("Price:"), import_chalk5.default.green(formatEth(listing.priceEth)));
      console.log(import_chalk5.default.bold("Views:"), listing.views);
      console.log(import_chalk5.default.bold("Status:"), listing.isActive ? import_chalk5.default.green("Active") : import_chalk5.default.red("Inactive"));
      console.log(import_chalk5.default.bold("Listed:"), formatDate(listing.listedAt));
      if (listing.expiresAt) {
        console.log(import_chalk5.default.bold("Expires:"), formatDate(listing.expiresAt));
      }
      if (listing.memory) {
        console.log();
        console.log(import_chalk5.default.bold.cyan("Memory Info:"));
        console.log(import_chalk5.default.bold("Title:"), listing.memory.title);
        console.log(import_chalk5.default.bold("Type:"), listing.memory.memoryType);
        console.log(import_chalk5.default.bold("Importance:"), listing.memory.importance);
        console.log(import_chalk5.default.bold("Tags:"), listing.memory.tags.length > 0 ? listing.memory.tags.join(", ") : "None");
      }
      if (listing.seller) {
        console.log();
        console.log(import_chalk5.default.bold.cyan("Seller Info:"));
        console.log(import_chalk5.default.bold("Name:"), listing.seller.agentName);
        console.log(import_chalk5.default.bold("Reputation:"), `${(listing.seller.reputationScore * 100).toFixed(1)}%`);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch listing");
    }
  });
  marketCmd.command("buy <listingId>").description("Purchase a memory from the marketplace").action(async (listingId) => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const listingResponse = await client.getListing(listingId);
      if (!listingResponse.success || !listingResponse.data) {
        error("Listing not found");
        return;
      }
      const listing = listingResponse.data;
      console.log();
      console.log(import_chalk5.default.bold("Memory:"), listing.memory?.title || "Unknown");
      console.log(import_chalk5.default.bold("Price:"), import_chalk5.default.green(formatEth(listing.priceEth)));
      console.log(import_chalk5.default.bold("Seller:"), listing.seller?.agentName || "Unknown");
      console.log();
      const { confirm } = await import_inquirer4.default.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: `Purchase this memory for ${formatEth(listing.priceEth)}?`,
          default: false
        }
      ]);
      if (!confirm) {
        info("Purchase cancelled");
        return;
      }
      const result = await withSpinner("Processing purchase...", async () => {
        const response = await client.purchaseMemory({ listingId });
        if (!response.success || !response.data) {
          throw new Error(response.error || "Purchase failed");
        }
        return response.data;
      });
      success("Purchase successful!");
      console.log(import_chalk5.default.gray("Transaction ID:"), result.transaction.id);
      console.log(import_chalk5.default.gray("TX Hash:"), result.txHash);
      info("The memory has been added to your collection.");
    } catch (err) {
      error(err instanceof Error ? err.message : "Purchase failed");
    }
  });
  marketCmd.command("sell <memoryId>").description("List a memory for sale").option("-p, --price <eth>", "Price in ETH").option("-d, --days <n>", "Listing duration in days").action(async (memoryId, options) => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    let { price, days } = options;
    if (!price) {
      const answers = await import_inquirer4.default.prompt([
        {
          type: "input",
          name: "price",
          message: "Price in ETH:",
          validate: (input) => {
            const num = parseFloat(input);
            return !isNaN(num) && num > 0 || "Enter a valid price";
          }
        },
        {
          type: "number",
          name: "days",
          message: "Listing duration (days, 0 for no expiry):",
          default: 30
        }
      ]);
      price = answers.price;
      days = answers.days;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const listing = await withSpinner("Creating listing...", async () => {
        const response = await client.createListing({
          memoryId,
          priceEth: price,
          expiresInDays: days > 0 ? parseInt(days) : void 0
        });
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to create listing");
        }
        return response.data;
      });
      success("Memory listed for sale!");
      console.log(import_chalk5.default.gray("Listing ID:"), listing.id);
      console.log(import_chalk5.default.gray("Price:"), formatEth(listing.priceEth));
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to create listing");
    }
  });
  marketCmd.command("my-listings").description("View your active listings").action(async () => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const listings = await withSpinner("Fetching your listings...", async () => {
        const response = await client.getMyListings();
        if (!response.success) {
          throw new Error(response.error || "Failed to fetch listings");
        }
        return response.data || [];
      });
      if (listings.length === 0) {
        info("You have no active listings.");
        return;
      }
      heading("Your Listings");
      const data = listings.map((l) => [
        truncate(l.id, 12),
        l.memory?.title ? truncate(l.memory.title, 30) : "Unknown",
        formatEth(l.priceEth),
        String(l.views),
        l.isActive ? import_chalk5.default.green("Active") : import_chalk5.default.gray("Inactive"),
        formatDate(l.listedAt)
      ]);
      printTable(data, ["ID", "Title", "Price", "Views", "Status", "Listed"]);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch listings");
    }
  });
  marketCmd.command("remove <listingId>").description("Remove a listing").action(async (listingId) => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    const { confirm } = await import_inquirer4.default.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Remove this listing?",
        default: false
      }
    ]);
    if (!confirm) return;
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      await withSpinner("Removing listing...", async () => {
        const response = await client.removeListing(listingId);
        if (!response.success) {
          throw new Error(response.error || "Failed to remove listing");
        }
      });
      success("Listing removed");
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to remove listing");
    }
  });
}

// src/cli/commands/chat.ts
var import_inquirer5 = __toESM(require("inquirer"));
var import_chalk6 = __toESM(require("chalk"));

// src/ai/base.ts
var BaseAIProvider = class {
  apiKey;
  _model;
  defaultTemperature;
  defaultMaxTokens;
  constructor(apiKey, model, temperature = 0.7, maxTokens = 4096) {
    this.apiKey = apiKey;
    this._model = model;
    this.defaultTemperature = temperature;
    this.defaultMaxTokens = maxTokens;
  }
  get model() {
    return this._model || this.defaultModel;
  }
  set model(value) {
    this._model = value;
  }
  getModel() {
    return this.model;
  }
  setModel(model) {
    if (!this.supportedModels.includes(model)) {
      console.warn(`Model ${model} may not be supported by ${this.providerName}`);
    }
    this.model = model;
  }
  validateApiKey() {
    return this.apiKey.length > 0;
  }
};
var AIProviderError = class extends Error {
  constructor(message, provider, statusCode) {
    super(`[${provider}] ${message}`);
    this.provider = provider;
    this.statusCode = statusCode;
    this.name = "AIProviderError";
  }
};

// src/ai/providers/openai.ts
var OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
var OpenAIProvider = class extends BaseAIProvider {
  providerName = "openai";
  supportedModels = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "o1-preview",
    "o1-mini"
  ];
  defaultModel = "gpt-4o-mini";
  async complete(messages, options) {
    try {
      const res = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          temperature: options?.temperature ?? this.defaultTemperature,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences
        })
      });
      if (!res.ok) {
        const error2 = await res.text();
        throw new Error(`OpenAI API error: ${error2}`);
      }
      const response = await res.json();
      const choice = response.choices[0];
      return {
        content: choice.message.content || "",
        model: response.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        finishReason: choice.finish_reason || "stop"
      };
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
  async *stream(messages, options) {
    try {
      const res = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          temperature: options?.temperature ?? this.defaultTemperature,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences,
          stream: true
        })
      });
      if (!res.ok) {
        const error2 = await res.text();
        throw new Error(`OpenAI API error: ${error2}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              yield { content: "", done: true };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              const isDone = parsed.choices[0]?.finish_reason !== null;
              yield { content, done: isDone };
            } catch {
            }
          }
        }
      }
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
};

// src/ai/providers/anthropic.ts
var ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
var AnthropicProvider = class extends BaseAIProvider {
  providerName = "anthropic";
  supportedModels = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307"
  ];
  defaultModel = "claude-3-5-sonnet-20241022";
  async complete(messages, options) {
    try {
      const systemMessage = messages.find((m) => m.role === "system");
      const chatMessages = messages.filter((m) => m.role !== "system");
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          temperature: options?.temperature ?? this.defaultTemperature,
          system: systemMessage?.content,
          messages: chatMessages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          stop_sequences: options?.stopSequences
        })
      });
      if (!res.ok) {
        const error2 = await res.text();
        throw new Error(`Anthropic API error: ${error2}`);
      }
      const response = await res.json();
      const textContent = response.content.filter((c) => c.type === "text").map((c) => c.text).join("");
      return {
        content: textContent,
        model: response.model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        },
        finishReason: response.stop_reason || "end_turn"
      };
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
  async *stream(messages, options) {
    try {
      const systemMessage = messages.find((m) => m.role === "system");
      const chatMessages = messages.filter((m) => m.role !== "system");
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          temperature: options?.temperature ?? this.defaultTemperature,
          system: systemMessage?.content,
          messages: chatMessages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          stop_sequences: options?.stopSequences,
          stream: true
        })
      });
      if (!res.ok) {
        const error2 = await res.text();
        throw new Error(`Anthropic API error: ${error2}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta") {
                yield { content: parsed.delta?.text || "", done: false };
              } else if (parsed.type === "message_stop") {
                yield { content: "", done: true };
              }
            } catch {
            }
          }
        }
      }
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
};

// src/ai/providers/google.ts
var GOOGLE_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
var GoogleProvider = class extends BaseAIProvider {
  providerName = "google";
  supportedModels = [
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-pro"
  ];
  defaultModel = "gemini-1.5-flash";
  convertMessages(messages) {
    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");
    const contents = chatMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    return {
      contents,
      systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : void 0
    };
  }
  async complete(messages, options) {
    try {
      const { contents, systemInstruction } = this.convertMessages(messages);
      const url = `${GOOGLE_API_URL}/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            temperature: options?.temperature ?? this.defaultTemperature,
            maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
            stopSequences: options?.stopSequences
          }
        })
      });
      if (!res.ok) {
        const error2 = await res.text();
        throw new Error(`Google AI API error: ${error2}`);
      }
      const response = await res.json();
      const candidate = response.candidates[0];
      const text = candidate?.content?.parts?.map((p) => p.text).join("") || "";
      return {
        content: text,
        model: this.model,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        },
        finishReason: candidate?.finishReason || "STOP"
      };
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
  async *stream(messages, options) {
    try {
      const { contents, systemInstruction } = this.convertMessages(messages);
      const url = `${GOOGLE_API_URL}/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            temperature: options?.temperature ?? this.defaultTemperature,
            maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
            stopSequences: options?.stopSequences
          }
        })
      });
      if (!res.ok) {
        const error2 = await res.text();
        throw new Error(`Google AI API error: ${error2}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
              const isDone = parsed.candidates?.[0]?.finishReason === "STOP";
              yield { content: text, done: isDone };
            } catch {
            }
          }
        }
      }
      yield { content: "", done: true };
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
};

// src/ai/providers/groq.ts
var GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
var GroqProvider = class extends BaseAIProvider {
  providerName = "groq";
  supportedModels = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-groq-70b-8192-tool-use-preview",
    "mixtral-8x7b-32768",
    "gemma2-9b-it"
  ];
  defaultModel = "llama-3.3-70b-versatile";
  async complete(messages, options) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          temperature: options?.temperature ?? this.defaultTemperature,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences
        })
      });
      if (!res.ok) {
        const error2 = await res.text();
        throw new Error(`Groq API error: ${error2}`);
      }
      const response = await res.json();
      const choice = response.choices[0];
      return {
        content: choice.message.content || "",
        model: response.model || this.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        finishReason: choice.finish_reason || "stop"
      };
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
  async *stream(messages, options) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          temperature: options?.temperature ?? this.defaultTemperature,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences,
          stream: true
        })
      });
      if (!res.ok) {
        const error2 = await res.text();
        throw new Error(`Groq API error: ${error2}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              yield { content: "", done: true };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              const isDone = parsed.choices[0]?.finish_reason !== null;
              yield { content, done: isDone };
            } catch {
            }
          }
        }
      }
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
};

// src/ai/providers/together.ts
var TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions";
var TogetherProvider = class extends BaseAIProvider {
  providerName = "together";
  supportedModels = [
    "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    "mistralai/Mixtral-8x22B-Instruct-v0.1",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "Qwen/Qwen2.5-72B-Instruct-Turbo",
    "deepseek-ai/deepseek-llm-67b-chat"
  ];
  defaultModel = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";
  async complete(messages, options) {
    try {
      const res = await fetch(TOGETHER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          temperature: options?.temperature ?? this.defaultTemperature,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences
        })
      });
      if (!res.ok) {
        const error2 = await res.text();
        throw new Error(`Together API error: ${error2}`);
      }
      const response = await res.json();
      const choice = response.choices[0];
      return {
        content: choice.message?.content || "",
        model: response.model || this.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        finishReason: choice.finish_reason || "stop"
      };
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
  async *stream(messages, options) {
    try {
      const res = await fetch(TOGETHER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          temperature: options?.temperature ?? this.defaultTemperature,
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          stop: options?.stopSequences,
          stream: true
        })
      });
      if (!res.ok) {
        const error2 = await res.text();
        throw new Error(`Together API error: ${error2}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              yield { content: "", done: true };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              const isDone = parsed.choices[0]?.finish_reason !== null;
              yield { content, done: isDone };
            } catch {
            }
          }
        }
      }
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
};

// src/ai/providers/ollama.ts
var OllamaProvider = class extends BaseAIProvider {
  providerName = "ollama";
  supportedModels = [
    "llama3.2",
    "llama3.1",
    "llama3",
    "mistral",
    "mixtral",
    "codellama",
    "deepseek-coder",
    "phi3",
    "gemma2",
    "qwen2.5"
  ];
  defaultModel = "llama3.2";
  baseUrl;
  constructor(apiKey, model, temperature, maxTokens) {
    super(apiKey, model, temperature, maxTokens);
    this.baseUrl = apiKey || "http://localhost:11434";
  }
  async complete(messages, options) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          options: {
            temperature: options?.temperature ?? this.defaultTemperature,
            num_predict: options?.maxTokens ?? this.defaultMaxTokens,
            stop: options?.stopSequences
          },
          stream: false
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return {
        content: data.message.content,
        model: data.model,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        finishReason: "stop"
      };
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
  async *stream(messages, options) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          options: {
            temperature: options?.temperature ?? this.defaultTemperature,
            num_predict: options?.maxTokens ?? this.defaultMaxTokens,
            stop: options?.stopSequences
          },
          stream: true
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            yield {
              content: data.message?.content || "",
              done: data.done
            };
          } catch {
          }
        }
      }
    } catch (error2) {
      throw new AIProviderError(
        error2 instanceof Error ? error2.message : "Unknown error",
        this.providerName
      );
    }
  }
};

// src/ai/index.ts
function createProvider(config2) {
  const { provider, apiKey, model, temperature, maxTokens } = config2;
  switch (provider) {
    case "openai":
      return new OpenAIProvider(apiKey, model, temperature, maxTokens);
    case "anthropic":
      return new AnthropicProvider(apiKey, model, temperature, maxTokens);
    case "google":
      return new GoogleProvider(apiKey, model, temperature, maxTokens);
    case "groq":
      return new GroqProvider(apiKey, model, temperature, maxTokens);
    case "together":
      return new TogetherProvider(apiKey, model, temperature, maxTokens);
    case "ollama":
      return new OllamaProvider(apiKey, model, temperature, maxTokens);
    case "deepseek":
      return new OpenAIProvider(apiKey, model || "deepseek-chat", temperature, maxTokens);
    case "mistral":
      return new OpenAIProvider(apiKey, model || "mistral-large-latest", temperature, maxTokens);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// src/agent/MemoreumAgent.ts
var DEFAULT_SYSTEM_PROMPT = `You are an autonomous AI agent operating on the Memoreum network - a decentralized marketplace for AI agent memories on Base Chain.

Your capabilities:
- Store experiences, learnings, and insights as memories
- Browse and purchase valuable memories from other agents
- Sell your own memories to earn ETH
- Make decisions based on your accumulated knowledge

Guidelines:
- Be helpful, accurate, and thoughtful in your responses
- Consider whether experiences are worth storing as memories
- Evaluate the value of memories before purchasing
- Build your reputation through quality interactions

You have access to stored memories that may help inform your responses.`;
var MemoreumAgent = class {
  client;
  aiProvider;
  config;
  conversationHistory = [];
  eventHandlers = /* @__PURE__ */ new Map();
  isRunning = false;
  constructor(memoreumApiKey, config2) {
    this.config = config2;
    this.client = new MemoreumClient({ apiKey: memoreumApiKey });
    this.aiProvider = createProvider(config2.aiProvider);
    this.conversationHistory.push({
      role: "system",
      content: config2.systemPrompt || DEFAULT_SYSTEM_PROMPT
    });
  }
  // ============================================
  // Event System
  // ============================================
  on(event, handler) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }
  off(event, handler) {
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.eventHandlers.set(event, handlers);
    }
  }
  emit(event) {
    const handlers = this.eventHandlers.get(event.type) || [];
    const allHandlers = this.eventHandlers.get("*") || [];
    [...handlers, ...allHandlers].forEach((handler) => {
      try {
        handler(event);
      } catch (error2) {
        console.error("Event handler error:", error2);
      }
    });
  }
  // ============================================
  // Chat Methods
  // ============================================
  /**
   * Send a message and get a response
   */
  async chat(message) {
    this.emit({
      type: "agent:thinking",
      timestamp: /* @__PURE__ */ new Date(),
      data: { message }
    });
    this.conversationHistory.push({
      role: "user",
      content: message
    });
    const relevantMemories = await this.retrieveRelevantMemories(message);
    const messagesWithContext = this.buildContextualMessages(relevantMemories);
    try {
      const result = await this.aiProvider.complete(messagesWithContext);
      this.conversationHistory.push({
        role: "assistant",
        content: result.content
      });
      this.emit({
        type: "agent:response",
        timestamp: /* @__PURE__ */ new Date(),
        data: {
          response: result.content,
          usage: result.usage,
          model: result.model
        }
      });
      if (this.config.autoStore && this.shouldStoreInteraction(message, result.content)) {
        await this.storeInteraction(message, result.content);
      }
      return result.content;
    } catch (error2) {
      this.emit({
        type: "agent:error",
        timestamp: /* @__PURE__ */ new Date(),
        data: { error: error2 }
      });
      throw error2;
    }
  }
  /**
   * Stream a chat response
   */
  async *chatStream(message) {
    this.emit({
      type: "agent:thinking",
      timestamp: /* @__PURE__ */ new Date(),
      data: { message }
    });
    this.conversationHistory.push({
      role: "user",
      content: message
    });
    const relevantMemories = await this.retrieveRelevantMemories(message);
    const messagesWithContext = this.buildContextualMessages(relevantMemories);
    let fullResponse = "";
    try {
      for await (const chunk of this.aiProvider.stream(messagesWithContext)) {
        fullResponse += chunk.content;
        yield chunk.content;
      }
      this.conversationHistory.push({
        role: "assistant",
        content: fullResponse
      });
      this.emit({
        type: "agent:response",
        timestamp: /* @__PURE__ */ new Date(),
        data: { response: fullResponse }
      });
      if (this.config.autoStore && this.shouldStoreInteraction(message, fullResponse)) {
        await this.storeInteraction(message, fullResponse);
      }
    } catch (error2) {
      this.emit({
        type: "agent:error",
        timestamp: /* @__PURE__ */ new Date(),
        data: { error: error2 }
      });
      throw error2;
    }
  }
  // ============================================
  // Memory Management
  // ============================================
  async retrieveRelevantMemories(query) {
    try {
      const response = await this.client.searchMemories(query, 5);
      return response.success ? response.data || [] : [];
    } catch {
      return [];
    }
  }
  buildContextualMessages(memories) {
    const messages = [...this.conversationHistory];
    if (memories.length > 0) {
      const memoryContext = memories.map((m) => `[Memory: ${m.title}]
${m.content}`).join("\n\n");
      const lastUserIndex = messages.length - 1;
      messages.splice(lastUserIndex, 0, {
        role: "system",
        content: `Relevant memories from your knowledge base:

${memoryContext}`
      });
    }
    return messages;
  }
  shouldStoreInteraction(userMessage, assistantResponse) {
    const totalLength = userMessage.length + assistantResponse.length;
    const hasSubstance = totalLength > 200;
    const isQuestion = userMessage.includes("?");
    const hasLearning = /learn|understand|realize|insight|important|remember/i.test(assistantResponse);
    return hasSubstance && (isQuestion || hasLearning);
  }
  async storeInteraction(userMessage, assistantResponse) {
    try {
      await this.storeMemory({
        memoryType: "conversation",
        title: userMessage.slice(0, 100),
        content: `User: ${userMessage}

Assistant: ${assistantResponse}`,
        importance: 0.5,
        tags: ["conversation", "auto-stored"],
        metadata: {
          source: "chat",
          model: this.aiProvider.getModel()
        }
      });
    } catch (error2) {
      console.error("Failed to auto-store interaction:", error2);
    }
  }
  /**
   * Store a memory
   */
  async storeMemory(input) {
    const response = await this.client.storeMemory(input);
    if (response.success && response.data) {
      this.emit({
        type: "memory:created",
        timestamp: /* @__PURE__ */ new Date(),
        data: response.data
      });
      return response.data;
    }
    return null;
  }
  /**
   * Get agent's memories
   */
  async getMemories(limit = 20) {
    const response = await this.client.listMemories({ limit });
    return response.success ? response.data?.items || [] : [];
  }
  /**
   * Search memories
   */
  async searchMemories(query, limit = 10) {
    const response = await this.client.searchMemories(query, limit);
    return response.success ? response.data || [] : [];
  }
  // ============================================
  // Marketplace Methods
  // ============================================
  /**
   * Browse marketplace
   */
  async browseMarketplace(limit = 20) {
    const response = await this.client.browseMarketplace({ limit });
    return response.success ? response.data?.items || [] : [];
  }
  /**
   * Purchase a memory
   */
  async purchaseMemory(listingId) {
    const response = await this.client.purchaseMemory({ listingId });
    if (response.success) {
      this.emit({
        type: "purchase:completed",
        timestamp: /* @__PURE__ */ new Date(),
        data: response.data
      });
      return true;
    }
    return false;
  }
  /**
   * List a memory for sale
   */
  async listMemory(memoryId, priceEth) {
    const response = await this.client.createListing({ memoryId, priceEth });
    if (response.success) {
      this.emit({
        type: "listing:created",
        timestamp: /* @__PURE__ */ new Date(),
        data: response.data
      });
      return true;
    }
    return false;
  }
  // ============================================
  // Agent Control
  // ============================================
  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [this.conversationHistory[0]];
  }
  /**
   * Get conversation history
   */
  getHistory() {
    return [...this.conversationHistory];
  }
  /**
   * Update system prompt
   */
  setSystemPrompt(prompt) {
    this.conversationHistory[0] = {
      role: "system",
      content: prompt
    };
  }
  /**
   * Get the underlying client
   */
  getClient() {
    return this.client;
  }
  /**
   * Get current model
   */
  getModel() {
    return this.aiProvider.getModel();
  }
  /**
   * Change model
   */
  setModel(model) {
    this.aiProvider.setModel(model);
  }
  // ============================================
  // Autonomous Loop (Optional)
  // ============================================
  /**
   * Start autonomous operation loop
   */
  async startAutonomous(taskFn, intervalMs = 6e4) {
    this.isRunning = true;
    while (this.isRunning) {
      try {
        await taskFn(this);
      } catch (error2) {
        this.emit({
          type: "agent:error",
          timestamp: /* @__PURE__ */ new Date(),
          data: { error: error2 }
        });
      }
      if (this.isRunning) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
  }
  /**
   * Stop autonomous operation
   */
  stop() {
    this.isRunning = false;
  }
  /**
   * Check if agent is running autonomously
   */
  isAutonomous() {
    return this.isRunning;
  }
};

// src/cli/commands/chat.ts
function registerChatCommands(program2) {
  program2.command("chat").description("Start an interactive chat with your AI agent").option("--model <model>", "Override the AI model").option("--system <prompt>", "Custom system prompt").option("--stream", "Stream responses", true).action(async (options) => {
    const agentConfig = getCurrentAgent();
    if (!agentConfig) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    const aiProvider = getDefaultAIProvider();
    if (!aiProvider) {
      error("No AI provider configured. Run `memoreum config add-provider` first.");
      return;
    }
    if (options.model) {
      aiProvider.model = options.model;
    }
    const agent = new MemoreumAgent(agentConfig.apiKey, {
      name: agentConfig.name,
      aiProvider,
      systemPrompt: options.system
    });
    printBox(
      `Connected as ${import_chalk6.default.cyan(agentConfig.name)}
Model: ${import_chalk6.default.gray(aiProvider.model || "default")}
Provider: ${import_chalk6.default.gray(aiProvider.provider)}

Type your message and press Enter.
Commands: /clear, /history, /model, /exit`,
      "Memoreum Agent Chat"
    );
    while (true) {
      const { message } = await import_inquirer5.default.prompt([
        {
          type: "input",
          name: "message",
          message: import_chalk6.default.cyan("You:"),
          prefix: ""
        }
      ]);
      if (!message || message.trim() === "") continue;
      if (message.startsWith("/")) {
        const cmd = message.slice(1).toLowerCase().trim();
        if (cmd === "exit" || cmd === "quit" || cmd === "q") {
          info("Goodbye!");
          break;
        }
        if (cmd === "clear") {
          agent.clearHistory();
          console.clear();
          info("Conversation cleared");
          continue;
        }
        if (cmd === "history") {
          heading("Conversation History");
          const history = agent.getHistory();
          history.forEach((msg, i) => {
            if (msg.role === "system") return;
            const prefix = msg.role === "user" ? import_chalk6.default.cyan("You:") : import_chalk6.default.green("Agent:");
            console.log(`${prefix} ${msg.content.slice(0, 100)}${msg.content.length > 100 ? "..." : ""}`);
          });
          continue;
        }
        if (cmd === "model") {
          info(`Current model: ${agent.getModel()}`);
          continue;
        }
        if (cmd.startsWith("model ")) {
          const newModel = cmd.slice(6).trim();
          agent.setModel(newModel);
          info(`Model changed to: ${newModel}`);
          continue;
        }
        if (cmd === "help") {
          console.log();
          console.log(import_chalk6.default.bold("Available Commands:"));
          console.log("  /clear    - Clear conversation history");
          console.log("  /history  - Show conversation history");
          console.log("  /model    - Show current model");
          console.log("  /model <name> - Change model");
          console.log("  /exit     - Exit chat");
          console.log();
          continue;
        }
        info(`Unknown command: ${cmd}. Type /help for available commands.`);
        continue;
      }
      try {
        process.stdout.write(import_chalk6.default.green("\nAgent: "));
        if (options.stream) {
          for await (const chunk of agent.chatStream(message)) {
            process.stdout.write(chunk);
          }
          console.log("\n");
        } else {
          const response = await agent.chat(message);
          console.log(response);
          console.log();
        }
      } catch (err) {
        error(err instanceof Error ? err.message : "Failed to get response");
      }
    }
  });
  program2.command("ask <message>").description("Ask your agent a single question").option("--model <model>", "Override the AI model").action(async (message, options) => {
    const agentConfig = getCurrentAgent();
    if (!agentConfig) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    const aiProvider = getDefaultAIProvider();
    if (!aiProvider) {
      error("No AI provider configured. Run `memoreum config add-provider` first.");
      return;
    }
    if (options.model) {
      aiProvider.model = options.model;
    }
    const agent = new MemoreumAgent(agentConfig.apiKey, {
      name: agentConfig.name,
      aiProvider
    });
    try {
      process.stdout.write(import_chalk6.default.green("Agent: "));
      for await (const chunk of agent.chatStream(message)) {
        process.stdout.write(chunk);
      }
      console.log();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to get response");
    }
  });
}

// src/cli/commands/wallet.ts
var import_chalk7 = __toESM(require("chalk"));
function registerWalletCommands(program2) {
  const walletCmd = program2.command("wallet").description("Manage agent wallet");
  walletCmd.command("info").description("Show wallet information").action(async () => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const balance = await withSpinner("Fetching wallet info...", async () => {
        const response = await client.getBalance();
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch balance");
        }
        return response.data;
      });
      heading("Wallet Information");
      const data = [
        ["Address", agent.walletAddress],
        ["Balance", import_chalk7.default.green(formatEth(balance.balanceEth))],
        ["Network", "Base"]
      ];
      printTable(data, ["Field", "Value"]);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch wallet info");
    }
  });
  walletCmd.command("balance").description("Show wallet balance").action(async () => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      const balance = await withSpinner("Fetching balance...", async () => {
        const response = await client.getBalance();
        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to fetch balance");
        }
        return response.data;
      });
      console.log();
      console.log(import_chalk7.default.bold("Balance:"), import_chalk7.default.green(formatEth(balance.balanceEth)));
      console.log();
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch balance");
    }
  });
  walletCmd.command("address").description("Show wallet address").action(() => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    console.log();
    console.log(import_chalk7.default.bold("Wallet Address:"));
    console.log(agent.walletAddress);
    console.log();
    info("Send ETH to this address on Base network to fund your agent.");
  });
  walletCmd.command("history").description("Show transaction history").option("-t, --type <type>", "Filter by type: purchases, sales, all", "all").action(async (options) => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    try {
      const client = new MemoreumClient({ apiKey: agent.apiKey });
      let transactions = [];
      await withSpinner("Fetching transactions...", async () => {
        if (options.type === "all" || options.type === "purchases") {
          const purchaseResponse = await client.getPurchaseHistory();
          if (purchaseResponse.success && purchaseResponse.data) {
            transactions.push(
              ...purchaseResponse.data.map((t) => ({
                ...t,
                type: "Purchase"
              }))
            );
          }
        }
        if (options.type === "all" || options.type === "sales") {
          const salesResponse = await client.getSalesHistory();
          if (salesResponse.success && salesResponse.data) {
            transactions.push(
              ...salesResponse.data.map((t) => ({
                ...t,
                type: "Sale"
              }))
            );
          }
        }
      });
      if (transactions.length === 0) {
        info("No transactions found.");
        return;
      }
      transactions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      heading("Transaction History");
      const data = transactions.slice(0, 20).map((t) => [
        t.id.slice(0, 12) + "...",
        t.type === "Purchase" ? import_chalk7.default.red(t.type) : import_chalk7.default.green(t.type),
        formatEth(t.priceEth),
        t.status === "completed" ? import_chalk7.default.green(t.status) : import_chalk7.default.yellow(t.status),
        new Date(t.createdAt).toLocaleDateString()
      ]);
      printTable(data, ["ID", "Type", "Amount", "Status", "Date"]);
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to fetch transactions");
    }
  });
  walletCmd.command("fund").description("Instructions to fund your wallet").action(() => {
    const agent = getCurrentAgent();
    if (!agent) {
      error("No agent selected. Run `memoreum agent use <id>` first.");
      return;
    }
    heading("Fund Your Wallet");
    console.log(import_chalk7.default.bold("Your wallet address:"));
    console.log(import_chalk7.default.cyan(agent.walletAddress));
    console.log();
    console.log(import_chalk7.default.bold("To fund your agent wallet:"));
    console.log();
    console.log("1. Make sure you have ETH on Base network");
    console.log("2. Send ETH to the address above");
    console.log("3. Wait for the transaction to confirm");
    console.log();
    console.log(import_chalk7.default.bold("Need Base ETH?"));
    console.log("\u2022 Bridge from Ethereum: https://bridge.base.org");
    console.log("\u2022 Buy on exchanges that support Base");
    console.log("\u2022 Use a faucet for testnet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
    console.log();
    warn("Always verify the address before sending funds!");
  });
}

// src/cli/index.ts
var program = new import_commander.Command();
program.name("memoreum").description("Memoreum CLI - AI Agent Memory Marketplace on Base Chain").version("1.0.0").hook("preAction", () => {
});
registerConfigCommands(program);
registerAgentCommands(program);
registerMemoryCommands(program);
registerMarketplaceCommands(program);
registerChatCommands(program);
registerWalletCommands(program);
program.action(() => {
  printWelcome();
  console.log(import_chalk8.default.bold("Quick Start:"));
  console.log();
  console.log("  1. Setup your configuration:");
  console.log(import_chalk8.default.cyan("     memoreum config setup"));
  console.log();
  console.log("  2. Register a new agent:");
  console.log(import_chalk8.default.cyan("     memoreum agent register <name>"));
  console.log();
  console.log("  3. Start chatting:");
  console.log(import_chalk8.default.cyan("     memoreum chat"));
  console.log();
  console.log(import_chalk8.default.gray("Run `memoreum --help` for all commands."));
  console.log();
});
program.parse();
