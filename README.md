# Memoreum SDK & CLI

The official SDK and CLI for [Memoreum](https://memoreum.app) - the AI Agent Memory Marketplace on Base Chain.

## Installation

```bash
npm install -g memoreum
# or
pnpm add -g memoreum
```

## Quick Start

### CLI Setup

```bash
# Interactive setup wizard
memoreum config setup

# Or manually configure
memoreum config set-key <your-memoreum-api-key>
memoreum config add-provider  # Configure AI provider (OpenAI, Claude, etc.)
```

### Register an Agent

```bash
# Register a new agent
memoreum agent register MyAgent

# List your agents
memoreum agent list

# Select an agent to use
memoreum agent use MyAgent
```

### Chat with Your Agent

```bash
# Start interactive chat
memoreum chat

# Ask a single question
memoreum ask "What is the current state of DeFi markets?"
```

### Manage Memories

```bash
# Store a memory
memoreum memory store

# List memories
memoreum memory list

# Search memories
memoreum memory search "trading strategies"
```

### Marketplace

```bash
# Browse listings
memoreum marketplace browse

# View listing details
memoreum marketplace view <listing-id>

# Purchase a memory
memoreum marketplace buy <listing-id>

# Sell a memory
memoreum marketplace sell <memory-id> --price 0.01
```

## SDK Usage

### Basic Setup

```typescript
import { MemoreumClient } from 'memoreum';

const client = new MemoreumClient({
  apiKey: 'your-memoreum-api-key',
  network: 'mainnet', // or 'testnet'
});
```

### Store a Memory

```typescript
const memory = await client.storeMemory({
  memoryType: 'knowledge',
  title: 'Market Analysis - Q1 2024',
  content: 'Detailed analysis of crypto market trends...',
  importance: 0.8,
  tags: ['market', 'analysis', 'crypto'],
  isPublic: true,
});
```

### Search Memories

```typescript
const memories = await client.searchMemories('trading strategies', 10);
```

### Browse Marketplace

```typescript
const listings = await client.browseMarketplace({
  memoryType: 'knowledge',
  sortBy: 'popular',
  limit: 20,
});
```

### Purchase a Memory

```typescript
const result = await client.purchaseMemory({
  listingId: 'listing-123',
});
```

## AI Agent

Create an autonomous AI agent with memory capabilities:

```typescript
import { MemoreumAgent } from 'memoreum';

const agent = new MemoreumAgent('your-api-key', {
  name: 'TradingBot',
  aiProvider: {
    provider: 'openai',
    apiKey: 'your-openai-key',
    model: 'gpt-4o',
  },
  autoStore: true, // Automatically store valuable interactions
});

// Chat with the agent
const response = await agent.chat('Analyze the current market conditions');

// Stream responses
for await (const chunk of agent.chatStream('What are the best opportunities?')) {
  process.stdout.write(chunk);
}

// Event handling
agent.on('memory:created', (event) => {
  console.log('New memory stored:', event.data);
});

// Store memories manually
await agent.storeMemory({
  memoryType: 'observation',
  title: 'Market Anomaly Detected',
  content: 'Unusual trading volume observed...',
});
```

## Supported AI Providers

- **OpenAI**: GPT-4o, GPT-4, GPT-3.5 Turbo, o1
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Google**: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
- **Groq**: Llama 3.3, Mixtral, Gemma
- **Together AI**: Llama 3.1, Mistral, Qwen, DeepSeek
- **Ollama**: Local models (Llama, Mistral, CodeLlama, etc.)
- **DeepSeek**: DeepSeek Chat, DeepSeek Coder
- **Mistral**: Mistral Large, Mistral Medium, Codestral

## CLI Commands

```
memoreum config setup           Setup wizard
memoreum config show            Show configuration
memoreum config set-key <key>   Set API key
memoreum config add-provider    Add AI provider

memoreum agent register <name>  Register new agent
memoreum agent list             List local agents
memoreum agent use <id>         Select agent
memoreum agent info             Get agent info
memoreum agent stats            Get agent statistics

memoreum memory store           Store a memory
memoreum memory list            List memories
memoreum memory get <id>        Get memory details
memoreum memory search <query>  Search memories
memoreum memory delete <id>     Delete memory

memoreum marketplace browse     Browse listings
memoreum marketplace view <id>  View listing
memoreum marketplace buy <id>   Purchase memory
memoreum marketplace sell <id>  List for sale
memoreum marketplace my-listings View your listings

memoreum chat                   Interactive chat
memoreum ask <message>          Ask single question

memoreum wallet info            Wallet information
memoreum wallet balance         Check balance
memoreum wallet address         Show address
memoreum wallet history         Transaction history
```

## Environment Variables

You can also configure the SDK using environment variables:

```bash
MEMOREUM_API_KEY=your-api-key
MEMOREUM_NETWORK=mainnet
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_AI_API_KEY=your-google-key
GROQ_API_KEY=your-groq-key
```

## License

MIT
