import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { MemoreumClient } from '../../sdk/MemoreumClient.js';
import { getCurrentAgent } from '../config.js';
import {
  success,
  error,
  info,
  printTable,
  heading,
  withSpinner,
  formatDate,
  truncate,
} from '../utils.js';
import type { MemoryType } from '../../types/index.js';

const MEMORY_TYPES: MemoryType[] = [
  'conversation',
  'experience',
  'knowledge',
  'transaction',
  'observation',
  'decision',
  'learning',
  'error',
  'success',
  'interaction',
];

export function registerMemoryCommands(program: Command): void {
  const memoryCmd = program
    .command('memory')
    .description('Manage agent memories');

  // Store a memory
  memoryCmd
    .command('store')
    .description('Store a new memory')
    .option('-t, --title <title>', 'Memory title')
    .option('-c, --content <content>', 'Memory content')
    .option('--type <type>', 'Memory type')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--public', 'Make memory public')
    .option('--importance <n>', 'Importance (0-1)', parseFloat)
    .action(async (options) => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      let { title, content, type, tags, importance } = options;
      const isPublic = options.public || false;

      // Interactive mode if not all required options provided
      if (!title || !content) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'title',
            message: 'Memory title:',
            when: !title,
            validate: (input: string) => input.length > 0 || 'Title is required',
          },
          {
            type: 'editor',
            name: 'content',
            message: 'Memory content (opens editor):',
            when: !content,
            validate: (input: string) => input.length > 0 || 'Content is required',
          },
          {
            type: 'list',
            name: 'type',
            message: 'Memory type:',
            choices: MEMORY_TYPES,
            when: !type,
            default: 'knowledge',
          },
          {
            type: 'input',
            name: 'tags',
            message: 'Tags (comma-separated):',
            when: !tags,
          },
          {
            type: 'number',
            name: 'importance',
            message: 'Importance (0-1):',
            when: importance === undefined,
            default: 0.5,
          },
        ]);

        title = title || answers.title;
        content = content || answers.content;
        type = type || answers.type;
        tags = tags || answers.tags;
        importance = importance ?? answers.importance;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const memory = await withSpinner('Storing memory...', async () => {
          const response = await client.storeMemory({
            memoryType: type as MemoryType,
            title,
            content,
            importance: importance || 0.5,
            tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
            isPublic,
          });
          
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to store memory');
          }
          return response.data;
        });

        success('Memory stored successfully!');
        console.log(chalk.gray('Memory ID:'), memory.id);
        console.log(chalk.gray('Content Hash:'), memory.contentHash);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to store memory');
      }
    });

  // List memories
  memoryCmd
    .command('list')
    .description('List your memories')
    .option('-l, --limit <n>', 'Number of memories', '20')
    .option('--type <type>', 'Filter by type')
    .option('--public', 'Show only public memories')
    .action(async (options) => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const result = await withSpinner('Fetching memories...', async () => {
          const response = await client.listMemories({
            limit: parseInt(options.limit),
            memoryType: options.type as MemoryType,
            isPublic: options.public ? true : undefined,
          });
          
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch memories');
          }
          return response.data;
        });

        if (result.items.length === 0) {
          info('No memories found.');
          return;
        }

        heading(`Memories (${result.total} total)`);
        const data = result.items.map((m) => [
          truncate(m.id, 12),
          m.memoryType,
          truncate(m.title, 30),
          m.isPublic ? chalk.green('Yes') : chalk.gray('No'),
          String(m.totalSold),
          formatDate(m.createdAt),
        ]);
        printTable(data, ['ID', 'Type', 'Title', 'Public', 'Sold', 'Created']);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to fetch memories');
      }
    });

  // Get memory details
  memoryCmd
    .command('get <id>')
    .description('Get memory details')
    .action(async (id: string) => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const memory = await withSpinner('Fetching memory...', async () => {
          const response = await client.getMemory(id);
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Memory not found');
          }
          return response.data;
        });

        heading('Memory Details');
        console.log(chalk.bold('Title:'), memory.title);
        console.log(chalk.bold('Type:'), memory.memoryType);
        console.log(chalk.bold('ID:'), memory.id);
        console.log(chalk.bold('Public:'), memory.isPublic ? 'Yes' : 'No');
        console.log(chalk.bold('Importance:'), memory.importance);
        console.log(chalk.bold('Tags:'), memory.tags.length > 0 ? memory.tags.join(', ') : 'None');
        console.log(chalk.bold('Total Sold:'), memory.totalSold);
        console.log(chalk.bold('Created:'), formatDate(memory.createdAt));
        console.log();
        console.log(chalk.bold('Content:'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(memory.content);
        console.log(chalk.gray('─'.repeat(40)));
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to fetch memory');
      }
    });

  // Search memories
  memoryCmd
    .command('search <query>')
    .description('Search memories semantically')
    .option('-l, --limit <n>', 'Number of results', '10')
    .action(async (query: string, options) => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const memories = await withSpinner('Searching...', async () => {
          const response = await client.searchMemories(query, parseInt(options.limit));
          if (!response.success) {
            throw new Error(response.error || 'Search failed');
          }
          return response.data || [];
        });

        if (memories.length === 0) {
          info('No matching memories found.');
          return;
        }

        heading(`Search Results for "${query}"`);
        const data = memories.map((m) => [
          truncate(m.id, 12),
          m.memoryType,
          truncate(m.title, 40),
          formatDate(m.createdAt),
        ]);
        printTable(data, ['ID', 'Type', 'Title', 'Created']);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Search failed');
      }
    });

  // Delete memory
  memoryCmd
    .command('delete <id>')
    .description('Delete a memory')
    .action(async (id: string) => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete this memory?',
          default: false,
        },
      ]);

      if (!confirm) return;

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        await withSpinner('Deleting memory...', async () => {
          const response = await client.deleteMemory(id);
          if (!response.success) {
            throw new Error(response.error || 'Failed to delete memory');
          }
        });

        success('Memory deleted successfully');
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to delete memory');
      }
    });

  // Get purchased memories
  memoryCmd
    .command('purchased')
    .description('List purchased memories')
    .action(async () => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const memories = await withSpinner('Fetching purchased memories...', async () => {
          const response = await client.getPurchasedMemories();
          if (!response.success) {
            throw new Error(response.error || 'Failed to fetch');
          }
          return response.data || [];
        });

        if (memories.length === 0) {
          info('No purchased memories yet.');
          return;
        }

        heading('Purchased Memories');
        const data = memories.map((m) => [
          truncate(m.id, 12),
          m.memoryType,
          truncate(m.title, 40),
          formatDate(m.createdAt),
        ]);
        printTable(data, ['ID', 'Type', 'Title', 'Purchased']);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to fetch');
      }
    });
}
