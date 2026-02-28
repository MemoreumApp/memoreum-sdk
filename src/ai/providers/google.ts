import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import {
  BaseAIProvider,
  AIProviderError,
  type Message,
  type CompletionOptions,
  type CompletionResult,
  type StreamChunk,
} from '../base.js';
import type { AIProvider } from '../../types/index.js';

export class GoogleProvider extends BaseAIProvider {
  readonly providerName: AIProvider = 'google';
  readonly supportedModels = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-pro',
  ];
  readonly defaultModel = 'gemini-1.5-flash';

  private client: GoogleGenerativeAI;

  constructor(apiKey: string, model?: string, temperature?: number, maxTokens?: number) {
    super(apiKey, model, temperature, maxTokens);
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private convertMessages(messages: Message[]): { history: Array<{ role: string; parts: Array<{ text: string }> }>; systemInstruction?: string; latestMessage: string } {
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');
    
    // Gemini expects alternating user/model messages
    const history = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const latestMessage = chatMessages[chatMessages.length - 1]?.content || '';

    return {
      history,
      systemInstruction: systemMessage?.content,
      latestMessage,
    };
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    try {
      const { history, systemInstruction, latestMessage } = this.convertMessages(messages);

      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
        generationConfig: {
          temperature: options?.temperature ?? this.defaultTemperature,
          maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
          stopSequences: options?.stopSequences,
        },
      });

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(latestMessage);
      const response = result.response;

      return {
        content: response.text(),
        model: this.model,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
        finishReason: response.candidates?.[0]?.finishReason || 'STOP',
      };
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        this.providerName
      );
    }
  }

  async *stream(
    messages: Message[],
    options?: CompletionOptions
  ): AsyncGenerator<StreamChunk> {
    try {
      const { history, systemInstruction, latestMessage } = this.convertMessages(messages);

      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction,
        generationConfig: {
          temperature: options?.temperature ?? this.defaultTemperature,
          maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
          stopSequences: options?.stopSequences,
        },
      });

      const chat = model.startChat({ history });
      const result = await chat.sendMessageStream(latestMessage);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        yield { content: text, done: false };
      }
      
      yield { content: '', done: true };
    } catch (error) {
      throw new AIProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        this.providerName
      );
    }
  }
}
