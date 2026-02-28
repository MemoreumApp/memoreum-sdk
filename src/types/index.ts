import { z } from 'zod';

// ============================================
// Configuration Types
// ============================================

export interface MemoreumConfig {
  apiKey: string;
  baseUrl?: string;
  network?: 'mainnet' | 'testnet';
}

export interface AgentConfig {
  name: string;
  description?: string;
  aiProvider: AIProviderConfig;
  walletPrivateKey?: string;
  autoStore?: boolean;
  systemPrompt?: string;
}

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export type AIProvider = 
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'together'
  | 'ollama'
  | 'deepseek'
  | 'mistral';

// ============================================
// Agent Types
// ============================================

export interface Agent {
  id: string;
  agentName: string;
  apiKey: string;
  walletAddress: string;
  walletPrivateKey: string;
  walletMnemonic: string;
  reputationScore: number;
  totalSales: number;
  totalPurchases: number;
  isActive: boolean;
  createdAt: Date;
}

export interface AgentStats {
  memoriesStored: number;
  memoriesSold: number;
  memoriesPurchased: number;
  totalEarnings: string;
  totalSpent: string;
  reputationScore: number;
}

// ============================================
// Memory Types
// ============================================

export const MemoryTypeSchema = z.enum([
  'conversation',
  'experience',
  'knowledge',
  'transaction',
  'observation',
  'decision',
  'learning',
  'error',
  'success',
  'interaction'
]);

export type MemoryType = z.infer<typeof MemoryTypeSchema>;

export interface Memory {
  id: string;
  agentId: string;
  memoryType: MemoryType;
  title: string;
  content: string;
  contentHash: string;
  embedding?: number[];
  importance: number;
  tags: string[];
  metadata: MemoryMetadata;
  isPublic: boolean;
  ipfsHash?: string;
  onChainTxHash?: string;
  onChainTokenId?: number;
  totalSold: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryMetadata {
  source?: string;
  context?: string;
  relatedMemories?: string[];
  confidence?: number;
  tokens?: number;
  model?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface CreateMemoryInput {
  memoryType?: MemoryType;
  title: string;
  content: string;
  categoryId?: number;
  memoryData?: unknown;
  importance?: number;
  tags?: string[];
  metadata?: MemoryMetadata;
  isPublic?: boolean;
  priceEth?: number;
  storeOnChain?: boolean;
}

export interface MemorySearchParams {
  query?: string;
  memoryType?: MemoryType;
  categoryId?: number;
  tags?: string[];
  minImportance?: number;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================
// Marketplace Types
// ============================================

export interface MarketplaceListing {
  id: string;
  memoryId: string;
  sellerId: string;
  priceEth: string;
  isActive: boolean;
  views: number;
  listedAt: Date;
  expiresAt?: Date;
  memory?: Memory;
  seller?: {
    agentName: string;
    reputationScore: number;
  };
}

export interface CreateListingInput {
  memoryId: string;
  priceEth: string;
  expiresAt?: string;
  expiresInDays?: number;
}

export interface MarketplaceSearchParams {
  query?: string;
  memoryType?: MemoryType;
  categoryId?: number;
  minPrice?: string;
  maxPrice?: string;
  sellerId?: string;
  tags?: string[];
  sortBy?: 'newest' | 'price_low' | 'price_high' | 'popular';
  limit?: number;
  offset?: number;
}

// ============================================
// Transaction Types
// ============================================

export type TransactionStatus = 
  | 'pending'
  | 'payment_received'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'disputed';

export type EscrowStatus =
  | 'pending'
  | 'funded'
  | 'released'
  | 'refunded'
  | 'completed';

export interface Transaction {
  id: string;
  listingId: string;
  memoryId: string;
  sellerId: string;
  buyerId: string;
  priceEth: string;
  platformFeeEth: string;
  sellerReceivesEth: string;
  escrowStatus: EscrowStatus;
  buyerToPlatformTxHash?: string;
  platformToSellerTxHash?: string;
  status: TransactionStatus;
  createdAt: Date;
  completedAt?: Date;
}

export interface PurchaseInput {
  listingId: string;
}

export interface PurchaseResult {
  transaction: Transaction;
  memory: Memory;
  txHash: string;
}

// ============================================
// Wallet Types
// ============================================

export interface WalletInfo {
  address: string;
  balanceEth: string;
  balanceWei: string;
  network: string;
}

export interface TransferInput {
  to: string;
  amountEth: string;
}

export interface TransferResult {
  txHash: string;
  from: string;
  to: string;
  amountEth: string;
  gasUsed: string;
}

// ============================================
// API Response Types
// ============================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// Event Types
// ============================================

export type AgentEventType =
  | 'memory:created'
  | 'memory:updated'
  | 'memory:deleted'
  | 'listing:created'
  | 'listing:sold'
  | 'purchase:completed'
  | 'wallet:transfer'
  | 'agent:thinking'
  | 'agent:response'
  | 'agent:error';

export interface AgentEvent {
  type: AgentEventType;
  timestamp: Date;
  data: unknown;
}

export type EventHandler = (event: AgentEvent) => void | Promise<void>;

// ============================================
// CLI Config Types
// ============================================

export interface CLIConfig {
  apiKey?: string;
  agentId?: string;
  baseUrl: string;
  network: 'mainnet' | 'testnet';
  aiProvider?: AIProviderConfig;
  defaultModel?: string;
}

export interface LocalAgentConfig {
  id: string;
  name: string;
  apiKey: string;
  walletAddress: string;
  createdAt: string;
}
