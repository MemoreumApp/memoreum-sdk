import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { MemoreumAgent } from '../../agent/MemoreumAgent.js';
import { getCurrentAgent, getDefaultAIProvider } from '../config.js';
import { error, info, heading, printBox } from '../utils.js';

export function registerChatCommands(program: Command): void {
  program
    .command('chat')
    .description('Start an interactive chat with your AI agent')
    .option('--model <model>', 'Override the AI model')
    .option('--system <prompt>', 'Custom system prompt')
    .option('--stream', 'Stream responses', true)
    .action(async (options) => {
      const agentConfig = getCurrentAgent();
      if (!agentConfig) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      const aiProvider = getDefaultAIProvider();
      if (!aiProvider) {
        error('No AI provider configured. Run `memoreum config add-provider` first.');
        return;
      }

      // Override model if specified
      if (options.model) {
        aiProvider.model = options.model;
      }

      const agent = new MemoreumAgent(agentConfig.apiKey, {
        name: agentConfig.name,
        aiProvider,
        systemPrompt: options.system,
      });

      printBox(
        `Connected as ${chalk.cyan(agentConfig.name)}\n` +
        `Model: ${chalk.gray(aiProvider.model || 'default')}\n` +
        `Provider: ${chalk.gray(aiProvider.provider)}\n\n` +
        'Type your message and press Enter.\n' +
        'Commands: /clear, /history, /model, /exit',
        'Memoreum Agent Chat'
      );

      // Chat loop
      while (true) {
        const { message } = await inquirer.prompt([
          {
            type: 'input',
            name: 'message',
            message: chalk.cyan('You:'),
            prefix: '',
          },
        ]);

        if (!message || message.trim() === '') continue;

        // Handle commands
        if (message.startsWith('/')) {
          const cmd = message.slice(1).toLowerCase().trim();
          
          if (cmd === 'exit' || cmd === 'quit' || cmd === 'q') {
            info('Goodbye!');
            break;
          }
          
          if (cmd === 'clear') {
            agent.clearHistory();
            console.clear();
            info('Conversation cleared');
            continue;
          }
          
          if (cmd === 'history') {
            heading('Conversation History');
            const history = agent.getHistory();
            history.forEach((msg, i) => {
              if (msg.role === 'system') return;
              const prefix = msg.role === 'user' ? chalk.cyan('You:') : chalk.green('Agent:');
              console.log(`${prefix} ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
            });
            continue;
          }
          
          if (cmd === 'model') {
            info(`Current model: ${agent.getModel()}`);
            continue;
          }
          
          if (cmd.startsWith('model ')) {
            const newModel = cmd.slice(6).trim();
            agent.setModel(newModel);
            info(`Model changed to: ${newModel}`);
            continue;
          }

          if (cmd === 'help') {
            console.log();
            console.log(chalk.bold('Available Commands:'));
            console.log('  /clear    - Clear conversation history');
            console.log('  /history  - Show conversation history');
            console.log('  /model    - Show current model');
            console.log('  /model <name> - Change model');
            console.log('  /exit     - Exit chat');
            console.log();
            continue;
          }
          
          info(`Unknown command: ${cmd}. Type /help for available commands.`);
          continue;
        }

        // Get response
        try {
          process.stdout.write(chalk.green('\nAgent: '));
          
          if (options.stream) {
            for await (const chunk of agent.chatStream(message)) {
              process.stdout.write(chunk);
            }
            console.log('\n');
          } else {
            const response = await agent.chat(message);
            console.log(response);
            console.log();
          }
        } catch (err) {
          error(err instanceof Error ? err.message : 'Failed to get response');
        }
      }
    });

  // Single message command
  program
    .command('ask <message>')
    .description('Ask your agent a single question')
    .option('--model <model>', 'Override the AI model')
    .action(async (message: string, options) => {
      const agentConfig = getCurrentAgent();
      if (!agentConfig) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      const aiProvider = getDefaultAIProvider();
      if (!aiProvider) {
        error('No AI provider configured. Run `memoreum config add-provider` first.');
        return;
      }

      if (options.model) {
        aiProvider.model = options.model;
      }

      const agent = new MemoreumAgent(agentConfig.apiKey, {
        name: agentConfig.name,
        aiProvider,
      });

      try {
        process.stdout.write(chalk.green('Agent: '));
        
        for await (const chunk of agent.chatStream(message)) {
          process.stdout.write(chunk);
        }
        console.log();
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to get response');
      }
    });
}
