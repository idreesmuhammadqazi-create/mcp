import { config } from 'dotenv';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { MCPServer } from './mcp-server.js';
import { HTTPServer } from './http-server.js';

config();

const API_KEY = process.env.GROQ_API_KEY;
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';
const SERVER_URL = process.env.SERVER_URL;
const USE_HTTPS = process.env.USE_HTTPS === 'true';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const GROQ_MODEL = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';

async function getOrCreateMcpApiKey(): Promise<string> {
  const existingKey = process.env.MCP_API_KEY;
  if (existingKey) return existingKey;

  const generatedKey = crypto.randomBytes(32).toString('hex');
  process.env.MCP_API_KEY = generatedKey;

  const envPath = path.resolve(process.cwd(), '.env');

  try {
    let envContents = '';

    try {
      envContents = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }

    if (!envContents.includes('MCP_API_KEY=')) {
      const prefix = envContents.length > 0 && !envContents.endsWith('\n') ? '\n' : '';
      const suffix = envContents.length > 0 ? '\n' : '';
      await fs.appendFile(envPath, `${prefix}MCP_API_KEY=${generatedKey}${suffix}`);
    }

    console.log('🔑 MCP_API_KEY was not set. Generated a new key and saved it to .env');
  } catch (error) {
    console.warn('⚠️ MCP_API_KEY was not set. Generated a new key but failed to write it to .env:', error);
    console.warn('💡 Set MCP_API_KEY in your environment or .env file to avoid rotating keys on restart');
  }

  return generatedKey;
}

async function main() {
  if (!API_KEY) {
    console.error('❌ GROQ_API_KEY environment variable is required');
    console.error('💡 Create a .env file with your API key or set it in your environment');
    process.exit(1);
  }

  const mode = process.argv[2] || 'http';

  console.log('🚀 Starting Clarifying Questions Server...\n');

  if (mode === 'mcp' || mode === 'stdio') {
    console.log('📝 Mode: MCP (stdio)');
    const mcpServer = new MCPServer(API_KEY, GROQ_MODEL);
    await mcpServer.start();
  } else if (mode === 'http' || mode === 'https') {
    const mcpApiKey = await getOrCreateMcpApiKey();

    console.log(`📝 Mode: ${USE_HTTPS ? 'HTTPS' : 'HTTP'} Server`);
    const httpServer = new HTTPServer(API_KEY, GROQ_MODEL, mcpApiKey, {
      port: PORT,
      host: HOST,
      useHttps: USE_HTTPS,
      sslKeyPath: SSL_KEY_PATH,
      sslCertPath: SSL_CERT_PATH,
      serverUrl: SERVER_URL
    });
    await httpServer.start();
  } else {
    console.error(`❌ Unknown mode: ${mode}`);
    console.error('💡 Usage: node dist/index.js [http|mcp]');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
