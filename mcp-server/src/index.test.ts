import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { discoverJoplinToken, JoplinApiClient } from './index.js';
import * as fs from 'fs';
import * as os from 'os';

// Mock the fs and os modules
vi.mock('fs');
vi.mock('os');

describe('discoverJoplinToken', () => {
  const originalPlatform = process.platform;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Reset console.error spy
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Platform-specific paths', () => {
    it('should use correct path for macOS', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      vi.mocked(os.homedir).mockReturnValue('/Users/testuser');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ 'api.token': 'test-token-macos' }),
      );

      const token = discoverJoplinToken();

      expect(fs.existsSync).toHaveBeenCalledWith(
        '/Users/testuser/Library/Application Support/joplin-desktop/settings.json',
      );
      expect(token).toBe('test-token-macos');
    });

    it('should use correct path for Linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      vi.mocked(os.homedir).mockReturnValue('/home/testuser');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ 'api.token': 'test-token-linux' }),
      );

      const token = discoverJoplinToken();

      expect(fs.existsSync).toHaveBeenCalledWith(
        '/home/testuser/.config/joplin-desktop/settings.json',
      );
      expect(token).toBe('test-token-linux');
    });

    it('should use correct path for Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.APPDATA = 'C:\\Users\\testuser\\AppData\\Roaming';
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ 'api.token': 'test-token-windows' }),
      );

      const token = discoverJoplinToken();

      expect(fs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining('joplin-desktop'),
      );
      expect(token).toBe('test-token-windows');
    });
  });

  describe('File existence checks', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      vi.mocked(os.homedir).mockReturnValue('/home/testuser');
    });

    it('should return null when settings file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const token = discoverJoplinToken();

      expect(token).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Joplin settings not found'),
      );
    });

    it('should handle when settings file exists but is empty', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{}');

      const token = discoverJoplinToken();

      expect(token).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('API token not found'),
      );
    });
  });

  describe('JSON parsing', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      vi.mocked(os.homedir).mockReturnValue('/home/testuser');
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('should parse valid JSON and extract token', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          'api.token': 'valid-token-123',
          'other.setting': 'value',
        }),
      );

      const token = discoverJoplinToken();

      expect(token).toBe('valid-token-123');
    });

    it('should handle malformed JSON gracefully', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      const token = discoverJoplinToken();

      expect(token).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to auto-discover'),
        expect.any(String),
      );
    });

    it('should handle file read errors', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const token = discoverJoplinToken();

      expect(token).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to auto-discover'),
        expect.stringContaining('Permission denied'),
      );
    });
  });

  describe('Token validation', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      vi.mocked(os.homedir).mockReturnValue('/home/testuser');
      vi.mocked(fs.existsSync).mockReturnValue(true);
    });

    it('should return null when api.token is missing', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ 'some.other.key': 'value' }),
      );

      const token = discoverJoplinToken();

      expect(token).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('API token not found'),
      );
    });

    it('should handle empty string token', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ 'api.token': '' }),
      );

      const token = discoverJoplinToken();

      // Empty string tokens are treated as missing
      expect(token).toBeNull();
    });

    it('should handle null token value', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ 'api.token': null }),
      );

      const token = discoverJoplinToken();

      expect(token).toBeNull();
    });
  });
});

