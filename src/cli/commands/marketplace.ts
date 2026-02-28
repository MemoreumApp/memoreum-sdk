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
  formatDate,
  formatEth,
  truncate,
} from '../utils.js';

export function registerMarketplaceCommands(program: Command): void {
  const marketCmd = program
    .command('marketplace')
    .alias('market')
    .description('Browse and trade on the Memoreum marketplace');

  // Browse listings
  marketCmd
    .command('browse')
    .description('Browse marketplace listings')
    .option('-l, --limit <n>', 'Number of listings', '20')
    .option('--type <type>', 'Filter by memory type')
    .option('--min-price <eth>', 'Minimum price in ETH')
    .option('--max-price <eth>', 'Maximum price in ETH')
    .option('--sort <sort>', 'Sort by: price_asc, price_desc, recent, popular')
    .action(async (options) => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const result = await withSpinner('Fetching listings...', async () => {
          const response = await client.browseMarketplace({
            limit: parseInt(options.limit),
            memoryType: options.type,
            minPrice: options.minPrice,
            maxPrice: options.maxPrice,
            sortBy: options.sort,
          });
          
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to fetch listings');
          }
          return response.data;
        });

        if (result.items.length === 0) {
          info('No listings found.');
          return;
        }

        heading(`Marketplace Listings (${result.total} total)`);
        const data = result.items.map((l) => [
          truncate(l.id, 12),
          l.memory?.title ? truncate(l.memory.title, 30) : 'Unknown',
          l.memory?.memoryType || '-',
          formatEth(l.priceEth),
          String(l.views),
          l.seller?.agentName ? truncate(l.seller.agentName, 15) : 'Unknown',
          formatDate(l.listedAt),
        ]);
        printTable(data, ['ID', 'Title', 'Type', 'Price', 'Views', 'Seller', 'Listed']);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to fetch listings');
      }
    });

  // Get listing details
  marketCmd
    .command('view <listingId>')
    .description('View listing details')
    .action(async (listingId: string) => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const listing = await withSpinner('Fetching listing...', async () => {
          const response = await client.getListing(listingId);
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Listing not found');
          }
          return response.data;
        });

        heading('Listing Details');
        console.log(chalk.bold('Listing ID:'), listing.id);
        console.log(chalk.bold('Price:'), chalk.green(formatEth(listing.priceEth)));
        console.log(chalk.bold('Views:'), listing.views);
        console.log(chalk.bold('Status:'), listing.isActive ? chalk.green('Active') : chalk.red('Inactive'));
        console.log(chalk.bold('Listed:'), formatDate(listing.listedAt));
        if (listing.expiresAt) {
          console.log(chalk.bold('Expires:'), formatDate(listing.expiresAt));
        }
        
        if (listing.memory) {
          console.log();
          console.log(chalk.bold.cyan('Memory Info:'));
          console.log(chalk.bold('Title:'), listing.memory.title);
          console.log(chalk.bold('Type:'), listing.memory.memoryType);
          console.log(chalk.bold('Importance:'), listing.memory.importance);
          console.log(chalk.bold('Tags:'), listing.memory.tags.length > 0 ? listing.memory.tags.join(', ') : 'None');
        }

        if (listing.seller) {
          console.log();
          console.log(chalk.bold.cyan('Seller Info:'));
          console.log(chalk.bold('Name:'), listing.seller.agentName);
          console.log(chalk.bold('Reputation:'), `${(listing.seller.reputationScore * 100).toFixed(1)}%`);
        }
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to fetch listing');
      }
    });

  // Purchase memory
  marketCmd
    .command('buy <listingId>')
    .description('Purchase a memory from the marketplace')
    .action(async (listingId: string) => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        // Get listing details first
        const listingResponse = await client.getListing(listingId);
        if (!listingResponse.success || !listingResponse.data) {
          error('Listing not found');
          return;
        }

        const listing = listingResponse.data;
        
        console.log();
        console.log(chalk.bold('Memory:'), listing.memory?.title || 'Unknown');
        console.log(chalk.bold('Price:'), chalk.green(formatEth(listing.priceEth)));
        console.log(chalk.bold('Seller:'), listing.seller?.agentName || 'Unknown');
        console.log();

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Purchase this memory for ${formatEth(listing.priceEth)}?`,
            default: false,
          },
        ]);

        if (!confirm) {
          info('Purchase cancelled');
          return;
        }

        const result = await withSpinner('Processing purchase...', async () => {
          const response = await client.purchaseMemory({ listingId });
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Purchase failed');
          }
          return response.data;
        });

        success('Purchase successful!');
        console.log(chalk.gray('Transaction ID:'), result.transaction.id);
        console.log(chalk.gray('TX Hash:'), result.txHash);
        info('The memory has been added to your collection.');
      } catch (err) {
        error(err instanceof Error ? err.message : 'Purchase failed');
      }
    });

  // List memory for sale
  marketCmd
    .command('sell <memoryId>')
    .description('List a memory for sale')
    .option('-p, --price <eth>', 'Price in ETH')
    .option('-d, --days <n>', 'Listing duration in days')
    .action(async (memoryId: string, options) => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      let { price, days } = options;

      if (!price) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'price',
            message: 'Price in ETH:',
            validate: (input: string) => {
              const num = parseFloat(input);
              return !isNaN(num) && num > 0 || 'Enter a valid price';
            },
          },
          {
            type: 'number',
            name: 'days',
            message: 'Listing duration (days, 0 for no expiry):',
            default: 30,
          },
        ]);
        price = answers.price;
        days = answers.days;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const listing = await withSpinner('Creating listing...', async () => {
          const response = await client.createListing({
            memoryId,
            priceEth: price,
            expiresInDays: days > 0 ? parseInt(days) : undefined,
          });
          
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to create listing');
          }
          return response.data;
        });

        success('Memory listed for sale!');
        console.log(chalk.gray('Listing ID:'), listing.id);
        console.log(chalk.gray('Price:'), formatEth(listing.priceEth));
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to create listing');
      }
    });

  // View my listings
  marketCmd
    .command('my-listings')
    .description('View your active listings')
    .action(async () => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        const listings = await withSpinner('Fetching your listings...', async () => {
          const response = await client.getMyListings();
          if (!response.success) {
            throw new Error(response.error || 'Failed to fetch listings');
          }
          return response.data || [];
        });

        if (listings.length === 0) {
          info('You have no active listings.');
          return;
        }

        heading('Your Listings');
        const data = listings.map((l) => [
          truncate(l.id, 12),
          l.memory?.title ? truncate(l.memory.title, 30) : 'Unknown',
          formatEth(l.priceEth),
          String(l.views),
          l.isActive ? chalk.green('Active') : chalk.gray('Inactive'),
          formatDate(l.listedAt),
        ]);
        printTable(data, ['ID', 'Title', 'Price', 'Views', 'Status', 'Listed']);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to fetch listings');
      }
    });

  // Remove listing
  marketCmd
    .command('remove <listingId>')
    .description('Remove a listing')
    .action(async (listingId: string) => {
      const agent = getCurrentAgent();
      if (!agent) {
        error('No agent selected. Run `memoreum agent use <id>` first.');
        return;
      }

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Remove this listing?',
          default: false,
        },
      ]);

      if (!confirm) return;

      try {
        const client = new MemoreumClient({ apiKey: agent.apiKey });
        
        await withSpinner('Removing listing...', async () => {
          const response = await client.removeListing(listingId);
          if (!response.success) {
            throw new Error(response.error || 'Failed to remove listing');
          }
        });

        success('Listing removed');
      } catch (err) {
        error(err instanceof Error ? err.message : 'Failed to remove listing');
      }
    });
}
