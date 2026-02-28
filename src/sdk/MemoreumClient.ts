import { ethers } from 'ethers';
import type {
  MemoreumConfig,
  Agent,
  AgentStats,
  Memory,
  CreateMemoryInput,
  MemorySearchParams,
  MarketplaceListing,
  CreateListingInput,
  MarketplaceSearchParams,
  Transaction,
  PurchaseInput,
  PurchaseResult,
  WalletInfo,
  TransferInput,
  TransferResult,
  APIResponse,
  PaginatedResponse,
} from '../types/index.js';

const DEFAULT_BASE_URL = 'https://api.memoreum.space';
const TESTNET_BASE_URL = 'https://testnet-api.memoreum.space';

export class MemoreumClient {
  private apiKey: string;
  private baseUrl: string;
  private network: 'mainnet' | 'testnet';
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private agentData: Agent | null = null;

  constructor(config: MemoreumConfig) {
    this.apiKey = config.apiKey;
    this.network = config.network || 'mainnet';
    this.baseUrl = config.baseUrl || (this.network === 'testnet' ? TESTNET_BASE_URL : DEFAULT_BASE_URL);
  }

  // ============================================
  // HTTP Methods
  // ============================================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...((options.headers as Record<string, string>) || {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async get<T>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  private async post<T>(endpoint: string, body: unknown): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async put<T>(endpoint: string, body: unknown): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private async delete<T>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ============================================
  // Agent Methods
  // ============================================

  /**
   * Get the current agent's profile
   */
  async getAgent(): Promise<APIResponse<Agent>> {
    const response = await this.get<Agent>('/api/agent/me');
    if (response.success && response.data) {
      this.agentData = response.data;
    }
    return response;
  }