describe('JoplinApiClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Port validation', () => {
    it('should use default port 41184 when JOPLIN_PORT is not set', () => {
      delete process.env.JOPLIN_PORT;
      process.env.JOPLIN_TOKEN = 'test-token';

      new JoplinApiClient();

      // Access the baseUrl through any public method call (will be tested via integration)
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid JOPLIN_PORT'),
      );
    });

    it('should use custom port when JOPLIN_PORT is valid', () => {
      process.env.JOPLIN_PORT = '12345';
      process.env.JOPLIN_TOKEN = 'test-token';

      new JoplinApiClient();

      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid JOPLIN_PORT'),
      );
    });

    it('should reject negative port numbers', () => {
      process.env.JOPLIN_PORT = '-100';
      process.env.JOPLIN_TOKEN = 'test-token';

      new JoplinApiClient();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JOPLIN_PORT: "-100"'),
      );
    });

    it('should reject port numbers above 65535', () => {
      process.env.JOPLIN_PORT = '99999';
      process.env.JOPLIN_TOKEN = 'test-token';

      new JoplinApiClient();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JOPLIN_PORT: "99999"'),
      );
    });

    it('should reject non-numeric port values', () => {
      process.env.JOPLIN_PORT = 'not-a-number';
      process.env.JOPLIN_TOKEN = 'test-token';

      new JoplinApiClient();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JOPLIN_PORT: "not-a-number"'),
      );
    });

    it('should reject port 0', () => {
      process.env.JOPLIN_PORT = '0';
      process.env.JOPLIN_TOKEN = 'test-token';

      new JoplinApiClient();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JOPLIN_PORT: "0"'),
      );
    });

    it('should accept port 1 (minimum valid port)', () => {
      process.env.JOPLIN_PORT = '1';
      process.env.JOPLIN_TOKEN = 'test-token';

      new JoplinApiClient();

      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid JOPLIN_PORT'),
      );
    });

    it('should accept port 65535 (maximum valid port)', () => {
      process.env.JOPLIN_PORT = '65535';
      process.env.JOPLIN_TOKEN = 'test-token';

      new JoplinApiClient();

      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid JOPLIN_PORT'),
      );
    });
  });

  describe('Token discovery', () => {
    it('should use JOPLIN_TOKEN environment variable when available', () => {
      process.env.JOPLIN_TOKEN = 'env-token';
      vi.mocked(fs.existsSync).mockReturnValue(false);

      new JoplinApiClient();

      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Could not find Joplin API token'),
      );
    });

    it('should fall back to auto-discovery when JOPLIN_TOKEN is not set', () => {
      delete process.env.JOPLIN_TOKEN;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      vi.mocked(os.homedir).mockReturnValue('/home/testuser');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ 'api.token': 'discovered-token' }),
      );

      new JoplinApiClient();

      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Could not find Joplin API token'),
      );
    });

    it('should warn when no token is found', () => {
      delete process.env.JOPLIN_TOKEN;
      vi.mocked(fs.existsSync).mockReturnValue(false);

      new JoplinApiClient();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Could not find Joplin API token'),
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Please ensure:'),
      );
    });
  });

  describe('API request error handling', () => {
    beforeEach(() => {
      process.env.JOPLIN_TOKEN = 'test-token';
      delete process.env.JOPLIN_PORT;
      // Reset fetch mock
      global.fetch = vi.fn();
    });

    it('should handle successful API responses', async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({ result: 'success' })),
      };
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const client = new JoplinApiClient();
      const result = await client.ping();

      expect(result).toEqual({ result: 'success' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:41184/ping?token=test-token'),
        expect.any(Object),
      );
    });

    it('should handle empty API responses (like DELETE)', async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(''),
      };
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const client = new JoplinApiClient();
      const result = await client.deleteNote('test-note-id', false);

      expect(result).toBeNull();
    });

    it('should throw error on HTTP error status', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue('Not Found'),
      };
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const client = new JoplinApiClient();

      await expect(client.ping()).rejects.toThrow(
        'Failed to connect to Joplin: Joplin API error (404): Not Found',
      );
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const client = new JoplinApiClient();

      await expect(client.ping()).rejects.toThrow(
        'Failed to connect to Joplin: Network error',
      );
    });

    it('should handle connection refused', async () => {
      vi.mocked(global.fetch).mockRejectedValue(
        new Error('connect ECONNREFUSED 127.0.0.1:41184'),
      );

      const client = new JoplinApiClient();

      await expect(client.ping()).rejects.toThrow(
        'Failed to connect to Joplin: connect ECONNREFUSED',
      );
    });

    it('should properly encode query parameters in search', async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({ items: [] })),
      };
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const client = new JoplinApiClient();
      await client.searchNotes('test query with spaces', 'note');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('query=test+query+with+spaces'),
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=note'),
        expect.any(Object),
      );
    });

    it('should send POST requests with JSON body', async () => {
      const mockResponse = {
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue(JSON.stringify({ id: '123', title: 'New Note' })),
      };
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const client = new JoplinApiClient();
      await client.createNote('Test Note', 'Test body', 'notebook-id');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Test Note',
            body: 'Test body',
            parent_id: 'notebook-id',
          }),
        }),
      );
    });

    it('should handle append to note correctly', async () => {
      const getNoteResponse = {
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue(
            JSON.stringify({ id: '123', body: 'Original content' }),
          ),
      };
      const updateNoteResponse = {
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue(
            JSON.stringify({ id: '123', body: 'Updated content' }),
          ),
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(getNoteResponse as unknown as Response)
        .mockResolvedValueOnce(updateNoteResponse as unknown as Response);

      const client = new JoplinApiClient();
      await client.appendToNote('123', 'New content');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      // Second call should be PUT with combined content
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ body: 'Original content\n\nNew content' }),
        }),
      );
    });

    it('should handle prepend to note correctly', async () => {
      const getNoteResponse = {
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue(
            JSON.stringify({ id: '123', body: 'Original content' }),
          ),
      };
      const updateNoteResponse = {
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue(
            JSON.stringify({ id: '123', body: 'Updated content' }),
          ),
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(getNoteResponse as unknown as Response)
        .mockResolvedValueOnce(updateNoteResponse as unknown as Response);

      const client = new JoplinApiClient();
      await client.prependToNote('123', 'New content');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      // Second call should be PUT with combined content
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ body: 'New content\n\nOriginal content' }),
        }),
      );
    });

    it('should use permanent delete flag when specified', async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue(''),
      };
      vi.mocked(global.fetch).mockResolvedValue(
        mockResponse as unknown as Response,
      );

      const client = new JoplinApiClient();
      await client.deleteNote('test-note-id', true);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('permanent=1'),
        expect.any(Object),
      );
    });
  });
});
