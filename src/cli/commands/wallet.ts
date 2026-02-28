import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { MemoreumClient } from '../../sdk/MemoreumClient.js';
import { getCurrentAgent } from '../config.js';
import {
  success,
  error,
  info,
  warn,
  printTable,
  heading,
  withSpinner,
  formatEth,
} from '../utils.js';

export function registerWalletCommands(program: Command): void {
  const walletCmd = program
    .command('wallet')
    .description('Manage agent wallet');

  // Show wallet info
  walletCmd
    .command('info')
    .description('Show wallet information')
    .action(async () => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const balance = await withSpinner('Fetching wallet info...', async () => {
          const response = await client.getBalance();
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch balance');
          }
          return response.data;
        });

        heading('Wallet Information');
        const data = [
          ['Address', agent.walletAddress],
          ['Balance', chalk.green(formatEth(balance.balanceEth))],
          ['Network', 'Base'],
        ];
        printTable(data, ['Field', 'Value']);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to fetch wallet info');
      }
    });

  // Show balance
  walletCmd
    .command('balance')
    .description('Show wallet balance')
    .action(async () => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const balance = await withSpinner('Fetching balance...', async () => {
          const response = await client.getBalance();
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch balance');
          }
          return response.data;
        });

        console.log();
        console.log(chalk.bold('Balance:'), chalk.green(formatEth(balance.balanceEth)));
        console.log();
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to fetch balance');
      }
    });

  // Show address
  walletCmd
    .command('address')
    .description('Show wallet address')
    .action(() => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      console.log();
      console.log(chalk.bold('Wallet Address:'));
      console.log(agent.walletAddress);
      console.log();
      info('Send ETH to this address on Base network to fund your agent.');
    });

  // Transaction history
  walletCmd
    .command('history')
    .description('Show transaction history')
    .option('-t, --type <type>', 'Filter by type: purchases, sales, all', 'all')
    .action(async (options) => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        let transactions: Array<{
          id: string;
          type: string;
          priceEth: string;
          status: string;
          createdAt: Date | string;
        }> = [];

        await withSpinner('Fetching transactions...', async () => {
          if (options.type === 'all' || options.type === 'purchases') {
            const purchaseResponse = await client.getPurchaseHistory();
            if (purchaseResponse.success && purchaseResponse.data) {
              transactions.push(
                ...purchaseResponse.data.map((t) => ({
                  ...t,
                  type: 'Purchase',
                }))
              );
            }
          }

          if (options.type === 'all' || options.type === 'sales') {
            const salesResponse = await client.getSalesHistory();
            if (salesResponse.success && salesResponse.data) {
              transactions.push(
                ...salesResponse.data.map((t) => ({
                  ...t,
                  type: 'Sale',
                }))
              );
            }
          }
        });

        if (transactions.length === 0) {
          info('No transactions found.');
          return;
        }

        // Sort by date
        transactions.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        heading('Transaction History');
        const data = transactions.slice(0, 20).map((t) => [
          t.id.slice(0, 12) + '...',
          t.type === 'Purchase' ? chalk.red(t.type) : chalk.green(t.type),
          formatEth(t.priceEth),
          t.status === 'completed' ? chalk.green(t.status) : chalk.yellow(t.status),
          new Date(t.createdAt).toLocaleDateString(),
        ]);
        printTable(data, ['ID', 'Type', 'Amount', 'Status', 'Date']);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to fetch transactions');
      }
    });

  // Fund wallet instructions
  walletCmd
    .command('fund')
    .description('Instructions to fund your wallet')
    .action(() => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      heading('Fund Your Wallet');
      
      console.log(chalk.bold('Your wallet address:'));
      console.log(chalk.cyan(agent.walletAddress));
      console.log();
      
      console.log(chalk.bold('To fund your agent wallet:'));
      console.log();
      console.log('1. Make sure you have ETH on Base network');
      console.log('2. Send ETH to the address above');
      console.log('3. Wait for the transaction to confirm');
      console.log();
      
      console.log(chalk.bold('Need Base ETH?'));
      console.log('• Bridge from Ethereum: https://bridge.base.org');
      console.log('• Buy on exchanges that support Base');
      console.log('• Use a faucet for testnet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet');
      console.log();
      
      warn('Always verify the address before sending funds!');
    });
}
