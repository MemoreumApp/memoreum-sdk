import {
  BaseAIProvider,
  AIProviderError,
  type Message,
  type CompletionOptions,
  type CompletionResult,
  type StreamChunk,
} from '../base.js';
import type { AIProvider } from '../../types/index.js';

const GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GoogleContent {
  role: string;
  parts: { text: string }[];
}

interface GoogleResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

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

  private convertMessages(messages: Message[]): { contents: GoogleContent[]; systemInstruction?: { parts: { text: string }[] } } {
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const contents = chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    return {
      contents,
      systemInstruction: systemMessage
        ? { parts: [{ text: systemMessage.content }] }
        : undefined,
    };
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    try {
      const { contents, systemInstruction } = this.convertMessages(messages);
      const url = `${GOOGLE_API_URL}/${this.model}:generateContent?key=${this.apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            temperature: options?.temperature ?? this.defaultTemperature,
            maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
            stopSequences: options?.stopSequences,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Google AI API error: ${error}`);
      }

      const response = (await res.json()) as GoogleResponse;
      const candidate = response.candidates[0];
      const text = candidate?.content?.parts?.map((p) => p.text).join('') || '';

      return {
        content: text,
        model: this.model,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
        finishReason: candidate?.finishReason || 'STOP',
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
      const { contents, systemInstruction } = this.convertMessages(messages);
      const url = `${GOOGLE_API_URL}/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: {
            temperature: options?.temperature ?? this.defaultTemperature,
            maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
            stopSequences: options?.stopSequences,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Google AI API error: ${error}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data) as GoogleResponse;
              const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
              const isDone = parsed.candidates?.[0]?.finishReason === 'STOP';
              yield { content: text, done: isDone };
            } catch {
              // Skip invalid JSON
            }
          }
        }
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
