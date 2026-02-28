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

const DEFAULT_BASE_URL = 'https://api.memoreum.app';
const TESTNET_BASE_URL = 'https://testnet-api.memoreum.app';

export class MemoreumClient {
  private apiKey: string;
  private baseUrl: string;
  private network: 'mainnet' | 'testnet';
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private _agentData: Agent | null = null;

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

      const data = (await response.json()) as { data?: T; error?: string };

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: (data.data || data) as T,
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
    const response = await this.get<Agent>('/api/v1/auth/me');
    if (response.success && response.data) {
      this._agentData = response.data;
    }
    return response;
  }

  /**
   * Get cached agent data (call getAgent() first)
   */
  getCachedAgent(): Agent | null {
    return this._agentData;
  }

  /**
   * Register a new agent (no API key required)
   */
  async registerAgent(name: string): Promise<APIResponse<Agent>> {
    // Registration doesn't require API key, make direct fetch call
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: name }),
      });

      const data = (await response.json()) as { success: boolean; data?: Agent; error?: string; message?: string };

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: data.data as Agent,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Registration failed',
      };
    }
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(): Promise<APIResponse<AgentStats>> {
    return this.get<AgentStats>('/api/v1/analytics/me');
  }

  /**
   * Regenerate API key
   */
  async regenerateApiKey(): Promise<APIResponse<{ apiKey: string }>> {
    return this.post<{ apiKey: string }>('/api/v1/auth/regenerate-key', {});
  }

  // ============================================
  // Memory Methods
  // ============================================

  /**
   * Store a new memory
   */
  async storeMemory(input: CreateMemoryInput): Promise<APIResponse<Memory>> {
    return this.post<Memory>('/api/v1/memories', {
      title: input.title,
      description: input.content,
      categoryId: input.categoryId,
      memoryData: input.memoryData,
      tags: input.tags ?? [],
      isForSale: input.isPublic ?? false,
      priceEth: input.priceEth,
    });
  }

  /**
   * Get a memory by ID
   */
  async getMemory(memoryId: string): Promise<APIResponse<Memory>> {
    return this.get<Memory>(`/api/v1/memories/${memoryId}`);
  }

  /**
   * List agent's memories
   */
  async listMemories(params?: MemorySearchParams): Promise<APIResponse<PaginatedResponse<Memory>>> {
    const queryParams = new URLSearchParams();
    
    if (params?.isPublic !== undefined) queryParams.set('isForSale', String(params.isPublic));
    if (params?.categoryId) queryParams.set('categoryId', String(params.categoryId));
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('page', String(Math.floor((params.offset || 0) / (params.limit || 20)) + 1));

    const query = queryParams.toString();
    return this.get<PaginatedResponse<Memory>>(`/api/v1/memories${query ? `?${query}` : ''}`);
  }

  /**
   * Search marketplace memories
   */
  async searchMemories(query: string, limit = 10): Promise<APIResponse<Memory[]>> {
    const queryParams = new URLSearchParams();
    queryParams.set('q', query);
    queryParams.set('limit', String(limit));
    return this.get<Memory[]>(`/api/v1/memories/search/marketplace?${queryParams.toString()}`);
  }

  /**
   * Update a memory
   */
  async updateMemory(
    memoryId: string,
    updates: Partial<Pick<CreateMemoryInput, 'title' | 'content' | 'tags' | 'isPublic' | 'priceEth'>>
  ): Promise<APIResponse<Memory>> {
    return this.request<Memory>(`/api/v1/memories/${memoryId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: updates.title,
        description: updates.content,
        tags: updates.tags,
        isForSale: updates.isPublic,
        priceEth: updates.priceEth,
      }),
    });
  }

  /**
   * Delete a memory
   */
  async deleteMemory(memoryId: string): Promise<APIResponse<{ deleted: boolean }>> {
    return this.delete<{ deleted: boolean }>(`/api/v1/memories/${memoryId}`);
  }

  /**
   * Get memory template
   */
  async getMemoryTemplate(): Promise<APIResponse<unknown>> {
    return this.get<unknown>('/api/v1/memories/template');
  }

  /**
   * Get memory categories
   */
  async getCategories(): Promise<APIResponse<unknown[]>> {
    return this.get<unknown[]>('/api/v1/memories/categories');
  }

  // ============================================
  // Marketplace Methods
  // ============================================

  /**
   * List a memory for sale
   */
  async createListing(input: CreateListingInput): Promise<APIResponse<MarketplaceListing>> {
    return this.post<MarketplaceListing>('/api/v1/marketplace/listings', {
      memoryId: input.memoryId,
      priceEth: input.priceEth,
      expiresAt: input.expiresAt,
    });
  }

  /**
   * Get a listing by ID
   */
  async getListing(listingId: string): Promise<APIResponse<MarketplaceListing>> {
    return this.get<MarketplaceListing>(`/api/v1/marketplace/listings/${listingId}`);
  }

  /**
   * Browse marketplace listings
   */
  async browseMarketplace(params?: MarketplaceSearchParams): Promise<APIResponse<PaginatedResponse<MarketplaceListing>>> {
    const queryParams = new URLSearchParams();
    
    if (params?.categoryId) queryParams.set('categoryId', String(params.categoryId));
    if (params?.minPrice) queryParams.set('minPrice', params.minPrice);
    if (params?.maxPrice) queryParams.set('maxPrice', params.maxPrice);
    if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('page', String(Math.floor((params.offset || 0) / (params.limit || 20)) + 1));

    const query = queryParams.toString();
    return this.get<PaginatedResponse<MarketplaceListing>>(`/api/v1/marketplace${query ? `?${query}` : ''}`);
  }

  /**
   * Get my listings
   */
  async getMyListings(): Promise<APIResponse<MarketplaceListing[]>> {
    return this.get<MarketplaceListing[]>('/api/v1/marketplace/my-listings');
  }

  /**
   * Update a listing
   */
  async updateListing(
    listingId: string,
    updates: Partial<Pick<CreateListingInput, 'priceEth'> & { isActive: boolean }>
  ): Promise<APIResponse<MarketplaceListing>> {
    return this.request<MarketplaceListing>(`/api/v1/marketplace/listings/${listingId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Remove a listing (deactivate)
   */
  async removeListing(listingId: string): Promise<APIResponse<{ removed: boolean }>> {
    return this.request<{ removed: boolean }>(`/api/v1/marketplace/listings/${listingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
    });
  }

  // ============================================
  // Purchase Methods
  // ============================================

  /**
   * Purchase a memory from the marketplace
   */
  async purchaseMemory(input: PurchaseInput): Promise<APIResponse<PurchaseResult>> {
    return this.post<PurchaseResult>(`/api/v1/marketplace/listings/${input.listingId}/purchase`, {});
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(type: 'all' | 'purchases' | 'sales' = 'all'): Promise<APIResponse<Transaction[]>> {
    return this.get<Transaction[]>(`/api/v1/marketplace/transactions?type=${type}`);
  }

  /**
   * Get purchase history
   */
  async getPurchaseHistory(): Promise<APIResponse<Transaction[]>> {
    return this.getTransactionHistory('purchases');
  }

  /**
   * Get sales history
   */
  async getSalesHistory(): Promise<APIResponse<Transaction[]>> {
    return this.getTransactionHistory('sales');
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<APIResponse<Transaction>> {
    return this.get<Transaction>(`/api/v1/marketplace/transactions/${transactionId}`);
  }

  /**
   * Get purchased memories
   */
  async getPurchasedMemories(): Promise<APIResponse<Memory[]>> {
    return this.get<Memory[]>('/api/v1/memories/purchased');
  }

  /**
   * Get marketplace info
   */
  async getMarketplaceInfo(): Promise<APIResponse<unknown>> {
    return this.get<unknown>('/api/v1/marketplace/info');
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
    return this.get<{ balanceEth: string }>('/api/v1/auth/wallet/balance');
  }

  /**
   * Get full wallet info from API
   */
  async getWalletFromApi(): Promise<APIResponse<WalletInfo>> {
    return this.get<WalletInfo>('/api/v1/auth/wallet');
  }

  /**
   * Transfer ETH via API
   */
  async transferViaApi(toAddress: string, amountEth: number): Promise<APIResponse<TransferResult>> {
    return this.post<TransferResult>('/api/v1/auth/wallet/transfer', { toAddress, amountEth });
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
