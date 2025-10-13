#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

/**
 * Auto-discover Joplin API token from settings.json
 */
function discoverJoplinToken(): string | null {
  try {
    // Determine settings path based on OS
    let settingsPath: string;
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS
      settingsPath = join(homedir(), 'Library', 'Application Support', 'joplin-desktop', 'settings.json');
    } else if (platform === 'win32') {
      // Windows
      settingsPath = join(process.env.APPDATA || '', 'joplin-desktop', 'settings.json');
    } else {
      // Linux and others
      settingsPath = join(homedir(), '.config', 'joplin-desktop', 'settings.json');
    }

    // Check if settings file exists
    if (!existsSync(settingsPath)) {
      console.error(`[Info] Joplin settings not found at: ${settingsPath}`);
      return null;
    }

    // Read and parse settings.json
    const settingsContent = readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(settingsContent);

    if (!settings['api.token']) {
      console.error('[Info] API token not found in Joplin settings');
      console.error('[Info] Make sure Web Clipper is enabled in Joplin settings');
      return null;
    }

    const token = settings['api.token'];
    console.error('[Info] Successfully auto-discovered Joplin API token');
    return token;
  } catch (error) {
    console.error('[Warning] Failed to auto-discover Joplin token:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * HTTP client for Joplin Data API
 */
class JoplinApiClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    const rawPort = process.env.JOPLIN_PORT;
    let port = '41184';
    if (rawPort) {
      const parsedPort = parseInt(rawPort, 10);
      if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
        port = parsedPort.toString();
      } else {
        console.error(`[Warning] Invalid JOPLIN_PORT: "${rawPort}". Falling back to default port 41184.`);
      }
    }
    this.baseUrl = `http://localhost:${port}`;

    // Try to get token from: 1) env var, 2) auto-discovery
    this.token = process.env.JOPLIN_TOKEN || discoverJoplinToken() || '';

    if (!this.token) {
      console.error('[Error] Could not find Joplin API token');
      console.error('[Info] Please ensure:');
      console.error('  1. Joplin desktop app is installed');
      console.error('  2. Web Clipper is enabled in Settings → Web Clipper');
      console.error('[Info] Alternatively, set JOPLIN_TOKEN environment variable');
    }
  }

  private async request(method: string, endpoint: string, body?: any): Promise<any> {
    const url = new URL(endpoint, this.baseUrl);
    url.searchParams.append('token', this.token);

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url.toString(), options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Joplin API error (${response.status}): ${errorText}`);
      }

      // Handle empty responses (like DELETE)
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to connect to Joplin: ${error.message}`);
      }
      throw error;
    }
  }

  // Test connection
  async ping(): Promise<string> {
    return this.request('GET', '/ping');
  }

  // Notebook (Folder) operations
  async listNotebooks(): Promise<any> {
    return this.request('GET', '/folders?fields=id,title,parent_id,created_time,updated_time,user_created_time,user_updated_time');
  }

  async createNotebook(title: string, parentId?: string): Promise<any> {
    const body: any = { title };
    if (parentId) body.parent_id = parentId;
    return this.request('POST', '/folders', body);
  }

  async getNotebookNotes(notebookId: string, fields?: string): Promise<any> {
    const fieldsParam = fields || 'id,title,body,parent_id,created_time,updated_time,user_created_time,user_updated_time,is_todo,todo_completed';
    return this.request('GET', `/folders/${notebookId}/notes?fields=${fieldsParam}`);
  }

  async deleteNotebook(notebookId: string): Promise<any> {
    return this.request('DELETE', `/folders/${notebookId}`);
  }

  // Note operations
  async searchNotes(query: string, type?: string): Promise<any> {
    let url = `/search?query=${encodeURIComponent(query)}`;
    if (type) url += `&type=${type}`;
    return this.request('GET', url);
  }

  async getNote(noteId: string, fields?: string): Promise<any> {
    const fieldsParam = fields || 'id,title,body,parent_id,created_time,updated_time,user_created_time,user_updated_time,is_todo,todo_completed,tags';
    return this.request('GET', `/notes/${noteId}?fields=${fieldsParam}`);
  }

  async createNote(title: string, body: string, notebookId?: string, tags?: string): Promise<any> {
    const noteData: any = { title, body };
    if (notebookId) noteData.parent_id = notebookId;
    if (tags) noteData.tags = tags;
    return this.request('POST', '/notes', noteData);
  }

  async updateNote(noteId: string, updates: any): Promise<any> {
    return this.request('PUT', `/notes/${noteId}`, updates);
  }

  async appendToNote(noteId: string, content: string): Promise<any> {
    const note = await this.getNote(noteId, 'id,body');
    const updatedBody = note.body + '\n\n' + content;
    return this.updateNote(noteId, { body: updatedBody });
  }

  async prependToNote(noteId: string, content: string): Promise<any> {
    const note = await this.getNote(noteId, 'id,body');
    const updatedBody = content + '\n\n' + note.body;
    return this.updateNote(noteId, { body: updatedBody });
  }

  async deleteNote(noteId: string, permanent: boolean = false): Promise<any> {
    const url = permanent ? `/notes/${noteId}?permanent=1` : `/notes/${noteId}`;
    return this.request('DELETE', url);
  }

  async moveNoteToNotebook(noteId: string, notebookId: string): Promise<any> {
    return this.updateNote(noteId, { parent_id: notebookId });
  }
}

