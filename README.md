# n8n MCP Server

An MCP server that provides access to n8n workflows, executions, credentials, and more through the Model Context Protocol. This allows Large Language Models (LLMs) to interact with n8n instances in a secure and standardized way.

## Quick Start

The n8n MCP server can be used with any LLM application that supports the Model Context Protocol. Here's how to get started:

1. Get your n8n API key from your n8n instance
2. Add the configuration to your LLM application (see below)
3. Start the MCP server in the background:
   ```bash
   npm run build
   nohup npm start > n8n-mcp.log 2>&1 &
   ```
4. Restart your LLM application
5. Test with "List my n8n workflows"

Note: The server will run in the background and log to n8n-mcp.log. To stop it:
```bash
pkill -f "node build/index.js"
```

## Configuration

### Claude Desktop

1. Open your Claude Desktop configuration:
   ```
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

2. Add the n8n configuration:
   ```json
   {
     "mcpServers": {
       "n8n": {
         "command": "npx",
         "args": ["-y", "@illuminaresolutions/n8n-mcp-server"],
         "env": {
           "N8N_HOST": "https://your-n8n-instance.com",
           "N8N_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

### Cline (VS Code)

```bash
# Add the server
cline config add-server n8n npx -y @illuminaresolutions/n8n-mcp-server

# Set environment variables
cline config set-env n8n N8N_HOST https://your-n8n-instance.com
cline config set-env n8n N8N_API_KEY your-api-key-here
```

### Sage

Add to `~/Library/Application Support/Sage/sage_config.json`:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "@illuminaresolutions/n8n-mcp-server"],
      "env": {
        "N8N_HOST": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Validation

After adding the configuration:

1. Restart your LLM application
2. Ask: "List my n8n workflows"
3. You should see your workflows listed

If you get an error:
- Check that your n8n instance is running
- Verify your API key has correct permissions
- Ensure N8N_HOST has no trailing slash

## Features

### Core Features
- List and manage workflows
- View workflow details
- Execute workflows
- Manage credentials
- Handle tags and executions

### Enterprise Features
These features require an n8n Enterprise license:
- Project management
- Variable management
- Advanced user management
- Security audit capabilities

## Troubleshooting

### Common Issues

1. "Client not initialized"
   - Check N8N_HOST and N8N_API_KEY are set correctly
   - Ensure n8n instance is accessible
   - Verify API key permissions

2. "License required"
   - You're trying to use an Enterprise feature
   - Either upgrade to n8n Enterprise or use core features only

3. Connection Issues
   - Verify n8n instance is running
   - Check URL protocol (http/https)
   - Remove trailing slash from N8N_HOST

### Debug Mode

Enable debug logging:

```bash
# Claude Desktop/Sage
Add "debug": true to config file

# Cline
cline config set-env n8n DEBUG true
```

## Security Best Practices

1. API Key Management
   - Use minimal permissions necessary
   - Rotate keys regularly
   - Never commit keys to version control

2. Instance Access
   - Use HTTPS for production
   - Enable n8n authentication
   - Keep n8n updated

## Support

- [GitHub Issues](https://github.com/illuminaresolutions/n8n-mcp-server/issues)
- [n8n Documentation](https://docs.n8n.io)

## License

MIT License - see [LICENSE](LICENSE) file
