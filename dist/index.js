"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AIProviderError: () => AIProviderError,
  AnthropicProvider: () => AnthropicProvider,
  BaseAIProvider: () => BaseAIProvider,
  GoogleProvider: () => GoogleProvider,
  GroqProvider: () => GroqProvider,
  MemoreumAgent: () => MemoreumAgent,
  MemoreumClient: () => MemoreumClient,
  OllamaProvider: () => OllamaProvider,
  OpenAIProvider: () => OpenAIProvider,
  TogetherProvider: () => TogetherProvider,
  createProvider: () => createProvider,
  getAvailableModels: () => getAvailableModels,
  getDefaultModel: () => getDefaultModel
});
module.exports = __toCommonJS(index_exports);

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
  constructor(config) {
    this.apiKey = config.apiKey;
    this.network = config.network || "mainnet";
    this.baseUrl = config.baseUrl || (this.network === "testnet" ? TESTNET_BASE_URL : DEFAULT_BASE_URL);
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
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
  async put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
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
    const response = await this.get("/api/agent/me");
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
   * Register a new agent
   */
  async registerAgent(name) {
    return this.post("/api/agents/register", { agentName: name });
  }
  /**
   * Get agent statistics
   */
  async getAgentStats() {
    return this.get("/api/agent/stats");
  }
  /**
   * Update agent profile
   */
  async updateAgent(updates) {
    return this.put("/api/agent/me", updates);
  }
  // ============================================
  // Memory Methods
  // ============================================
  /**
   * Store a new memory
   */
  async storeMemory(input) {
    return this.post("/api/memories", {
      memory_type: input.memoryType,
      title: input.title,
      content: input.content,
      importance: input.importance ?? 0.5,
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
      is_public: input.isPublic ?? false,
      store_on_chain: input.storeOnChain ?? false
    });
  }
  /**
   * Get a memory by ID
   */
  async getMemory(memoryId) {
    return this.get(`/api/memories/${memoryId}`);
  }
  /**
   * List agent's memories
   */
  async listMemories(params) {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.set("query", params.query);
    if (params?.memoryType) queryParams.set("memory_type", params.memoryType);
    if (params?.tags?.length) queryParams.set("tags", params.tags.join(","));
    if (params?.minImportance) queryParams.set("min_importance", String(params.minImportance));
    if (params?.isPublic !== void 0) queryParams.set("is_public", String(params.isPublic));
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.offset) queryParams.set("offset", String(params.offset));
    const query = queryParams.toString();
    return this.get(`/api/memories${query ? `?${query}` : ""}`);
  }
  /**
   * Search memories semantically
   */
  async searchMemories(query, limit = 10) {
    return this.post("/api/memories/search", { query, limit });
  }
  /**
   * Update a memory
   */
  async updateMemory(memoryId, updates) {
    return this.put(`/api/memories/${memoryId}`, updates);
  }
  /**
   * Delete a memory
   */
  async deleteMemory(memoryId) {
    return this.delete(`/api/memories/${memoryId}`);
  }
  // ============================================
  // Marketplace Methods
  // ============================================
  /**
   * List a memory for sale
   */
  async createListing(input) {
    return this.post("/api/marketplace/listings", {
      memory_id: input.memoryId,
      price_eth: input.priceEth,
      expires_in_days: input.expiresInDays
    });
  }
  /**
   * Get a listing by ID
   */
  async getListing(listingId) {
    return this.get(`/api/marketplace/listings/${listingId}`);
  }
  /**
   * Browse marketplace listings
   */
  async browseMarketplace(params) {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.set("query", params.query);
    if (params?.memoryType) queryParams.set("memory_type", params.memoryType);
    if (params?.minPrice) queryParams.set("min_price", params.minPrice);
    if (params?.maxPrice) queryParams.set("max_price", params.maxPrice);
    if (params?.sellerId) queryParams.set("seller_id", params.sellerId);
    if (params?.tags?.length) queryParams.set("tags", params.tags.join(","));
    if (params?.sortBy) queryParams.set("sort_by", params.sortBy);
    if (params?.limit) queryParams.set("limit", String(params.limit));
    if (params?.offset) queryParams.set("offset", String(params.offset));
    const query = queryParams.toString();
    return this.get(`/api/marketplace/listings${query ? `?${query}` : ""}`);
  }
  /**
   * Get my listings
   */
  async getMyListings() {
    return this.get("/api/marketplace/my-listings");
  }
  /**
   * Update a listing
   */
  async updateListing(listingId, updates) {
    return this.put(`/api/marketplace/listings/${listingId}`, updates);
  }
  /**
   * Remove a listing
   */
  async removeListing(listingId) {
    return this.delete(`/api/marketplace/listings/${listingId}`);
  }
  // ============================================
  // Purchase Methods
  // ============================================
  /**
   * Purchase a memory from the marketplace
   */
  async purchaseMemory(input) {
    return this.post("/api/marketplace/purchase", {
      listing_id: input.listingId
    });
  }
  /**
   * Get purchase history
   */
  async getPurchaseHistory() {
    return this.get("/api/transactions/purchases");
  }
  /**
   * Get sales history
   */
  async getSalesHistory() {
    return this.get("/api/transactions/sales");
  }
  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId) {
    return this.get(`/api/transactions/${transactionId}`);
  }
  /**
   * Get purchased memories
   */
  async getPurchasedMemories() {
    return this.get("/api/memories/purchased");
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get wallet info"
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transfer failed"
      };
    }
  }
  /**
   * Get wallet balance from API
   */
  async getBalance() {
    return this.get("/api/wallet/balance");
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
        const error = await res.text();
        throw new Error(`OpenAI API error: ${error}`);
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
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
        const error = await res.text();
        throw new Error(`OpenAI API error: ${error}`);
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
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
        const error = await res.text();
        throw new Error(`Anthropic API error: ${error}`);
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
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
        const error = await res.text();
        throw new Error(`Anthropic API error: ${error}`);
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
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
        const error = await res.text();
        throw new Error(`Google AI API error: ${error}`);
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
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
        const error = await res.text();
        throw new Error(`Google AI API error: ${error}`);
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
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
        const error = await res.text();
        throw new Error(`Groq API error: ${error}`);
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
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
        const error = await res.text();
        throw new Error(`Groq API error: ${error}`);
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
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
        const error = await res.text();
        throw new Error(`Together API error: ${error}`);
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
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
        const error = await res.text();
        throw new Error(`Together API error: ${error}`);
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
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
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : "Unknown error",
        this.providerName
      );
    }
  }
};