class JoplinServer {
  private server: Server;
  private apiClient: JoplinApiClient;

  constructor() {
    this.server = new Server(
      {
        name: 'joplin-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.apiClient = new JoplinApiClient();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Notebook Management
          {
            name: 'list_notebooks',
            description: 'List all notebooks (folders) in Joplin. Returns notebook ID, title, parent ID, and timestamps.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'create_notebook',
            description: 'Create a new notebook in Joplin. Optionally nest it under a parent notebook.',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'The title of the new notebook',
                },
                parent_id: {
                  type: 'string',
                  description: 'Optional: ID of the parent notebook for nesting',
                },
              },
              required: ['title'],
            },
          },
          {
            name: 'get_notebook_notes',
            description: 'Get all notes from a specific notebook. Returns note titles, IDs, and metadata.',
            inputSchema: {
              type: 'object',
              properties: {
                notebook_id: {
                  type: 'string',
                  description: 'The ID of the notebook',
                },
              },
              required: ['notebook_id'],
            },
          },
          {
            name: 'delete_notebook',
            description: 'Delete a notebook. The notebook must be empty.',
            inputSchema: {
              type: 'object',
              properties: {
                notebook_id: {
                  type: 'string',
                  description: 'The ID of the notebook to delete',
                },
              },
              required: ['notebook_id'],
            },
          },
          {
            name: 'move_note_to_notebook',
            description: 'Move a note to a different notebook.',
            inputSchema: {
              type: 'object',
              properties: {
                note_id: {
                  type: 'string',
                  description: 'The ID of the note to move',
                },
                notebook_id: {
                  type: 'string',
                  description: 'The ID of the destination notebook',
                },
              },
              required: ['note_id', 'notebook_id'],
            },
          },