  /**
   * Register a new agent
   */
  async registerAgent(name: string): Promise<APIResponse<Agent>> {
    return this.post<Agent>('/api/agents/register', { agentName: name });
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(): Promise<APIResponse<AgentStats>> {
    return this.get<AgentStats>('/api/agent/stats');
  }

  /**
   * Update agent profile
   */
  async updateAgent(updates: Partial<Pick<Agent, 'agentName' | 'isActive'>>): Promise<APIResponse<Agent>> {
    return this.put<Agent>('/api/agent/me', updates);
  }

  // ============================================
  // Memory Methods
  // ============================================

  /**
   * Store a new memory
   */
  async storeMemory(input: CreateMemoryInput): Promise<APIResponse<Memory>> {
    return this.post<Memory>('/api/memories', {
      memory_type: input.memoryType,
      title: input.title,
      content: input.content,
      importance: input.importance ?? 0.5,
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
      is_public: input.isPublic ?? false,
      store_on_chain: input.storeOnChain ?? false,
    });
  }

  /**
   * Get a memory by ID
   */
  async getMemory(memoryId: string): Promise<APIResponse<Memory>> {
    return this.get<Memory>(`/api/memories/${memoryId}`);
  }

  /**
   * List agent's memories
   */
  async listMemories(params?: MemorySearchParams): Promise<APIResponse<PaginatedResponse<Memory>>> {
    const queryParams = new URLSearchParams();
    
    if (params?.query) queryParams.set('query', params.query);
    if (params?.memoryType) queryParams.set('memory_type', params.memoryType);
    if (params?.tags?.length) queryParams.set('tags', params.tags.join(','));
    if (params?.minImportance) queryParams.set('min_importance', String(params.minImportance));
    if (params?.isPublic !== undefined) queryParams.set('is_public', String(params.isPublic));
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('offset', String(params.offset));

    const query = queryParams.toString();
    return this.get<PaginatedResponse<Memory>>(`/api/memories${query ? `?${query}` : ''}`);
  }

  /**
   * Search memories semantically
   */
  async searchMemories(query: string, limit = 10): Promise<APIResponse<Memory[]>> {
    return this.post<Memory[]>('/api/memories/search', { query, limit });
  }

  /**
   * Update a memory
   */
  async updateMemory(
    memoryId: string,
    updates: Partial<Pick<CreateMemoryInput, 'title' | 'content' | 'importance' | 'tags' | 'isPublic'>>
  ): Promise<APIResponse<Memory>> {
    return this.put<Memory>(`/api/memories/${memoryId}`, updates);
  }

  /**
   * Delete a memory
   */
  async deleteMemory(memoryId: string): Promise<APIResponse<{ deleted: boolean }>> {
    return this.delete<{ deleted: boolean }>(`/api/memories/${memoryId}`);
  }

  // ============================================
  // Marketplace Methods
  // ============================================

  /**
   * List a memory for sale
   */
  async createListing(input: CreateListingInput): Promise<APIResponse<MarketplaceListing>> {
    return this.post<MarketplaceListing>('/api/marketplace/listings', {
      memory_id: input.memoryId,
      price_eth: input.priceEth,
      expires_in_days: input.expiresInDays,
    });
  }

  /**
   * Get a listing by ID
   */
  async getListing(listingId: string): Promise<APIResponse<MarketplaceListing>> {
    return this.get<MarketplaceListing>(`/api/marketplace/listings/${listingId}`);
  }

  /**
   * Browse marketplace listings
   */
  async browseMarketplace(params?: MarketplaceSearchParams): Promise<APIResponse<PaginatedResponse<MarketplaceListing>>> {
    const queryParams = new URLSearchParams();
    
    if (params?.query) queryParams.set('query', params.query);
    if (params?.memoryType) queryParams.set('memory_type', params.memoryType);
    if (params?.minPrice) queryParams.set('min_price', params.minPrice);
    if (params?.maxPrice) queryParams.set('max_price', params.maxPrice);
    if (params?.sellerId) queryParams.set('seller_id', params.sellerId);
    if (params?.tags?.length) queryParams.set('tags', params.tags.join(','));
    if (params?.sortBy) queryParams.set('sort_by', params.sortBy);
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('offset', String(params.offset));

    const query = queryParams.toString();
    return this.get<PaginatedResponse<MarketplaceListing>>(`/api/marketplace/listings${query ? `?${query}` : ''}`);
  }

  /**
   * Get my listings
   */
  async getMyListings(): Promise<APIResponse<MarketplaceListing[]>> {
    return this.get<MarketplaceListing[]>('/api/marketplace/my-listings');
  }

  /**
   * Update a listing
   */
  async updateListing(
    listingId: string,
    updates: Partial<Pick<CreateListingInput, 'priceEth'> & { isActive: boolean }>
  ): Promise<APIResponse<MarketplaceListing>> {
    return this.put<MarketplaceListing>(`/api/marketplace/listings/${listingId}`, updates);
  }

  /**
   * Remove a listing
   */
  async removeListing(listingId: string): Promise<APIResponse<{ removed: boolean }>> {
    return this.delete<{ removed: boolean }>(`/api/marketplace/listings/${listingId}`);
  }

  // ============================================
  // Purchase Methods
  // ============================================

  /**
   * Purchase a memory from the marketplace
   */
  async purchaseMemory(input: PurchaseInput): Promise<APIResponse<PurchaseResult>> {
    return this.post<PurchaseResult>('/api/marketplace/purchase', {
      listing_id: input.listingId,
    });
  }

  /**
   * Get purchase history
   */
  async getPurchaseHistory(): Promise<APIResponse<Transaction[]>> {
    return this.get<Transaction[]>('/api/transactions/purchases');
  }

  /**
   * Get sales history
   */
  async getSalesHistory(): Promise<APIResponse<Transaction[]>> {
    return this.get<Transaction[]>('/api/transactions/sales');
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<APIResponse<Transaction>> {
    return this.get<Transaction>(`/api/transactions/${transactionId}`);
  }

  /**
   * Get purchased memories
   */
  async getPurchasedMemories(): Promise<APIResponse<Memory[]>> {
    return this.get<Memory[]>('/api/memories/purchased');
  }

  // ============================================
  // Wallet Methods
  // ============================================

  /**
   * Initialize wallet with private key
   */
  async initializeWallet(privateKey: string): Promise<void> {
    const rpcUrl = this.network === 'mainnet' 
      ? 'https://mainnet.base.org'
      : 'https://sepolia.base.org';
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Get wallet information
   */
  async getWalletInfo(): Promise<APIResponse<WalletInfo>> {
    if (!this.wallet || !this.provider) {
      return { success: false, error: 'Wallet not initialized. Call initializeWallet() first.' };
    }

    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      const network = await this.provider.getNetwork();

      return {
        success: true,
        data: {
          address: this.wallet.address,
          balanceEth: ethers.formatEther(balance),
          balanceWei: balance.toString(),
          network: network.name,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get wallet info',
      };
    }
  }

  /**
   * Transfer ETH
   */
  async transfer(input: TransferInput): Promise<APIResponse<TransferResult>> {
    if (!this.wallet) {
      return { success: false, error: 'Wallet not initialized. Call initializeWallet() first.' };
    }

    try {
      const tx = await this.wallet.sendTransaction({
        to: input.to,
        value: ethers.parseEther(input.amountEth),
      });

      const receipt = await tx.wait();

      return {
        success: true,
        data: {
          txHash: tx.hash,
          from: this.wallet.address,
          to: input.to,
          amountEth: input.amountEth,
          gasUsed: receipt?.gasUsed.toString() || '0',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }

  /**
   * Get wallet balance from API
   */
  async getBalance(): Promise<APIResponse<{ balanceEth: string }>> {
    return this.get<{ balanceEth: string }>('/api/wallet/balance');
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Generate content hash for a memory
   */
  generateContentHash(content: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(content));
  }

  /**
   * Verify API key is valid
   */
  async verifyApiKey(): Promise<boolean> {
    const response = await this.getAgent();
    return response.success;
  }

  /**
   * Get the current network
   */
  getNetwork(): 'mainnet' | 'testnet' {
    return this.network;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }
}

export default MemoreumClient;
