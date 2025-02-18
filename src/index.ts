import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import fetch from 'node-fetch';

// Type definitions for n8n API responses
interface N8nWorkflow {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

interface N8nWorkflowList {
  data: N8nWorkflow[];
  nextCursor?: string;
}

class N8nClient {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async makeRequest<T>(endpoint: string, options: any = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;
    const headers = {
      'X-N8N-API-KEY': this.apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`N8N API error: ${error}`);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to connect to n8n: ${error.message}`);
      }
      throw error;
    }
  }

  async listWorkflows(): Promise<N8nWorkflowList> {
    return this.makeRequest<N8nWorkflowList>('/workflows');
  }

  async createWorkflow(name: string, nodes: any[] = [], connections: any = {}): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify({
        name,
        nodes,
        connections,
        active: false, // Default to inactive for safety
        settings: {
          saveManualExecutions: true,
          saveExecutionProgress: true,
        },
      }),
    });
  }
}

// Create an MCP server
const server = new Server(
  {
    name: "n8n-integration",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Store client instances
const clients = new Map<string, N8nClient>();

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "init-n8n",
        description: "Initialize connection to n8n instance",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
            apiKey: { type: "string" }
          },
          required: ["url", "apiKey"]
        }
      },
      {
        name: "list-workflows",
        description: "List all workflows from n8n",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" }
          },
          required: ["clientId"]
        }
      },
      {
        name: "create-workflow",
        description: "Create a new workflow in n8n",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            name: { type: "string" },
            nodes: { type: "array" },
            connections: { type: "object" }
          },
          required: ["clientId", "name"]
        }
      }
    ]
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "init-n8n": {
      const { url, apiKey } = args as { url: string; apiKey: string };
      try {
        const client = new N8nClient(url, apiKey);
        
        // Test connection by listing workflows
        await client.listWorkflows();
        
        // Generate a unique client ID
        const clientId = Buffer.from(url).toString('base64');
        clients.set(clientId, client);

        return {
          content: [{
            type: "text",
            text: `Successfully connected to n8n at ${url}. Use this client ID for future operations: ${clientId}`,
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error occurred",
          }],
          isError: true
        };
      }
    }

    case "list-workflows": {
      const { clientId } = args as { clientId: string };
      const client = clients.get(clientId);
      if (!client) {
        return {
          content: [{
            type: "text",
            text: "Client not initialized. Please run init-n8n first.",
          }],
          isError: true
        };
      }

      try {
        const workflows = await client.listWorkflows();
        const formattedWorkflows = workflows.data.map(wf => ({
          id: wf.id,
          name: wf.name,
          active: wf.active,
          created: wf.createdAt,
          updated: wf.updatedAt,
          tags: wf.tags,
        }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify(formattedWorkflows, null, 2),
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error occurred",
          }],
          isError: true
        };
      }
    }

    case "create-workflow": {
      const { clientId, name, nodes = [], connections = {} } = args as {
        clientId: string;
        name: string;
        nodes?: any[];
        connections?: Record<string, any>;
      };

      const client = clients.get(clientId);
      if (!client) {
        return {
          content: [{
            type: "text",
            text: "Client not initialized. Please run init-n8n first.",
          }],
          isError: true
        };
      }

      try {
        const workflow = await client.createWorkflow(name, nodes, connections);
        return {
          content: [{
            type: "text",
            text: `Successfully created workflow:\n${JSON.stringify(workflow, null, 2)}`,
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error occurred",
          }],
          isError: true
        };
      }
    }

    default:
      return {
        content: [{
          type: "text",
          text: `Unknown tool: ${name}`,
        }],
        isError: true
      };
  }
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("N8N MCP Server running on stdio");