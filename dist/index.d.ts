import { z } from 'zod';

interface MemoreumConfig {
    apiKey: string;
    baseUrl?: string;
    network?: 'mainnet' | 'testnet';
}
interface AgentConfig {
    name: string;
    description?: string;
    aiProvider: AIProviderConfig;
    walletPrivateKey?: string;
    autoStore?: boolean;
    systemPrompt?: string;
}
interface AIProviderConfig {
    provider: AIProvider;
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}
type AIProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'together' | 'ollama' | 'deepseek' | 'mistral';
interface Agent {
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
interface AgentStats {
    memoriesStored: number;
    memoriesSold: number;
    memoriesPurchased: number;
    totalEarnings: string;
    totalSpent: string;
    reputationScore: number;
}
declare const MemoryTypeSchema: z.ZodEnum<["conversation", "experience", "knowledge", "transaction", "observation", "decision", "learning", "error", "success", "interaction"]>;
type MemoryType = z.infer<typeof MemoryTypeSchema>;
interface Memory {
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
interface MemoryMetadata {
    source?: string;
    context?: string;
    relatedMemories?: string[];
    confidence?: number;
    tokens?: number;
    model?: string;
    duration?: number;
    [key: string]: unknown;
}
interface CreateMemoryInput {
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
interface MemorySearchParams {
    query?: string;
    memoryType?: MemoryType;
    categoryId?: number;
    tags?: string[];
    minImportance?: number;
    isPublic?: boolean;
    limit?: number;
    offset?: number;
}
interface MarketplaceListing {
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
interface CreateListingInput {
    memoryId: string;
    priceEth: string;
    expiresAt?: string;
    expiresInDays?: number;
}
interface MarketplaceSearchParams {
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
type TransactionStatus = 'pending' | 'payment_received' | 'processing' | 'completed' | 'failed' | 'refunded' | 'disputed';
type EscrowStatus = 'pending' | 'funded' | 'released' | 'refunded' | 'completed';
interface Transaction {
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
interface PurchaseInput {
    listingId: string;
}
interface PurchaseResult {
    transaction: Transaction;
    memory: Memory;
    txHash: string;
}
interface WalletInfo {
    address: string;
    balanceEth: string;
    balanceWei: string;
    network: string;
}
interface TransferInput {
    to: string;
    amountEth: string;
}
interface TransferResult {
    txHash: string;
    from: string;
    to: string;
    amountEth: string;
    gasUsed: string;
}
interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
type AgentEventType = 'memory:created' | 'memory:updated' | 'memory:deleted' | 'listing:created' | 'listing:sold' | 'purchase:completed' | 'wallet:transfer' | 'agent:thinking' | 'agent:response' | 'agent:error';
interface AgentEvent {
    type: AgentEventType;
    timestamp: Date;
    data: unknown;
}
type EventHandler = (event: AgentEvent) => void | Promise<void>;

declare class MemoreumClient {
    private apiKey;
    private baseUrl;
    private network;
    private provider;
    private wallet;
    private _agentData;
    constructor(config: MemoreumConfig);
    private request;
    private get;
    private post;
    private delete;
    /**
     * Get the current agent's profile
     */
    getAgent(): Promise<APIResponse<Agent>>;
    /**
     * Get cached agent data (call getAgent() first)
     */
    getCachedAgent(): Agent | null;
    /**
     * Register a new agent (no API key required)
     */
    registerAgent(name: string): Promise<APIResponse<Agent>>;
    /**
     * Get agent statistics
     */
    getAgentStats(): Promise<APIResponse<AgentStats>>;
    /**
     * Regenerate API key
     */
    regenerateApiKey(): Promise<APIResponse<{
        apiKey: string;
    }>>;
    /**
     * Store a new memory
     */
    storeMemory(input: CreateMemoryInput): Promise<APIResponse<Memory>>;
    /**
     * Get a memory by ID
     */
    getMemory(memoryId: string): Promise<APIResponse<Memory>>;
    /**
     * List agent's memories
     */
    listMemories(params?: MemorySearchParams): Promise<APIResponse<PaginatedResponse<Memory>>>;
    /**
     * Search marketplace memories
     */
    searchMemories(query: string, limit?: number): Promise<APIResponse<Memory[]>>;
    /**
     * Update a memory
     */
    updateMemory(memoryId: string, updates: Partial<Pick<CreateMemoryInput, 'title' | 'content' | 'tags' | 'isPublic' | 'priceEth'>>): Promise<APIResponse<Memory>>;
    /**
     * Delete a memory
     */
    deleteMemory(memoryId: string): Promise<APIResponse<{
        deleted: boolean;
    }>>;
    /**
     * Get memory template
     */
    getMemoryTemplate(): Promise<APIResponse<unknown>>;
    /**
     * Get memory categories
     */
    getCategories(): Promise<APIResponse<unknown[]>>;
    /**
     * List a memory for sale
     */
    createListing(input: CreateListingInput): Promise<APIResponse<MarketplaceListing>>;
    /**
     * Get a listing by ID
     */
    getListing(listingId: string): Promise<APIResponse<MarketplaceListing>>;
    /**
     * Browse marketplace listings
     */
    browseMarketplace(params?: MarketplaceSearchParams): Promise<APIResponse<PaginatedResponse<MarketplaceListing>>>;
    /**
     * Get my listings
     */
    getMyListings(): Promise<APIResponse<MarketplaceListing[]>>;
    /**
     * Update a listing
     */
    updateListing(listingId: string, updates: Partial<Pick<CreateListingInput, 'priceEth'> & {
        isActive: boolean;
    }>): Promise<APIResponse<MarketplaceListing>>;
    /**
     * Remove a listing (deactivate)
     */
    removeListing(listingId: string): Promise<APIResponse<{
        removed: boolean;
    }>>;
    /**
     * Purchase a memory from the marketplace
     */
    purchaseMemory(input: PurchaseInput): Promise<APIResponse<PurchaseResult>>;
    /**
     * Get transaction history
     */
    getTransactionHistory(type?: 'all' | 'purchases' | 'sales'): Promise<APIResponse<Transaction[]>>;
    /**
     * Get purchase history
     */
    getPurchaseHistory(): Promise<APIResponse<Transaction[]>>;
    /**
     * Get sales history
     */
    getSalesHistory(): Promise<APIResponse<Transaction[]>>;
    /**
     * Get transaction by ID
     */
    getTransaction(transactionId: string): Promise<APIResponse<Transaction>>;
    /**
     * Get purchased memories
     */
    getPurchasedMemories(): Promise<APIResponse<Memory[]>>;
    /**
     * Get marketplace info
     */
    getMarketplaceInfo(): Promise<APIResponse<unknown>>;
    /**
     * Initialize wallet with private key
     */
    initializeWallet(privateKey: string): Promise<void>;
    /**
     * Get wallet information
     */
    getWalletInfo(): Promise<APIResponse<WalletInfo>>;
    /**
     * Transfer ETH
     */
    transfer(input: TransferInput): Promise<APIResponse<TransferResult>>;
    /**
     * Get wallet balance from API
     */
    getBalance(): Promise<APIResponse<{
        balanceEth: string;
    }>>;
    /**
     * Get full wallet info from API
     */
    getWalletFromApi(): Promise<APIResponse<WalletInfo>>;
    /**
     * Transfer ETH via API
     */
    transferViaApi(toAddress: string, amountEth: number): Promise<APIResponse<TransferResult>>;
    /**
     * Generate content hash for a memory
     */
    generateContentHash(content: string): string;
    /**
     * Verify API key is valid
     */
    verifyApiKey(): Promise<boolean>;
    /**
     * Get the current network
     */
    getNetwork(): 'mainnet' | 'testnet';
    /**
     * Get wallet address
     */
    getWalletAddress(): string | null;
}

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
interface CompletionOptions {
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
}
interface CompletionResult {
    content: string;
    model: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: string;
}
interface StreamChunk {
    content: string;
    done: boolean;
}
declare abstract class BaseAIProvider {
    protected apiKey: string;
    protected _model: string | undefined;
    protected defaultTemperature: number;
    protected defaultMaxTokens: number;
    abstract readonly providerName: AIProvider;
    abstract readonly supportedModels: string[];
    abstract readonly defaultModel: string;
    constructor(apiKey: string, model?: string, temperature?: number, maxTokens?: number);
    protected get model(): string;
    protected set model(value: string);
    abstract complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
    abstract stream(messages: Message[], options?: CompletionOptions): AsyncGenerator<StreamChunk>;
    getModel(): string;
    setModel(model: string): void;
    validateApiKey(): boolean;
}
declare class AIProviderError extends Error {
    provider: AIProvider;
    statusCode?: number | undefined;
    constructor(message: string, provider: AIProvider, statusCode?: number | undefined);
}

declare class OpenAIProvider extends BaseAIProvider {
    readonly providerName: AIProvider;
    readonly supportedModels: string[];
    readonly defaultModel = "gpt-4o-mini";
    complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
    stream(messages: Message[], options?: CompletionOptions): AsyncGenerator<StreamChunk>;
}

declare class AnthropicProvider extends BaseAIProvider {
    readonly providerName: AIProvider;
    readonly supportedModels: string[];
    readonly defaultModel = "claude-3-5-sonnet-20241022";
    complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
    stream(messages: Message[], options?: CompletionOptions): AsyncGenerator<StreamChunk>;
}

declare class GoogleProvider extends BaseAIProvider {
    readonly providerName: AIProvider;
    readonly supportedModels: string[];
    readonly defaultModel = "gemini-1.5-flash";
    private convertMessages;
    complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
    stream(messages: Message[], options?: CompletionOptions): AsyncGenerator<StreamChunk>;
}

declare class GroqProvider extends BaseAIProvider {
    readonly providerName: AIProvider;
    readonly supportedModels: string[];
    readonly defaultModel = "llama-3.3-70b-versatile";
    complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
    stream(messages: Message[], options?: CompletionOptions): AsyncGenerator<StreamChunk>;
}

declare class TogetherProvider extends BaseAIProvider {
    readonly providerName: AIProvider;
    readonly supportedModels: string[];
    readonly defaultModel = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";
    complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
    stream(messages: Message[], options?: CompletionOptions): AsyncGenerator<StreamChunk>;
}

declare class OllamaProvider extends BaseAIProvider {
    readonly providerName: AIProvider;
    readonly supportedModels: string[];
    readonly defaultModel = "llama3.2";
    private baseUrl;
    constructor(apiKey: string, model?: string, temperature?: number, maxTokens?: number);
    complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
    stream(messages: Message[], options?: CompletionOptions): AsyncGenerator<StreamChunk>;
}

/**
 * Create an AI provider instance from configuration
 */
declare function createProvider(config: AIProviderConfig): BaseAIProvider;
/**
 * Get available models for a provider
 */
declare function getAvailableModels(provider: AIProvider): string[];
/**
 * Get default model for a provider
 */
declare function getDefaultModel(provider: AIProvider): string;

declare class MemoreumAgent {
    private client;
    private aiProvider;
    private config;
    private conversationHistory;
    private eventHandlers;
    private isRunning;
    constructor(memoreumApiKey: string, config: AgentConfig);
    on(event: string, handler: EventHandler): void;
    off(event: string, handler: EventHandler): void;
    private emit;
    /**
     * Send a message and get a response
     */
    chat(message: string): Promise<string>;
    /**
     * Stream a chat response
     */
    chatStream(message: string): AsyncGenerator<string>;
    private retrieveRelevantMemories;
    private buildContextualMessages;
    private shouldStoreInteraction;
    private storeInteraction;
    /**
     * Store a memory
     */
    storeMemory(input: CreateMemoryInput): Promise<Memory | null>;
    /**
     * Get agent's memories
     */
    getMemories(limit?: number): Promise<Memory[]>;
    /**
     * Search memories
     */
    searchMemories(query: string, limit?: number): Promise<Memory[]>;
    /**
     * Browse marketplace
     */
    browseMarketplace(limit?: number): Promise<MarketplaceListing[]>;
    /**
     * Purchase a memory
     */
    purchaseMemory(listingId: string): Promise<boolean>;
    /**
     * List a memory for sale
     */
    listMemory(memoryId: string, priceEth: string): Promise<boolean>;
    /**
     * Clear conversation history
     */
    clearHistory(): void;
    /**
     * Get conversation history
     */
    getHistory(): Message[];
    /**
     * Update system prompt
     */
    setSystemPrompt(prompt: string): void;
    /**
     * Get the underlying client
     */
    getClient(): MemoreumClient;
    /**
     * Get current model
     */
    getModel(): string;
    /**
     * Change model
     */
    setModel(model: string): void;
    /**
     * Start autonomous operation loop
     */
    startAutonomous(taskFn: (agent: MemoreumAgent) => Promise<void>, intervalMs?: number): Promise<void>;
    /**
     * Stop autonomous operation
     */
    stop(): void;
    /**
     * Check if agent is running autonomously
     */
    isAutonomous(): boolean;
}

export { type AIProvider, type AIProviderConfig, AIProviderError, type APIResponse, type Agent, type AgentConfig, type AgentEvent, type AgentEventType, type AgentStats, AnthropicProvider, BaseAIProvider, type CompletionOptions, type CompletionResult, type CreateListingInput, type CreateMemoryInput, type EscrowStatus, type EventHandler, GoogleProvider, GroqProvider, type MarketplaceListing, type MarketplaceSearchParams, MemoreumAgent, MemoreumClient, type MemoreumConfig, type Memory, type MemoryMetadata, type MemorySearchParams, type MemoryType, type Message, OllamaProvider, OpenAIProvider, type PaginatedResponse, type PurchaseInput, type PurchaseResult, type StreamChunk, TogetherProvider, type Transaction, type TransactionStatus, type TransferInput, type TransferResult, type WalletInfo, createProvider, getAvailableModels, getDefaultModel };
