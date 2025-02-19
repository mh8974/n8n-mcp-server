# n8n MCP Server

An MCP server that provides access to n8n workflows, executions, credentials, and more through the Model Context Protocol. This allows Large Language Models (LLMs) to interact with n8n instances in a secure and standardized way.

## Features

- Connect to any n8n instance through its REST API
- List all workflows in your n8n instance
- View workflow details including nodes, connections, and settings
- Execute workflows and monitor their status
- Manage users, credentials, tags, and projects (Enterprise features)
- Secure access through n8n API key authentication

## Installation

### Prerequisites

- Node.js 16 or higher
- An n8n instance with API access
- n8n API key with appropriate permissions
- n8n Enterprise license (for project management features)

### Using npm

```bash
npm install n8n-mcp-server
```

### Using the Source Code

```bash
# Clone the repository
git clone https://github.com/illuminaresolutions/n8n-mcp-server.git

# Navigate to the project directory
cd n8n-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

Create a `.env` file in your project root with the following variables:

```env
N8N_HOST=https://your-n8n-instance.com
N8N_API_KEY=your-api-key-here
```

## Usage

### With Claude Desktop

1. Install [Claude Desktop](https://claude.ai/download)

2. Open your Claude Desktop configuration at:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

3. Add the n8n MCP server configuration:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "n8n-mcp-server"],
      "env": {
        "N8N_HOST": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

4. Restart Claude Desktop

### With Cline

1. Install [Cline](https://github.com/cline/cline)

2. Configure the n8n MCP server in Cline:

```bash
cline config add-server n8n npx -y n8n-mcp-server
```

3. Set the required environment variables:

```bash
cline config set-env n8n N8N_HOST https://your-n8n-instance.com
cline config set-env n8n N8N_API_KEY your-api-key-here
```

## Current Features

### User Management
- List all users in your n8n instance
- Create multiple users with specified roles (global:admin or global:member)
- Retrieve user details by ID or email address
- Delete users from your instance

### Workflow Management
- List all workflows in your n8n instance
- View detailed workflow information
- Check workflow status
- Manage workflow execution
- Retrieve a workflow by ID
- Update an existing workflow
- Delete a workflow by its ID
- Activate a workflow by its ID
- Deactivate a workflow by its ID

### Project Management (Enterprise Feature)
- List all projects in your n8n instance
- Create new projects
- Delete projects by ID
- Update project names

Note: Project management features require an n8n Enterprise license with project management capabilities enabled.

## Important Usage Notes

When using the MCP tools, keep in mind these critical requirements:

1. **JSON Formatting**
   - All tool arguments must be provided as compact, single-line JSON without whitespace or newlines
   - Example: `{"clientId":"abc123","id":"workflow123"}`

2. **Workflow Creation**
   - Must provide full workflow structure including nodes and connections arrays, even if empty
   - The 'active' property is read-only and should not be included
   - Example:
     ```json
     {
       "clientId": "abc123",
       "name": "My Workflow",
       "nodes": [],
       "connections": {}
     }
     ```

3. **Enterprise Features**
   - Project management features require an n8n Enterprise license
   - Attempting to use project management features without an Enterprise license will result in clear error messages
   - The base workflow management features remain available without the Enterprise license

## What Not To Do

When developing MCP servers, avoid these common mistakes:

1. **Don't Overcomplicate the Implementation**
   - Keep the codebase simple - just expand src/index.ts as needed
   - Avoid creating complex directory structures
   - Focus on implementing core functionality first
   - Don't import fetch - it's already built into Node.js
   - Before adding any new imports, check if the functionality already exists
   - Always check N8N_API.yml for correct API endpoints and methods

2. **Don't Create Planning Documents for Unimplemented Features**
   - Only document features that are actually implemented and working
   - Avoid maintaining documentation for planned features that don't exist yet
   - Don't commit planning documents as if they were implementation details

3. **Keep It Simple**
   - Don't try to support every possible use case from the start
   - Add new features only when they're fully designed and ready to implement
   - The github repo's simple approach is correct and should be followed

4. **Focus on What Works**
   - Document only what is actually implemented and working
   - Don't include "roadmap" sections for planned features
   - Keep documentation clear and focused on current functionality

## Roadmap

The following features are planned for future releases:

### Execution Management
- Retrieve all executions
- Retrieve an execution by its ID
- Delete an execution by its ID

### Credential Management
- Create a credential
- Delete credential by ID
- Show credential data schema

### Tag Management
- Create a tag
- Retrieve all tags
- Retrieve a tag
- Delete a tag
- Update a tag

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

Remember to keep your n8n API key secure and never commit it to version control. Always use environment variables or secure configuration management for sensitive credentials.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.
