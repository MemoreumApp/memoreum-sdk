import type { AIProvider } from '../types/index.js';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface CompletionResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export abstract class BaseAIProvider {
  protected apiKey: string;
  protected model: string;
  protected defaultTemperature: number;
  protected defaultMaxTokens: number;

  abstract readonly providerName: AIProvider;
  abstract readonly supportedModels: string[];
  abstract readonly defaultModel: string;

  constructor(
    apiKey: string,
    model?: string,
    temperature = 0.7,
    maxTokens = 4096
  ) {
    this.apiKey = apiKey;
    this.model = model || this.defaultModel;
    this.defaultTemperature = temperature;
    this.defaultMaxTokens = maxTokens;
  }

  abstract complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult>;

  abstract stream(
    messages: Message[],
    options?: CompletionOptions
  ): AsyncGenerator<StreamChunk>;

  getModel(): string {
    return this.model;
  }

  setModel(model: string): void {
    if (!this.supportedModels.includes(model)) {
      console.warn(`Model ${model} may not be supported by ${this.providerName}`);
    }
    this.model = model;
  }

  validateApiKey(): boolean {
    return this.apiKey.length > 0;
  }
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public statusCode?: number
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'AIProviderError';
  }
}
