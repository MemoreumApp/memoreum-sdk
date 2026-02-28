import { BaseAIProvider, AIProviderError } from './base.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { GoogleProvider } from './providers/google.js';
import { GroqProvider } from './providers/groq.js';
import { TogetherProvider } from './providers/together.js';
import { OllamaProvider } from './providers/ollama.js';
import type { AIProvider, AIProviderConfig } from '../types/index.js';

export {
  BaseAIProvider,
  AIProviderError,
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  GroqProvider,
  TogetherProvider,
  OllamaProvider,
};

export type { Message, CompletionOptions, CompletionResult, StreamChunk } from './base.js';

/**
 * Create an AI provider instance from configuration
 */
export function createProvider(config: AIProviderConfig): BaseAIProvider {
  const { provider, apiKey, model, temperature, maxTokens } = config;

  switch (provider) {
    case 'openai':
      return new OpenAIProvider(apiKey, model, temperature, maxTokens);
    
    case 'anthropic':
      return new AnthropicProvider(apiKey, model, temperature, maxTokens);
    
    case 'google':
      return new GoogleProvider(apiKey, model, temperature, maxTokens);
    
    case 'groq':
      return new GroqProvider(apiKey, model, temperature, maxTokens);
    
    case 'together':
      return new TogetherProvider(apiKey, model, temperature, maxTokens);
    
    case 'ollama':
      return new OllamaProvider(apiKey, model, temperature, maxTokens);
    
    case 'deepseek':
      // DeepSeek uses OpenAI-compatible API
      return new OpenAIProvider(apiKey, model || 'deepseek-chat', temperature, maxTokens);
    
    case 'mistral':
      // Mistral uses OpenAI-compatible API
      return new OpenAIProvider(apiKey, model || 'mistral-large-latest', temperature, maxTokens);
    
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Get available models for a provider
 */
export function getAvailableModels(provider: AIProvider): string[] {
  const models: Record<AIProvider, string[]> = {
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1-preview', 'o1-mini'],
    anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-pro'],
    groq: ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    together: ['meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'mistralai/Mixtral-8x22B-Instruct-v0.1', 'Qwen/Qwen2.5-72B-Instruct-Turbo'],
    ollama: ['llama3.2', 'llama3.1', 'mistral', 'mixtral', 'codellama', 'phi3', 'gemma2', 'qwen2.5'],
    deepseek: ['deepseek-chat', 'deepseek-coder'],
    mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest'],
  };

  return models[provider] || [];
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: AIProvider): string {
  const defaults: Record<AIProvider, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-sonnet-20241022',
    google: 'gemini-1.5-flash',
    groq: 'llama-3.3-70b-versatile',
    together: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    ollama: 'llama3.2',
    deepseek: 'deepseek-chat',
    mistral: 'mistral-large-latest',
  };

  return defaults[provider] || 'gpt-4o-mini';
}
