import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import {
  getConfig,
  setApiKey,
  setNetwork,
  setBaseUrl,
  getAIProviders,
  setAIProvider,
  removeAIProvider,
  setDefaultAIProvider,
  clearConfig,
} from '../config.js';
import { success, error, info, printTable, heading, printBox } from '../utils.js';
import type { AIProvider } from '../../types/index.js';

const AI_PROVIDERS: AIProvider[] = ['openai', 'anthropic', 'google', 'groq', 'together', 'ollama', 'deepseek', 'mistral'];

export function registerConfigCommands(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage Memoreum CLI configuration');

  // Show current config
  configCmd
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const config = getConfig();
      
      heading('Current Configuration');
      
      const configData = [
        ['API Key', config.apiKey ? '********' + config.apiKey.slice(-8) : chalk.gray('Not set')],
        ['Network', config.network],
        ['Base URL', config.baseUrl],
      ];
      
      printTable(configData, ['Setting', 'Value']);
      
      const providers = getAIProviders();
      if (Object.keys(providers).length > 0) {
        heading('AI Providers');
        const providerData = Object.entries(providers).map(([name, p]) => [
          name,
          p.provider,
          p.model || 'default',
          '********' + p.apiKey.slice(-4),
        ]);
        printTable(providerData, ['Name', 'Provider', 'Model', 'API Key']);
      }
    });

  // Set API key
  configCmd
    .command('set-key <apiKey>')
    .description('Set your Memoreum API key')
    .action((apiKey: string) => {
      setApiKey(apiKey);
      success('API key saved successfully');
    });

  // Set network
  configCmd
    .command('network <network>')
    .description('Set network (mainnet or testnet)')
    .action((network: string) => {
      if (network !== 'mainnet' && network !== 'testnet') {
        error('Network must be "mainnet" or "testnet"');
        return;
      }
      setNetwork(network);
      success(`Network set to ${network}`);
    });

  // Set base URL
  configCmd
    .command('url <url>')
    .description('Set custom API base URL')
    .action((url: string) => {
      setBaseUrl(url);
      success(`Base URL set to ${url}`);
    });

  // Add AI provider
  configCmd
    .command('add-provider')
    .description('Add an AI provider configuration')
    .action(async () => {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Configuration name (e.g., "default", "fast", "smart"):',
          default: 'default',
        },
        {
          type: 'list',
          name: 'provider',
          message: 'Select AI provider:',
          choices: AI_PROVIDERS,
        },
        {
          type: 'input',
          name: 'apiKey',
          message: 'Enter your API key:',
          validate: (input: string) => input.length > 0 || 'API key is required',
        },
        {
          type: 'input',
          name: 'model',
          message: 'Model name (leave empty for default):',
        },
        {
          type: 'number',
          name: 'temperature',
          message: 'Temperature (0-2):',
          default: 0.7,
        },
        {
          type: 'number',
          name: 'maxTokens',
          message: 'Max tokens:',
          default: 4096,
        },
      ]);

      setAIProvider(answers.name, {
        provider: answers.provider,
        apiKey: answers.apiKey,
        model: answers.model || undefined,
        temperature: answers.temperature,
        maxTokens: answers.maxTokens,
      });

      success(`AI provider "${answers.name}" configured successfully`);
    });

  // Remove AI provider
  configCmd
    .command('remove-provider <name>')
    .description('Remove an AI provider configuration')
    .action((name: string) => {
      const providers = getAIProviders();
      if (!providers[name]) {
        error(`Provider "${name}" not found`);
        return;
      }
      removeAIProvider(name);
      success(`Provider "${name}" removed`);
    });

  // List AI providers
  configCmd
    .command('providers')
    .description('List configured AI providers')
    .action(() => {
      const providers = getAIProviders();
      
      if (Object.keys(providers).length === 0) {
        info('No AI providers configured. Run `memoreum config add-provider` to add one.');
        return;
      }

      heading('Configured AI Providers');
      const data = Object.entries(providers).map(([name, p]) => [
        name,
        p.provider,
        p.model || 'default',
        String(p.temperature ?? 0.7),
        String(p.maxTokens ?? 4096),
      ]);
      printTable(data, ['Name', 'Provider', 'Model', 'Temperature', 'Max Tokens']);
    });

  // Reset config
  configCmd
    .command('reset')
    .description('Reset all configuration')
    .action(async () => {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to reset all configuration?',
          default: false,
        },
      ]);

      if (confirm) {
        clearConfig();
        success('Configuration reset');
      }
    });

  // Quick setup
  configCmd
    .command('setup')
    .description('Interactive setup wizard')
    .action(async () => {
      printBox(
        'Welcome to Memoreum CLI Setup!\n\n' +
        'This wizard will help you configure:\n' +
        '• Your Memoreum API key\n' +
        '• AI provider (OpenAI, Claude, etc.)\n' +
        '• Network settings',
        'Setup Wizard'
      );

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'apiKey',
          message: 'Enter your Memoreum API key:',
          validate: (input: string) => input.length > 0 || 'API key is required',
        },
        {
          type: 'list',
          name: 'network',
          message: 'Select network:',
          choices: ['mainnet', 'testnet'],
          default: 'mainnet',
        },
        {
          type: 'confirm',
          name: 'setupAI',
          message: 'Would you like to configure an AI provider now?',
          default: true,
        },
      ]);

      setApiKey(answers.apiKey);
      setNetwork(answers.network);

      if (answers.setupAI) {
        const aiAnswers = await inquirer.prompt([
          {
            type: 'list',
            name: 'provider',
            message: 'Select AI provider:',
            choices: AI_PROVIDERS,
          },
          {
            type: 'input',
            name: 'aiApiKey',
            message: 'Enter your AI provider API key:',
            validate: (input: string) => input.length > 0 || 'API key is required',
          },
        ]);

        setDefaultAIProvider({
          provider: aiAnswers.provider,
          apiKey: aiAnswers.aiApiKey,
        });
      }

      success('Setup complete! You can now use Memoreum CLI.');
      info('Run `memoreum --help` to see available commands.');
    });
}
