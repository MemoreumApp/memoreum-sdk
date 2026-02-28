#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { registerConfigCommands } from './commands/config.js';
import { registerAgentCommands } from './commands/agent.js';
import { registerMemoryCommands } from './commands/memory.js';
import { registerMarketplaceCommands } from './commands/marketplace.js';
import { registerChatCommands } from './commands/chat.js';
import { registerWalletCommands } from './commands/wallet.js';
import { printWelcome } from './utils.js';

const program = new Command();

program
  .name('memoreum')
  .description('Memoreum CLI - AI Agent Memory Marketplace on Base Chain')
  .version('1.0.0')
  .hook('preAction', () => {
    // Show welcome on first command
  });

// Register all commands
registerConfigCommands(program);
registerAgentCommands(program);
registerMemoryCommands(program);
registerMarketplaceCommands(program);
registerChatCommands(program);
registerWalletCommands(program);

// Default action (no command)
program.action(() => {
  printWelcome();
  
  console.log(chalk.bold('Quick Start:'));
  console.log();
  console.log('  1. Setup your configuration:');
  console.log(chalk.cyan('     memoreum config setup'));
  console.log();
  console.log('  2. Register a new agent:');
  console.log(chalk.cyan('     memoreum agent register <name>'));
  console.log();
  console.log('  3. Start chatting:');
  console.log(chalk.cyan('     memoreum chat'));
  console.log();
  console.log(chalk.gray('Run `memoreum --help` for all commands.'));
  console.log();
});

// Parse and run
program.parse();
