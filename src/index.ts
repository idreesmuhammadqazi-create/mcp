import { config } from 'dotenv';
import { MCPServer } from './mcp-server.js';
import { HTTPServer } from './http-server.js';

config();

const API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || 'localhost';
const USE_HTTPS = process.env.USE_HTTPS === 'true';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

async function main() {
  if (!API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required');
    console.error('💡 Create a .env file with your API key or set it in your environment');
    process.exit(1);
  }

  const mode = process.argv[2] || 'http';

  console.log('🚀 Starting Clarifying Questions Server...\n');

  if (mode === 'mcp' || mode === 'stdio') {
    console.log('📝 Mode: MCP (stdio)');
    const mcpServer = new MCPServer(API_KEY, CLAUDE_MODEL);
    await mcpServer.start();
  } else if (mode === 'http' || mode === 'https') {
    console.log(`📝 Mode: ${USE_HTTPS ? 'HTTPS' : 'HTTP'} Server`);
    const httpServer = new HTTPServer(API_KEY, CLAUDE_MODEL, {
      port: PORT,
      host: HOST,
      useHttps: USE_HTTPS,
      sslKeyPath: SSL_KEY_PATH,
      sslCertPath: SSL_CERT_PATH
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