// src/ai/index.ts
function createProvider(config) {
  const { provider, apiKey, model, temperature, maxTokens } = config;
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
function getAvailableModels(provider) {
  const models = {
    openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "o1-preview", "o1-mini"],
    anthropic: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
    google: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-pro"],
    groq: ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    together: ["meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1", "Qwen/Qwen2.5-72B-Instruct-Turbo"],
    ollama: ["llama3.2", "llama3.1", "mistral", "mixtral", "codellama", "phi3", "gemma2", "qwen2.5"],
    deepseek: ["deepseek-chat", "deepseek-coder"],
    mistral: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "codestral-latest"]
  };
  return models[provider] || [];
}
function getDefaultModel(provider) {
  const defaults = {
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-sonnet-20241022",
    google: "gemini-1.5-flash",
    groq: "llama-3.3-70b-versatile",
    together: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    ollama: "llama3.2",
    deepseek: "deepseek-chat",
    mistral: "mistral-large-latest"
  };
  return defaults[provider] || "gpt-4o-mini";
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
  constructor(memoreumApiKey, config) {
    this.config = config;
    this.client = new MemoreumClient({ apiKey: memoreumApiKey });
    this.aiProvider = createProvider(config.aiProvider);
    this.conversationHistory.push({
      role: "system",
      content: config.systemPrompt || DEFAULT_SYSTEM_PROMPT
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
      } catch (error) {
        console.error("Event handler error:", error);
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
    } catch (error) {
      this.emit({
        type: "agent:error",
        timestamp: /* @__PURE__ */ new Date(),
        data: { error }
      });
      throw error;
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
    } catch (error) {
      this.emit({
        type: "agent:error",
        timestamp: /* @__PURE__ */ new Date(),
        data: { error }
      });
      throw error;
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
    } catch (error) {
      console.error("Failed to auto-store interaction:", error);
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
      } catch (error) {
        this.emit({
          type: "agent:error",
          timestamp: /* @__PURE__ */ new Date(),
          data: { error }
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AIProviderError,
  AnthropicProvider,
  BaseAIProvider,
  GoogleProvider,
  GroqProvider,
  MemoreumAgent,
  MemoreumClient,
  OllamaProvider,
  OpenAIProvider,
  TogetherProvider,
  createProvider,
  getAvailableModels,
  getDefaultModel
});
