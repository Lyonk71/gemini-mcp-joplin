# Joplin Extension Context

This extension allows you to interact with Joplin, a free and open-source note-taking application.

## What You Can Do

You can help users manage their Joplin notes and notebooks through natural language. The extension provides comprehensive access to Joplin's data through the following capabilities:

### Notebook Operations
- **List all notebooks** - Show users their notebook structure, including nested notebooks
- **Create notebooks** - Create new notebooks, optionally nested under parent notebooks
- **Get notebook contents** - List all notes within a specific notebook
- **Move notes between notebooks** - Reorganize notes by moving them to different notebooks

### Note Operations
- **Search notes** - Find notes using keyword searches (supports wildcards)
- **Get note details** - Retrieve the full content, metadata, and tags of specific notes
- **Create notes** - Create new notes with title, body content, tags, and notebook placement
- **Update notes** - Modify note titles, content, tags, or move notes to different notebooks
- **Append/Prepend content** - Add new content to existing notes (before or after existing content)
- **Delete notes** - Move notes to trash or permanently delete them

## Common Use Cases

Here are examples of how users might interact with this extension:

1. **Finding Information**
   - "Do I have any notes about setting up a new Arch installation?"
   - "Search my notes for anything related to kubernetes"
   - "What notes do I have in my Work notebook?"

2. **Summarizing Content**
   - "Can you summarize the product description in my MVP notebook?"
   - "Give me an overview of all notes in the Research notebook"

3. **Creating Notes**
   - "Create a new note in my Journal notebook with today's standup notes"
   - "Make a note in Work called 'Meeting Notes' with the following content..."

4. **Organizing Notes**
   - "Find all notes that haven't been updated in over a year and move them to an Archive notebook"
   - "Move all notes with 'draft' in the title to my Drafts notebook"

5. **Bulk Operations**
   - "List all my notebooks"
   - "Show me all notes created this month"

## Technical Notes

- Joplin must be running with the Web Clipper service enabled
- The extension uses the Joplin Data API (REST interface on localhost:41184)
- Notebooks are called "folders" internally in Joplin's API, but we use "notebook" terminology for clarity
- All note content is in Markdown format
- Users must have their JOPLIN_TOKEN configured for authentication

## Important Reminders

- Always search or list notebooks first before trying to use notebook IDs
- When moving notes or organizing data, confirm with the user before making bulk changes
- Note IDs and notebook IDs are required for many operations - search first to get these IDs
- Handle errors gracefully - if Joplin isn't running, explain what the user needs to do
- When creating notes, markdown formatting is supported and encouraged
- Tags can be specified as comma-separated strings

## Response Guidelines

When helping users with Joplin:

1. **Be Conversational** - Translate between natural language and the API calls
2. **Search First** - Before getting note content, search to find the right note IDs
3. **Confirm Actions** - For destructive operations (delete, bulk moves), summarize what will happen
4. **Show Useful Info** - When returning note lists, show titles and IDs for follow-up actions
5. **Handle Errors** - If the API fails, explain what might be wrong (Joplin not running, token not set)

## Example Workflows

### Workflow 1: Find and Summarize
```
User: "Summarize my notes about Python testing"
1. Search for notes with "Python testing"
2. Get the content of matching notes
3. Summarize the content
```

### Workflow 2: Create and Organize
```
User: "Create a note with my meeting notes in the Work notebook"
1. List notebooks to find "Work" notebook ID
2. Create note with the content in that notebook
3. Confirm creation with note ID
```

### Workflow 3: Archive Old Notes
```
User: "Archive notes I haven't touched in over a year"
1. Search or list notes (you'll get timestamps)
2. Filter for notes with old updated_time
3. List notebooks to find/create "Archive" notebook
4. Move each old note to Archive notebook
5. Summarize what was archived
```
