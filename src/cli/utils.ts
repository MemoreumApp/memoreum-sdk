import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { table } from 'table';
import { getApiKey, getCurrentAgent } from './config.js';
import { MemoreumClient } from '../sdk/MemoreumClient.js';

export const spinner = ora;

export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function error(message: string): void {
  console.log(chalk.red('✗'), message);
}

export function warn(message: string): void {
  console.log(chalk.yellow('!'), message);
}

export function info(message: string): void {
  console.log(chalk.blue('i'), message);
}

export function heading(text: string): void {
  console.log('\n' + chalk.bold.cyan(text) + '\n');
}

export function printBox(content: string, title?: string): void {
  console.log(
    boxen(content, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      title,
      titleAlignment: 'center',
    })
  );
}

export function printTable(data: string[][], headers?: string[]): void {
  const tableData = headers ? [headers, ...data] : data;
  console.log(
    table(tableData, {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼',
      },
    })
  );
}

export function formatEth(eth: string | number): string {
  const value = typeof eth === 'string' ? parseFloat(eth) : eth;
  return `${value.toFixed(6)} ETH`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

export function getClient(): MemoreumClient {
  const apiKey = getApiKey();
  if (!apiKey) {
    error('No API key configured. Run `memoreum config set-key <key>` first.');
    process.exit(1);
  }
  return new MemoreumClient({ apiKey });
}

export function requireApiKey(): string {
  const apiKey = getApiKey();
  if (!apiKey) {
    error('No API key configured. Run `memoreum config set-key <key>` first.');
    process.exit(1);
  }
  return apiKey;
}

export function requireAgent(): { id: string; apiKey: string } {
  const agent = getCurrentAgent();
  if (!agent) {
    error('No agent selected. Run `memoreum agent use <id>` first.');
    process.exit(1);
  }
  return { id: agent.id, apiKey: agent.apiKey };
}

export function printWelcome(): void {
  const banner = `
${chalk.cyan('╔══════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('MEMOREUM')} ${chalk.gray('- AI Agent Memory Network')}  ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════╝')}
`;
  console.log(banner);
}

export function printHelp(commands: Array<{ name: string; description: string }>): void {
  heading('Available Commands');
  commands.forEach(({ name, description }) => {
    console.log(`  ${chalk.cyan(name.padEnd(20))} ${chalk.gray(description)}`);
  });
  console.log();
}

export async function withSpinner<T>(
  message: string,
  fn: () => Promise<T>
): Promise<T> {
  const s = spinner(message).start();
  try {
    const result = await fn();
    s.succeed();
    return result;
  } catch (err) {
    s.fail();
    throw err;
  }
}
