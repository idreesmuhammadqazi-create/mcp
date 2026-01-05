# Deployment Guide

This guide covers different deployment scenarios for the Clarifying Questions MCP Server.

## Table of Contents
1. [Local Development](#local-development)
2. [MCP Integration (Claude Desktop)](#mcp-integration-claude-desktop)
3. [Self-Hosted HTTP Server](#self-hosted-http-server)
4. [Docker Deployment](#docker-deployment-future)
5. [Cloud Deployment](#cloud-deployment-future)

---

## Local Development

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Anthropic API key

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd studio-mcp-clarifying-questions-server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Build the project
npm run build
```

### Run in Development Mode

#### HTTP Server
```bash
npm run dev http
```
Server will run at `http://localhost:3000` with auto-reload on file changes.

#### MCP Server
```bash
npm run dev mcp
```
Runs in stdio mode for MCP integration with auto-reload.

### Run in Production Mode

#### HTTP Server
```bash
npm start http
```

#### MCP Server
```bash
npm start mcp
```

---

## MCP Integration (Claude Desktop)

### Installation Steps

1. **Build the project**
```bash
cd /path/to/studio-mcp-clarifying-questions-server
npm install
npm run build
```

2. **Locate Claude Desktop config file**

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

3. **Add MCP server configuration**

Edit the config file and add:

```json
{
  "mcpServers": {
    "clarifying-questions": {
      "command": "node",
      "args": [
        "/absolute/path/to/studio-mcp-clarifying-questions-server/dist/index.js",
        "mcp"
      ],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-your-api-key-here"
      }
    }
  }
}
```

**Important:** Use absolute paths, not relative paths!

4. **Restart Claude Desktop**

Completely quit and restart Claude Desktop.

5. **Verify installation**

In Claude Desktop, you should see the following tools available:
- `generate_questions`
- `answer_question`
- `get_context`
- `list_sessions`

### Usage in Claude Desktop

Simply ask Claude to use the tools:

```
"Use the generate_questions tool to help me clarify my task: 
build a real-time chat application"
```

Claude will:
1. Call the tool with your task description
2. Present the generated questions
3. Collect your responses
4. Build a comprehensive context

### Troubleshooting

**Tools not showing up:**
- Verify the absolute path is correct
- Check that `npm run build` completed successfully
- Ensure API key is valid
- Restart Claude Desktop completely

**Permission errors:**
- Ensure the dist/index.js file is readable
- Check that node is in your PATH

**API errors:**
- Verify ANTHROPIC_API_KEY is correct
- Check your API key has sufficient credits

---

## Self-Hosted HTTP Server

### Basic Setup

1. **Prepare the server**
```bash
npm install
npm run build
```

2. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env`:
```env
GROQ_API_KEY=your_groq_key_here
MCP_API_KEY=your_secure_api_key  # Generate with: openssl rand -hex 32
SERVER_URL=http://your-public-domain.com  # Optional: Your public URL
PORT=3000
HOST=0.0.0.0  # Listen on all interfaces
USE_HTTPS=false  # Start with HTTP
```

3. **Run the server**
```bash
npm start http
```

4. **Call the API with authentication**

All `/api/*` endpoints require a Bearer token:

```bash
curl http://localhost:3000/api/sessions \
  -H "Authorization: Bearer $MCP_API_KEY"
```

`GET /health` remains public (no auth required).

### HTTPS Setup

#### Option 1: Self-Signed Certificate (Development)

```bash
# Generate certificate
npm run generate-cert

# Update .env
USE_HTTPS=true
SSL_KEY_PATH=./certs/key.pem
SSL_CERT_PATH=./certs/cert.pem

# Start server
npm start http
```

**Note:** Browsers will show security warnings with self-signed certificates.

#### Option 2: Let's Encrypt (Production)

```bash
# Install certbot
sudo apt-get install certbot  # Ubuntu/Debian

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Update .env
USE_HTTPS=true
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem

# Start server (may need sudo for cert access)
npm start http
```

### Process Management with PM2

For production, use PM2 to keep the server running:

```bash
# Install PM2 globally
npm install -g pm2

# Start the server
pm2 start dist/index.js --name clarifying-questions -- http

# Configure to start on boot
pm2 startup
pm2 save

# Monitor logs
pm2 logs clarifying-questions

# Restart server
pm2 restart clarifying-questions

# Stop server
pm2 stop clarifying-questions
```

### Reverse Proxy with Nginx

For production deployments, use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # For SSE support
        proxy_buffering off;
        proxy_set_header X-Accel-Buffering no;
    }
}
```

Enable and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/clarifying-questions /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Firewall Configuration

```bash
# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

---

## Docker Deployment (Future)

### Dockerfile (Example)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Expose port
EXPOSE 3000

# Run server
CMD ["node", "dist/index.js", "http"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  clarifying-questions:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PORT=3000
      - HOST=0.0.0.0
      - USE_HTTPS=false
    volumes:
      - ./sessions:/app/sessions
    restart: unless-stopped
```

### Build and Run

```bash
# Build image
docker build -t clarifying-questions .

# Run container
docker run -d \
  -p 3000:3000 \
  -e ANTHROPIC_API_KEY=your_key \
  -v $(pwd)/sessions:/app/sessions \
  --name clarifying-questions \
  clarifying-questions

# Or use docker-compose
docker-compose up -d
```

---

## FastMCP Cloud Deployment

This section covers deploying the Clarifying Questions MCP Server to FastMCP Cloud for easy access and hosting.

### Prerequisites
- GitHub repository with your code
- FastMCP Cloud account
- GROQ API key (required)
- Optional: Custom domain and SSL certificates

### Deployment Steps

1. **Prepare your repository**
   ```bash
   # Ensure your code is committed and pushed
   git add .
   git commit -m "Prepare for FastMCP Cloud deployment"
   git push origin main
   ```

2. **Create new FastMCP Cloud deployment**
   - Visit FastMCP Cloud dashboard
   - Click "New Deployment"
   - Connect your GitHub repository
   - Select the branch to deploy (typically `main`)

3. **Configure build settings**
   ```
   Build Command: npm install && npm run build
   Start Command: node dist/index.js http
   ```

4. **Set required environment variables**
   ```
   # Required - GROQ API key for AI integration
   GROQ_API_KEY=your_groq_api_key_here
   
   # Required - API key for MCP authentication
   MCP_API_KEY=your_secure_api_key_here
   
   # Optional - Custom server URL (will be auto-generated if not set)
   SERVER_URL=https://your-deployment-url.fastmcp.cloud
   ```

5. **Deploy**
   - Click "Deploy" in FastMCP Cloud dashboard
   - Wait for build and deployment to complete
   - Note the provided URL for your deployment

### Post-Deployment Configuration

Once deployed, you can test your server:

```bash
# Test health endpoint (public)
curl https://your-deployment-url.fastmcp.cloud/health

# Test API endpoint (requires authentication)
curl https://your-deployment-url.fastmcp.cloud/api/sessions \
  -H "Authorization: Bearer YOUR_MCP_API_KEY"
```

### Environment Variables Reference

#### Required
- `GROQ_API_KEY` - Your GROQ API key for AI integration
- `MCP_API_KEY` - Secure API key for endpoint authentication (generate with: `openssl rand -hex 32`)

#### Optional
- `SERVER_URL` - Custom URL for your deployment (auto-generated if not provided)
- `GROQ_MODEL` - GROQ model to use (default: `mixtral-8x7b-32768`)
- `SESSION_TIMEOUT_MS` - Session timeout in milliseconds (default: `3600000`)

### Connecting to Claude Desktop

To use your FastMCP Cloud deployment with Claude Desktop, update your MCP configuration:

```json
{
  "mcpServers": {
    "clarifying-questions": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "-H", "Authorization: Bearer YOUR_MCP_API_KEY",
        "-H", "Content-Type: application/json",
        "-d", '{"taskDescription": "YOUR_TASK_DESCRIPTION"}',
        "https://your-deployment-url.fastmcp.cloud/api/generate"
      ]
    }
  }
}
```

**Note:** Direct stdio MCP integration requires running the server locally. For cloud-hosted deployments, consider using the HTTP API approach above or setting up a local proxy.

### Monitoring and Logs

- View deployment logs in FastMCP Cloud dashboard
- Monitor API usage and response times
- Check session storage (stored in `/sessions` directory)

### Troubleshooting

**Build failures:**
- Ensure `npm install && npm run build` works locally
- Check that all dependencies are properly declared in `package.json`
- Verify Node.js version compatibility (18+ required)

**Runtime errors:**
- Verify all required environment variables are set
- Check API key validity
- Review deployment logs for specific error messages

**Connection issues:**
- Confirm `HOST=0.0.0.0` is set (default for FastMCP Cloud)
- Verify port `8000` is accessible
- Check firewall/security group settings

---

## Cloud Deployment (Future)

### Railway

1. Create new project on Railway
2. Connect GitHub repository
3. Add environment variable: `ANTHROPIC_API_KEY`
4. Deploy automatically

### Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set ANTHROPIC_API_KEY=your_key

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### AWS EC2

1. Launch EC2 instance (Ubuntu 22.04)
2. SSH into instance
3. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```
4. Clone repository and setup
5. Use PM2 for process management
6. Configure security groups (ports 80, 443)
7. Set up Nginx as reverse proxy

### DigitalOcean

1. Create Droplet (Ubuntu)
2. Follow same steps as AWS EC2
3. Use managed database for sessions (optional)
4. Set up firewall rules

---

## Environment Variables

### Required
- `ANTHROPIC_API_KEY` - Your Anthropic API key

### Optional
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: localhost)
- `USE_HTTPS` - Enable HTTPS (default: true)
- `SSL_KEY_PATH` - Path to SSL private key
- `SSL_CERT_PATH` - Path to SSL certificate
- `CLAUDE_MODEL` - Claude model version (default: claude-3-5-sonnet-20241022)
- `SESSION_TIMEOUT_MS` - Session timeout in milliseconds (default: 3600000)

---

## Monitoring and Maintenance

### Health Checks

```bash
# Check server health
curl http://localhost:3000/health

# Expected response
{"status":"healthy","timestamp":"2024-01-05T10:00:00.000Z"}
```

### Log Monitoring

With PM2:
```bash
pm2 logs clarifying-questions --lines 100
```

### Session Cleanup

Sessions auto-expire after 1 hour by default. To manually clean up:

```bash
# Remove old session files
find ./sessions -name "*.json" -mtime +1 -delete
```

### Backup Sessions

```bash
# Backup sessions directory
tar -czf sessions-backup-$(date +%Y%m%d).tar.gz sessions/
```

---

## Security Best Practices

1. **API Key Security**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly

2. **HTTPS**
   - Use valid SSL certificates in production
   - Redirect HTTP to HTTPS

3. **Firewall**
   - Only open necessary ports
   - Use security groups/firewall rules

4. **Updates**
   - Keep dependencies updated
   - Monitor security advisories

5. **Access Control**
   - Consider adding authentication for production
   - Use reverse proxy for additional security

---

## Performance Tuning

### Node.js Options

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start http
```

### Session Storage

For high-volume deployments, consider:
- Redis for session storage
- PostgreSQL/MongoDB for persistence
- Separate storage server

### Load Balancing

For multiple instances:
- Use Nginx as load balancer
- Shared session storage (Redis)
- Sticky sessions for SSE connections

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### SSL Certificate Errors

```bash
# Verify certificate
openssl x509 -in certs/cert.pem -text -noout

# Check key and cert match
openssl x509 -noout -modulus -in certs/cert.pem | openssl md5
openssl rsa -noout -modulus -in certs/key.pem | openssl md5
```

### Memory Issues

```bash
# Monitor memory usage with PM2
pm2 monit

# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start http
```

### API Rate Limits

If hitting Anthropic API rate limits:
- Implement request queuing
- Add rate limiting middleware
- Consider caching responses

---

## Rollback Procedure

```bash
# With Git
git checkout previous-version
npm install
npm run build
pm2 restart clarifying-questions

# With Docker
docker pull clarifying-questions:previous-tag
docker-compose up -d
```

---

## Support

For deployment issues:
1. Check logs: `pm2 logs` or server output
2. Verify environment variables
3. Test API key with curl
4. Check firewall/security groups
5. Review ARCHITECTURE.md for technical details

---

**Last Updated**: January 2024
