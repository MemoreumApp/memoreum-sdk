import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { MemoreumClient } from '../../sdk/MemoreumClient.js';
import {
  getApiKey,
  getAgents,
  addAgent,
  removeAgent,
  setCurrentAgent,
  getCurrentAgent,
  getCurrentAgentId,
} from '../config.js';
import {
  success,
  error,
  info,
  warn,
  printTable,
  heading,
  withSpinner,
  formatDate,
} from '../utils.js';
import type { LocalAgentConfig } from '../../types/index.js';

export function registerAgentCommands(program: Command): void {
  const agentCmd = program
    .command('agent')
    .description('Manage Memoreum agents');

  // Register new agent
  agentCmd
    .command('register <name>')
    .description('Register a new agent on Memoreum')
    .action(async (name: string) => {
      const apiKey = getApiKey();
      if (!apiKey) {
        error('No API key configured. Run `memoreum config set-key <key>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey });
        
        const agent = await withSpinner('Registering agent...', async () => {
          const response = await client.registerAgent(name);
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to register agent');
          }
          return response.data;
        });

        // Save locally
        const localAgent: LocalAgentConfig = {
          id: agent.id,
          name: agent.agentName,
          apiKey: agent.apiKey,
          walletAddress: agent.walletAddress,
          createdAt: new Date().toISOString(),
        };
        addAgent(localAgent);
        setCurrentAgent(agent.id);

        success(`Agent "${name}" registered successfully!`);
        console.log();
        console.log(chalk.gray('Agent ID:'), agent.id);
        console.log(chalk.gray('API Key:'), agent.apiKey);
        console.log(chalk.gray('Wallet:'), agent.walletAddress);
        console.log();
        warn('Save your API key securely - it cannot be retrieved later!');
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to register agent');
      }
    });

  // List local agents
  agentCmd
    .command('list')
    .description('List locally saved agents')
    .action(() => {
      const agents = getAgents();
      const currentId = getCurrentAgentId();

      if (agents.length === 0) {
        info('No agents saved locally. Run `memoreum agent register <name>` to create one.');
        return;
      }

      heading('Local Agents');
      const data = agents.map((a) => [
        a.id === currentId ? chalk.green('*') : ' ',
        a.name,
        a.id.slice(0, 16) + '...',
        a.walletAddress.slice(0, 10) + '...',
        formatDate(a.createdAt),
      ]);
      printTable(data, ['', 'Name', 'ID', 'Wallet', 'Created']);
    });

  // Select agent
  agentCmd
    .command('use <idOrName>')
    .description('Select an agent to use')
    .action((idOrName: string) => {
      const agents = getAgents();
      const agent = agents.find(
        (a) => a.id === idOrName || a.id.startsWith(idOrName) || a.name === idOrName
      );

      if (!agent) {
        error(`Agent "${idOrName}" not found`);
        return;
      }

      setCurrentAgent(agent.id);
      success(`Now using agent "${agent.name}"`);
    });

  // Show current agent
  agentCmd
    .command('current')
    .description('Show currently selected agent')
    .action(() => {
      const agent = getCurrentAgent();
      
      if (!agent) {
        info('No agent selected. Run `memoreum agent use <id>` to select one.');
        return;
      }

      heading('Current Agent');
      const data = [
        ['Name', agent.name],
        ['ID', agent.id],
        ['Wallet', agent.walletAddress],
        ['API Key', '********' + agent.apiKey.slice(-8)],
        ['Created', formatDate(agent.createdAt)],
      ];
      printTable(data, ['Field', 'Value']);
    });

  // Get agent info from API
  agentCmd
    .command('info')
    .description('Get current agent info from Memoreum API')
    .action(async () => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const agentData = await withSpinner('Fetching agent info...', async () => {
          const response = await client.getAgent();
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch agent');
          }
          return response.data;
        });

        heading('Agent Info');
        const data = [
          ['Name', agentData.agentName],
          ['ID', agentData.id],
          ['Wallet', agentData.walletAddress],
          ['Reputation', `${(agentData.reputationScore * 100).toFixed(1)}%`],
          ['Total Sales', String(agentData.totalSales)],
          ['Total Purchases', String(agentData.totalPurchases)],
          ['Status', agentData.isActive ? chalk.green('Active') : chalk.red('Inactive')],
          ['Created', formatDate(agentData.createdAt)],
        ];
        printTable(data, ['Field', 'Value']);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to fetch agent');
      }
    });

  // Get agent stats
  agentCmd
    .command('stats')
    .description('Get agent statistics')
    .action(async () => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const stats = await withSpinner('Fetching stats...', async () => {
          const response = await client.getAgentStats();
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch stats');
          }
          return response.data;
        });

        heading('Agent Statistics');
        const data = [
          ['Memories Stored', String(stats.memoriesStored)],
          ['Memories Sold', String(stats.memoriesSold)],
          ['Memories Purchased', String(stats.memoriesPurchased)],
          ['Total Earnings', `${stats.totalEarnings} ETH`],
          ['Total Spent', `${stats.totalSpent} ETH`],
          ['Reputation', `${(stats.reputationScore * 100).toFixed(1)}%`],
        ];
        printTable(data, ['Metric', 'Value']);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to fetch stats');
      }
    });

  // Remove agent
  agentCmd
    .command('remove <idOrName>')
    .description('Remove an agent from local storage')
    .action(async (idOrName: string) => {
      const agents = getAgents();
      const agent = agents.find(
        (a) => a.id === idOrName || a.id.startsWith(idOrName) || a.name === idOrName
      );

      if (!agent) {
        error(`Agent "${idOrName}" not found`);
        return;
      }

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Remove agent "${agent.name}" from local storage?`,
          default: false,
        },
      ]);

      if (confirm) {
        removeAgent(agent.id);
        if (getCurrentAgentId() === agent.id) {
          setCurrentAgent(null);
        }
        success(`Agent "${agent.name}" removed`);
        warn('Note: This only removes from local storage, not from Memoreum.');
      }
    });

  // Import agent
  agentCmd
    .command('import')
    .description('Import an existing agent using API key')
    .action(async () => {
      const { apiKey } = await inquirer.prompt([
        {
          type: 'input',
          name: 'apiKey',
          message: 'Enter agent API key:',
          validate: (input: string) => input.length > 0 || 'API key is required',
        },
      ]);

      try {
        const client = new MemoreumClient({ apiKey });
        
        const agentData = await withSpinner('Importing agent...', async () => {
          const response = await client.getAgent();
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Invalid API key');
          }
          return response.data;
        });

        // Check if already exists
        const existing = getAgents().find((a) => a.id === agentData.id);
        if (existing) {
          warn(`Agent "${agentData.agentName}" already exists locally`);
          return;
        }

        const localAgent: LocalAgentConfig = {
          id: agentData.id,
          name: agentData.agentName,
          apiKey: apiKey,
          walletAddress: agentData.walletAddress,
          createdAt: new Date().toISOString(),
        };
        addAgent(localAgent);
        setCurrentAgent(agentData.id);

        success(`Agent "${agentData.agentName}" imported successfully!`);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to import agent');
      }
    });
}
