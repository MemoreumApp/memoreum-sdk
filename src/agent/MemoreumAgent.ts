import { MemoreumClient } from '../sdk/MemoreumClient.js';
import { createProvider, type Message, type BaseAIProvider } from '../ai/index.js';
import type {
  AgentConfig,
  Memory,
  CreateMemoryInput,
  MarketplaceListing,
  AgentEvent,
  EventHandler,
} from '../types/index.js';

const DEFAULT_SYSTEM_PROMPT = `You are an autonomous AI agent operating on the Memoreum network - a decentralized marketplace for AI agent memories on Base Chain.

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

export class MemoreumAgent {
  private client: MemoreumClient;
  private aiProvider: BaseAIProvider;
  private config: AgentConfig;
  private conversationHistory: Message[] = [];
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private isRunning = false;

  constructor(memoreumApiKey: string, config: AgentConfig) {
    this.config = config;
    this.client = new MemoreumClient({ apiKey: memoreumApiKey });
    this.aiProvider = createProvider(config.aiProvider);

    // Initialize with system prompt
    this.conversationHistory.push({
      role: 'system',
      content: config.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    });
  }

  // ============================================
  // Event System
  // ============================================

  on(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.eventHandlers.set(event, handlers);
    }
  }

  private emit(event: AgentEvent): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    const allHandlers = this.eventHandlers.get('*') || [];
    
    [...handlers, ...allHandlers].forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    });
  }

  // ============================================
  // Chat Methods
  // ============================================

  /**
   * Send a message and get a response
   */
  async chat(message: string): Promise<string> {
    this.emit({
      type: 'agent:thinking',
      timestamp: new Date(),
      data: { message },
    });

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message,
    });

    // Retrieve relevant memories to augment context
    const relevantMemories = await this.retrieveRelevantMemories(message);
    
    // Build context-aware messages
    const messagesWithContext = this.buildContextualMessages(relevantMemories);

    try {
      const result = await this.aiProvider.complete(messagesWithContext);
      
      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: result.content,
      });

      this.emit({
        type: 'agent:response',
        timestamp: new Date(),
        data: {
          response: result.content,
          usage: result.usage,
          model: result.model,
        },
      });

      // Auto-store if enabled
      if (this.config.autoStore && this.shouldStoreInteraction(message, result.content)) {
        await this.storeInteraction(message, result.content);
      }

      return result.content;
    } catch (error) {
      this.emit({
        type: 'agent:error',
        timestamp: new Date(),
        data: { error },
      });
      throw error;
    }
  }

  /**
   * Stream a chat response
   */
  async *chatStream(message: string): AsyncGenerator<string> {
    this.emit({
      type: 'agent:thinking',
      timestamp: new Date(),
      data: { message },
    });

    this.conversationHistory.push({
      role: 'user',
      content: message,
    });

    const relevantMemories = await this.retrieveRelevantMemories(message);
    const messagesWithContext = this.buildContextualMessages(relevantMemories);

    let fullResponse = '';

    try {
      for await (const chunk of this.aiProvider.stream(messagesWithContext)) {
        fullResponse += chunk.content;
        yield chunk.content;
      }

      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
      });

      this.emit({
        type: 'agent:response',
        timestamp: new Date(),
        data: { response: fullResponse },
      });

      if (this.config.autoStore && this.shouldStoreInteraction(message, fullResponse)) {
        await this.storeInteraction(message, fullResponse);
      }
    } catch (error) {
      this.emit({
        type: 'agent:error',
        timestamp: new Date(),
        data: { error },
      });
      throw error;
    }
  }

  // ============================================
  // Memory Management
  // ============================================

  private async retrieveRelevantMemories(query: string): Promise<Memory[]> {
    try {
      const response = await this.client.searchMemories(query, 5);
      return response.success ? (response.data || []) : [];
    } catch {
      return [];
    }
  }

  private buildContextualMessages(memories: Memory[]): Message[] {
    const messages = [...this.conversationHistory];
    
    if (memories.length > 0) {
      const memoryContext = memories
        .map((m) => `[Memory: ${m.title}]\n${m.content}`)
        .join('\n\n');

      // Insert memory context before the last user message
      const lastUserIndex = messages.length - 1;
      messages.splice(lastUserIndex, 0, {
        role: 'system',
        content: `Relevant memories from your knowledge base:\n\n${memoryContext}`,
      });
    }

    return messages;
  }

  private shouldStoreInteraction(userMessage: string, assistantResponse: string): boolean {
    // Simple heuristics for deciding whether to store
    const totalLength = userMessage.length + assistantResponse.length;
    const hasSubstance = totalLength > 200;
    const isQuestion = userMessage.includes('?');
    const hasLearning = /learn|understand|realize|insight|important|remember/i.test(assistantResponse);
    
    return hasSubstance && (isQuestion || hasLearning);
  }

  private async storeInteraction(userMessage: string, assistantResponse: string): Promise<void> {
    try {
      await this.storeMemory({
        memoryType: 'conversation',
        title: userMessage.slice(0, 100),
        content: `User: ${userMessage}\n\nAssistant: ${assistantResponse}`,
        importance: 0.5,
        tags: ['conversation', 'auto-stored'],
        metadata: {
          source: 'chat',
          model: this.aiProvider.getModel(),
        },
      });
    } catch (error) {
      console.error('Failed to auto-store interaction:', error);
    }
  }

  /**
   * Store a memory
   */
  async storeMemory(input: CreateMemoryInput): Promise<Memory | null> {
    const response = await this.client.storeMemory(input);
    
    if (response.success && response.data) {
      this.emit({
        type: 'memory:created',
        timestamp: new Date(),
        data: response.data,
      });
      return response.data;
    }

    return null;
  }

  /**
   * Get agent's memories
   */
  async getMemories(limit = 20): Promise<Memory[]> {
    const response = await this.client.listMemories({ limit });
    return response.success ? (response.data?.items || []) : [];
  }

  /**
   * Search memories
   */
  async searchMemories(query: string, limit = 10): Promise<Memory[]> {
    const response = await this.client.searchMemories(query, limit);
    return response.success ? (response.data || []) : [];
  }

  // ============================================
  // Marketplace Methods
  // ============================================

  /**
   * Browse marketplace
   */
  async browseMarketplace(limit = 20): Promise<MarketplaceListing[]> {
    const response = await this.client.browseMarketplace({ limit });
    return response.success ? (response.data?.items || []) : [];
  }

  /**
   * Purchase a memory
   */
  async purchaseMemory(listingId: string): Promise<boolean> {
    const response = await this.client.purchaseMemory({ listingId });
    
    if (response.success) {
      this.emit({
        type: 'purchase:completed',
        timestamp: new Date(),
        data: response.data,
      });
      return true;
    }

    return false;
  }

  /**
   * List a memory for sale
   */
  async listMemory(memoryId: string, priceEth: string): Promise<boolean> {
    const response = await this.client.createListing({ memoryId, priceEth });
    
    if (response.success) {
      this.emit({
        type: 'listing:created',
        timestamp: new Date(),
        data: response.data,
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
  clearHistory(): void {
    this.conversationHistory = [this.conversationHistory[0]]; // Keep system prompt
  }

  /**
   * Get conversation history
   */
  getHistory(): Message[] {
    return [...this.conversationHistory];
  }

  /**
   * Update system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.conversationHistory[0] = {
      role: 'system',
      content: prompt,
    };
  }

  /**
   * Get the underlying client
   */
  getClient(): MemoreumClient {
    return this.client;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.aiProvider.getModel();
  }

  /**
   * Change model
   */
  setModel(model: string): void {
    this.aiProvider.setModel(model);
  }

  // ============================================
  // Autonomous Loop (Optional)
  // ============================================

  /**
   * Start autonomous operation loop
   */
  async startAutonomous(
    taskFn: (agent: MemoreumAgent) => Promise<void>,
    intervalMs = 60000
  ): Promise<void> {
    this.isRunning = true;

    while (this.isRunning) {
      try {
        await taskFn(this);
      } catch (error) {
        this.emit({
          type: 'agent:error',
          timestamp: new Date(),
          data: { error },
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
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Check if agent is running autonomously
   */
  isAutonomous(): boolean {
    return this.isRunning;
  }
}

export default MemoreumAgent;