          // Note Operations
          {
            name: 'search_notes',
            description: 'Search for notes using keywords. Supports wildcards (*). Can optionally filter by type (note, folder, tag).',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (supports wildcards with *)',
                },
                type: {
                  type: 'string',
                  description: 'Optional: Filter by type (note, folder, tag)',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_note',
            description: 'Get the full content of a specific note by ID. Returns title, body (content), notebook, timestamps, and tags.',
            inputSchema: {
              type: 'object',
              properties: {
                note_id: {
                  type: 'string',
                  description: 'The ID of the note',
                },
              },
              required: ['note_id'],
            },
          },
          {
            name: 'create_note',
            description: 'Create a new note with title and body content. Optionally specify notebook and tags.',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'The title of the note',
                },
                body: {
                  type: 'string',
                  description: 'The content of the note (Markdown format)',
                },
                notebook_id: {
                  type: 'string',
                  description: 'Optional: ID of the notebook to place the note in (defaults to default notebook)',
                },
                tags: {
                  type: 'string',
                  description: 'Optional: Comma-separated list of tag names',
                },
              },
              required: ['title', 'body'],
            },
          },
          {
            name: 'update_note',
            description: 'Update an existing note. Can update title, body, notebook, or tags.',
            inputSchema: {
              type: 'object',
              properties: {
                note_id: {
                  type: 'string',
                  description: 'The ID of the note to update',
                },
                title: {
                  type: 'string',
                  description: 'Optional: New title for the note',
                },
                body: {
                  type: 'string',
                  description: 'Optional: New body content (replaces existing content)',
                },
                notebook_id: {
                  type: 'string',
                  description: 'Optional: Move note to a different notebook',
                },
                tags: {
                  type: 'string',
                  description: 'Optional: Comma-separated list of tag names',
                },
              },
              required: ['note_id'],
            },
          },
          {
            name: 'append_to_note',
            description: 'Append content to the end of an existing note.',
            inputSchema: {
              type: 'object',
              properties: {
                note_id: {
                  type: 'string',
                  description: 'The ID of the note',
                },
                content: {
                  type: 'string',
                  description: 'Content to append',
                },
              },
              required: ['note_id', 'content'],
            },
          },
          {
            name: 'prepend_to_note',
            description: 'Prepend content to the beginning of an existing note.',
            inputSchema: {
              type: 'object',
              properties: {
                note_id: {
                  type: 'string',
                  description: 'The ID of the note',
                },
                content: {
                  type: 'string',
                  description: 'Content to prepend',
                },
              },
              required: ['note_id', 'content'],
            },
          },
          {
            name: 'delete_note',
            description: 'Delete a note (moves it to the trash).',
            inputSchema: {
              type: 'object',
              properties: {
                note_id: {
                  type: 'string',
                  description: 'The ID of the note to delete',
                },
              },
              required: ['note_id'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error('Missing arguments');
      }

      try {
        switch (name) {
          // Notebook Management
          case 'list_notebooks': {
            const result = await this.apiClient.listNotebooks();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'create_notebook': {
            const result = await this.apiClient.createNotebook(
              args.title as string,
              args.parent_id as string | undefined
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Created notebook: ${result.title} (ID: ${result.id})`,
                },
              ],
            };
          }

          case 'get_notebook_notes': {
            const result = await this.apiClient.getNotebookNotes(args.notebook_id as string);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'delete_notebook': {
            await this.apiClient.deleteNotebook(args.notebook_id as string);
            return {
              content: [
                {
                  type: 'text',
                  text: `Deleted notebook ${args.notebook_id}`,
                },
              ],
            };
          }

          case 'move_note_to_notebook': {
            await this.apiClient.moveNoteToNotebook(
              args.note_id as string,
              args.notebook_id as string
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Moved note ${args.note_id} to notebook ${args.notebook_id}`,
                },
              ],
            };
          }

          // Note Operations
          case 'search_notes': {
            const result = await this.apiClient.searchNotes(
              args.query as string,
              args.type as string | undefined
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'get_note': {
            const result = await this.apiClient.getNote(args.note_id as string);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'create_note': {
            const result = await this.apiClient.createNote(
              args.title as string,
              args.body as string,
              args.notebook_id as string | undefined,
              args.tags as string | undefined
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Created note: ${result.title} (ID: ${result.id})`,
                },
              ],
            };
          }

          case 'update_note': {
            const updates: any = {};
            if (args.title) updates.title = args.title;
            if (args.body) updates.body = args.body;
            if (args.notebook_id) updates.parent_id = args.notebook_id;
            if (args.tags) updates.tags = args.tags;

            const result = await this.apiClient.updateNote(args.note_id as string, updates);
            return {
              content: [
                {
                  type: 'text',
                  text: `Updated note: ${result.title} (ID: ${result.id})`,
                },
              ],
            };
          }

          case 'append_to_note': {
            await this.apiClient.appendToNote(
              args.note_id as string,
              args.content as string
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Appended content to note ${args.note_id}`,
                },
              ],
            };
          }

          case 'prepend_to_note': {
            await this.apiClient.prependToNote(
              args.note_id as string,
              args.content as string
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Prepended content to note ${args.note_id}`,
                },
              ],
            };
          }

          case 'delete_note': {
            await this.apiClient.deleteNote(
              args.note_id as string,
              false
            );
            return {
              content: [
                {
                  type: 'text',
                  text: `Moved note to trash: ${args.note_id}`,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Joplin MCP server running on stdio');

    // Test connection to Joplin
    try {
      await this.apiClient.ping();
      console.error('Successfully connected to Joplin');
    } catch (error) {
      console.error('[Warning] Could not connect to Joplin. Please ensure:');
      console.error('  1. The Joplin desktop application is running.');
      console.error('  2. The Web Clipper service is enabled in Joplin (Settings → Web Clipper).');
      console.error('If auto-discovery of the API token fails, you may also need to set the JOPLIN_TOKEN environment variable manually.');
    }
  }
}

const server = new JoplinServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
