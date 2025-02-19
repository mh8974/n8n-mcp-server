import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

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

interface N8nProject {
  id: string;
  name: string;
  type?: string;
}

interface N8nProjectList {
  data: N8nProject[];
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
        const errorText = await response.text();
        let errorMessage: string;
        try {
          const errorJson = JSON.parse(errorText);
          // Check for license-related errors
          if (errorJson.message && errorJson.message.includes('license')) {
            errorMessage = `This operation requires an n8n Enterprise license with project management features enabled. Error: ${errorJson.message}`;
          } else {
            errorMessage = errorJson.message || errorText;
          }
        } catch {
          errorMessage = errorText;
        }
        throw new Error(`N8N API error: ${errorMessage}`);
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

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>(`/workflows/${id}`);
  }

  async createWorkflow(name: string, nodes: any[] = [], connections: any = {}): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify({
        name,
        nodes,
        connections,
        settings: {
          saveManualExecutions: true,
          saveExecutionProgress: true,
        },
      }),
    });
  }

  async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  }

  async deleteWorkflow(id: string): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>(`/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>(`/workflows/${id}/activate`, {
      method: 'POST',
    });
  }

  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>(`/workflows/${id}/deactivate`, {
      method: 'POST',
    });
  }

  // Project management methods (requires n8n Enterprise license)
  async listProjects(): Promise<N8nProjectList> {
    return this.makeRequest<N8nProjectList>('/projects');
  }

  async createProject(name: string): Promise<void> {
    return this.makeRequest<void>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.makeRequest<void>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async updateProject(projectId: string, name: string): Promise<void> {
    return this.makeRequest<void>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
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
        description: "Initialize connection to n8n instance. Use this tool whenever an n8n URL and API key are shared to establish the connection. IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.",
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
        description: "List all workflows from n8n. Use after init-n8n to see available workflows. IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" }
          },
          required: ["clientId"]
        }
      },
      {
        name: "get-workflow",
        description: "Retrieve a workflow by ID. Use after list-workflows to get detailed information about a specific workflow. IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            id: { type: "string" }
          },
          required: ["clientId", "id"]
        }
      },
      {
        name: "create-workflow",
        description: "Create a new workflow in n8n. Use to set up a new workflow with optional nodes and connections. IMPORTANT: 1) Arguments must be provided as compact, single-line JSON without whitespace or newlines. 2) Must provide full workflow structure including nodes and connections arrays, even if empty. The 'active' property should not be included as it is read-only.",
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
      },
      {
        name: "update-workflow",
        description: "Update an existing workflow in n8n. Use after get-workflow to modify a workflow's properties, nodes, or connections. IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            id: { type: "string" },
            workflow: {
              type: "object",
              properties: {
                name: { type: "string" },
                active: { type: "boolean" },
                nodes: { type: "array" },
                connections: { type: "object" },
                settings: { type: "object" }
              }
            }
          },
          required: ["clientId", "id", "workflow"]
        }
      },
      {
        name: "delete-workflow",
        description: "Delete a workflow by ID. This action cannot be undone. IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            id: { type: "string" }
          },
          required: ["clientId", "id"]
        }
      },
      {
        name: "activate-workflow",
        description: "Activate a workflow by ID. This will enable the workflow to run. IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            id: { type: "string" }
          },
          required: ["clientId", "id"]
        }
      },
      {
        name: "deactivate-workflow",
        description: "Deactivate a workflow by ID. This will prevent the workflow from running. IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            id: { type: "string" }
          },
          required: ["clientId", "id"]
        }
      },
      {
        name: "list-projects",
        description: "List all projects from n8n. NOTE: Requires n8n Enterprise license with project management features enabled. IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" }
          },
          required: ["clientId"]
        }
      },
      {
        name: "create-project",
        description: "Create a new project in n8n. NOTE: Requires n8n Enterprise license with project management features enabled. IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            name: { type: "string" }
          },
          required: ["clientId", "name"]
        }
      },
      {
        name: "delete-project",
        description: "Delete a project by ID. NOTE: Requires n8n Enterprise license with project management features enabled. IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            projectId: { type: "string" }
          },
          required: ["clientId", "projectId"]
        }
      },
      {
        name: "update-project",
        description: "Update a project's name. NOTE: Requires n8n Enterprise license with project management features enabled. IMPORTANT: Arguments must be provided as compact, single-line JSON without whitespace or newlines.",
        inputSchema: {
          type: "object",
          properties: {
            clientId: { type: "string" },
            projectId: { type: "string" },
            name: { type: "string" }
          },
          required: ["clientId", "projectId", "name"]
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

    case "get-workflow": {
      const { clientId, id } = args as { clientId: string; id: string };
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
        const workflow = await client.getWorkflow(id);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(workflow, null, 2),
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

    case "update-workflow": {
      const { clientId, id, workflow } = args as {
        clientId: string;
        id: string;
        workflow: Partial<N8nWorkflow>;
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
        const updatedWorkflow = await client.updateWorkflow(id, workflow);
        return {
          content: [{
            type: "text",
            text: `Successfully updated workflow:\n${JSON.stringify(updatedWorkflow, null, 2)}`,
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

    case "delete-workflow": {
      const { clientId, id } = args as { clientId: string; id: string };
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
        const workflow = await client.deleteWorkflow(id);
        return {
          content: [{
            type: "text",
            text: `Successfully deleted workflow:\n${JSON.stringify(workflow, null, 2)}`,
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

    case "activate-workflow": {
      const { clientId, id } = args as { clientId: string; id: string };
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
        const workflow = await client.activateWorkflow(id);
        return {
          content: [{
            type: "text",
            text: `Successfully activated workflow:\n${JSON.stringify(workflow, null, 2)}`,
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

    case "deactivate-workflow": {
      const { clientId, id } = args as { clientId: string; id: string };
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
        const workflow = await client.deactivateWorkflow(id);
        return {
          content: [{
            type: "text",
            text: `Successfully deactivated workflow:\n${JSON.stringify(workflow, null, 2)}`,
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

    case "list-projects": {
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
        const projects = await client.listProjects();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(projects.data, null, 2),
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

    case "create-project": {
      const { clientId, name } = args as { clientId: string; name: string };
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
        await client.createProject(name);
        return {
          content: [{
            type: "text",
            text: `Successfully created project: ${name}`,
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

    case "delete-project": {
      const { clientId, projectId } = args as { clientId: string; projectId: string };
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
        await client.deleteProject(projectId);
        return {
          content: [{
            type: "text",
            text: `Successfully deleted project with ID: ${projectId}`,
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

    case "update-project": {
      const { clientId, projectId, name } = args as { clientId: string; projectId: string; name: string };
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
        await client.updateProject(projectId, name);
        return {
          content: [{
            type: "text",
            text: `Successfully updated project ${projectId} with new name: ${name}`,
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
