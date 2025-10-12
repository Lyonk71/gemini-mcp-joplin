# Gemini Joplin Extension

A Gemini CLI extension for interacting with the Joplin note-taking application.

## Prerequisites

1. **Joplin Desktop App** - Must be installed and running
2. **Web Clipper Enabled** - In Joplin: `Settings/Options → Web Clipper` → Enable the service

That's it! The extension automatically discovers your API token from Joplin's database.

## Installation

```bash
gemini extensions install path/to/gemini-mcp-joplin
```

## Setup

### Simple Setup (Recommended)

1. Install and run Joplin desktop app
2. Enable Web Clipper: `Settings → Web Clipper` → Toggle "Enable Web Clipper service"
3. **Done!** The extension automatically finds your API token

### Advanced: Manual Token Configuration (Optional)

If auto-discovery doesn't work, or you want to override the token:

```bash
export JOPLIN_TOKEN="your_token_here"
```

To find your token manually: `Settings → Web Clipper → Advanced Options → Copy token`

You can also set it in the extension config:

```json
{
  "joplin": {
    "env": {
      "JOPLIN_TOKEN": "your_token_here"
    }
  }
}
```

## Features

### Notebook Management
- **List notebooks** - View all your notebooks with IDs and metadata
- **Create notebooks** - Create new notebooks (with optional nesting)
- **Get notebook notes** - List all notes in a specific notebook
- **Move notes** - Move notes between notebooks

### Note Operations
- **Search notes** - Find notes by keyword, with wildcard support
- **Get note content** - Retrieve full note details including body, tags, and metadata
- **Create notes** - Create new notes with title, body, notebook, and tags
- **Update notes** - Modify note title, content, notebook, or tags
- **Append/Prepend** - Add content to existing notes
- **Delete notes** - Move notes to trash or permanently delete

## Usage Examples

### Natural Language Queries

The extension works with natural language queries in Gemini CLI:

```bash
# Search for notes
"Do I have any notes about setting up Arch Linux?"

# Summarize notebook contents
"Can you summarize the notes in my 'MVP' notebook?"

# Create a note
"Create a new note in the MVP notebook with the summary you just provided"

# Organize notes
"Find all notes that haven't been updated in over a year and move them to an Archive notebook"

# List notebooks
"Show me all my notebooks"
```

### Using the `/joplin` Command

You can also explicitly invoke the Joplin extension:

```bash
/joplin search for notes about kubernetes
```

## Available MCP Tools

The extension provides these tools that Gemini can use:

### Notebooks
- `list_notebooks` - List all notebooks
- `create_notebook` - Create a new notebook
- `get_notebook_notes` - Get all notes from a notebook
- `move_note_to_notebook` - Move a note to a different notebook

### Notes
- `search_notes` - Search notes by keyword
- `get_note` - Get full note content by ID
- `create_note` - Create a new note
- `update_note` - Update note properties
- `append_to_note` - Append content to a note
- `prepend_to_note` - Prepend content to a note
- `delete_note` - Delete or trash a note

## Troubleshooting

### "Could not find Joplin API token"

The extension tries to automatically discover your token from Joplin's database. If this fails:

**Check that:**
1. Joplin desktop app is installed
2. You've run Joplin at least once (to create the database)
3. Web Clipper service is enabled in Settings → Web Clipper

**Database locations:**
- Linux: `~/.config/joplin-desktop/database.sqlite`
- macOS: `~/Library/Application Support/joplin-desktop/database.sqlite`
- Windows: `%APPDATA%/joplin-desktop/database.sqlite`

**Manual override:**
If auto-discovery doesn't work, you can manually set the `JOPLIN_TOKEN` environment variable.

### "Could not connect to Joplin"

Make sure:
1. Joplin desktop app is running
2. Web Clipper service is enabled
3. Joplin is listening on port 41184 (default)

You can check the Web Clipper status in `Tools → Web Clipper Options`.

### Custom Port

If Joplin is running on a different port:

```bash
export JOPLIN_PORT="12345"  # Your custom port
```

## How It Works

The extension:
1. **Auto-discovers** your API token from Joplin's SQLite database (on first startup)
2. **Caches** the token in memory for fast API calls
3. **Uses** the Joplin Data API (REST interface) provided by the Web Clipper service

No manual token copying required!

## Development

### Build from Source

```bash
cd mcp-server
npm install
npm run build
```

### Run Tests

```bash
npm test
```

## Architecture

The extension uses the Joplin Data API (REST interface) provided by the Web Clipper service. Despite the name, this is a general-purpose API for accessing Joplin data, not just for web clipping.

**Technical Details:**
- API endpoint: `http://localhost:41184` (by default)
- Authentication: Token-based (query parameter)
- Token discovery: Automatic from SQLite database
- Protocol: REST over HTTP
- Data format: JSON

## License

Apache-2.0

## Contributing

Contributions are welcome! Please see [ROADMAP.md](ROADMAP.md) for planned features.
