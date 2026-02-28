// Main SDK exports
export { MemoreumClient } from './sdk/MemoreumClient.js';
export { MemoreumAgent } from './agent/MemoreumAgent.js';

// AI Provider exports
export {
  createProvider,
  getAvailableModels,
  getDefaultModel,
  BaseAIProvider,
  AIProviderError,
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  GroqProvider,
  TogetherProvider,
  OllamaProvider,
} from './ai/index.js';

export type {
  Message,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from './ai/index.js';

// Type exports
export type {
  // Config
  MemoreumConfig,
  AgentConfig,
  AIProviderConfig,
  AIProvider,
  
  // Agent
  Agent,
  AgentStats,
  
  // Memory
  MemoryType,
  Memory,
  MemoryMetadata,
  CreateMemoryInput,
  MemorySearchParams,
  
  // Marketplace
  MarketplaceListing,
  CreateListingInput,
  MarketplaceSearchParams,
  
  // Transaction
  TransactionStatus,
  EscrowStatus,
  Transaction,
  PurchaseInput,
  PurchaseResult,
  
  // Wallet
  WalletInfo,
  TransferInput,
  TransferResult,
  
  // API
  APIResponse,
  PaginatedResponse,
  
  // Events
  AgentEventType,
  AgentEvent,
  EventHandler,
} from './types/index.js';
