import Conf from 'conf';
import type { CLIConfig, LocalAgentConfig, AIProviderConfig } from '../types/index.js';

const config = new Conf<{
  config: CLIConfig;
  agents: LocalAgentConfig[];
  currentAgent: string | null;
  aiProviders: Record<string, AIProviderConfig>;
}>({
  projectName: 'memoreum',
  defaults: {
    config: {
      baseUrl: 'https://api.memoreum.space',
      network: 'mainnet',
    },
    agents: [],
    currentAgent: null,
    aiProviders: {},
  },
});

export function getConfig(): CLIConfig {
  return config.get('config');
}

export function setConfig(updates: Partial<CLIConfig>): void {
  const current = getConfig();
  config.set('config', { ...current, ...updates });
}

export function getApiKey(): string | undefined {
  return getConfig().apiKey;
}

export function setApiKey(apiKey: string): void {
  setConfig({ apiKey });
}

export function getBaseUrl(): string {
  return getConfig().baseUrl;
}

export function setBaseUrl(url: string): void {
  setConfig({ baseUrl: url });
}

export function getNetwork(): 'mainnet' | 'testnet' {
  return getConfig().network;
}

export function setNetwork(network: 'mainnet' | 'testnet'): void {
  setConfig({ network });
}

// Agent management
export function getAgents(): LocalAgentConfig[] {
  return config.get('agents');
}

export function addAgent(agent: LocalAgentConfig): void {
  const agents = getAgents();
  agents.push(agent);
  config.set('agents', agents);
}

export function removeAgent(agentId: string): void {
  const agents = getAgents().filter((a) => a.id !== agentId);
  config.set('agents', agents);
}

export function getCurrentAgentId(): string | null {
  return config.get('currentAgent');
}

export function setCurrentAgent(agentId: string | null): void {
  config.set('currentAgent', agentId);
}

export function getCurrentAgent(): LocalAgentConfig | null {
  const currentId = getCurrentAgentId();
  if (!currentId) return null;
  return getAgents().find((a) => a.id === currentId) || null;
}

// AI Provider management
export function getAIProviders(): Record<string, AIProviderConfig> {
  return config.get('aiProviders');
}

export function setAIProvider(name: string, providerConfig: AIProviderConfig): void {
  const providers = getAIProviders();
  providers[name] = providerConfig;
  config.set('aiProviders', providers);
}

export function getAIProvider(name: string): AIProviderConfig | undefined {
  return getAIProviders()[name];
}

export function removeAIProvider(name: string): void {
  const providers = getAIProviders();
  delete providers[name];
  config.set('aiProviders', providers);
}

export function getDefaultAIProvider(): AIProviderConfig | undefined {
  const providers = getAIProviders();
  return providers['default'] || Object.values(providers)[0];
}

export function setDefaultAIProvider(providerConfig: AIProviderConfig): void {
  setAIProvider('default', providerConfig);
}

// Clear all config
export function clearConfig(): void {
  config.clear();
}

export default config;
