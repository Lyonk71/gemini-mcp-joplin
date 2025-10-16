# Joplin MCP Extension: Implementation Plan

**Goal**: Expose full Joplin API capabilities to maximize Gemini's effectiveness

**Estimated Total Effort**: 15-20 hours (P0-P3 complete)

**Strategy**: Implement changes, write/update unit tests as we go, commit after each item, manual testing at the very end

---

## Phase 0: P0 - Critical Quick Wins (~3 hours)

### [ ] 1. Update Search Query Syntax Documentation (5 minutes)

**File**: `mcp-server/src/index.ts`

**Change**: Update `search_notes` tool description (around line 783-800)

**Before**:

```typescript
description: 'Search for notes using keywords. Supports wildcards (*). Can optionally filter by type (note, folder, tag).',
```

**After**:

```typescript
description: `Search for notes using Joplin's powerful query syntax.

Basic syntax:
- Single/multiple words: "linux kernel" (AND logic by default)
- Phrases: "shopping list" (exact match)
- Wildcards: "swim*" (prefix matching)
- Exclusion: "-spam" (exclude term)

Field-specific filters:
- title:TERM - Search in title only
- body:TERM - Search in body only
- tag:TAG - Filter by tag (supports wildcards: tag:proj*)
- notebook:NAME - Filter by notebook name
- resource:MIME - Filter by attachment type (resource:image/*, resource:application/pdf)

Date filters (formats: YYYYMMDD, YYYYMM, YYYY, or relative like day-7, month-1, year-0):
- created:DATE - Filter by creation date
- updated:DATE - Filter by update date
- due:DATE - Filter by todo due date

Type filters:
- type:note|todo - Filter by item type
- iscompleted:0|1 - Filter completed/incomplete todos

Boolean logic:
- any:1 - Use OR instead of AND (example: "any:1 arch ubuntu" finds either)

Examples:
- Find Linux tutorials: "title:linux tag:tutorial"
- Recent work notes: "tag:work updated:month-1"
- Notes with images: "resource:image/*"
- Exclude archived: "project -tag:archived"
- Either/or search: "any:1 kubernetes docker"`,
```

**Unit Test**: Update existing search tests to verify documentation doesn't break functionality

**Commit Message**: `feat(search): document advanced Joplin query syntax for Gemini`

---

### [ ] 2. Add Sorting to `list_all_notes` (30 minutes)

**File**: `mcp-server/src/index.ts`

**Changes**:

**A. Update tool definition** (around line 699-712):

```typescript
{
  name: 'list_all_notes',
  description: 'List all notes in Joplin with optional sorting and filtering.',
  inputSchema: {
    type: 'object',
    properties: {
      include_deleted: {
        type: 'boolean',
        description: 'Include deleted notes in results (default: false)',
      },
      order_by: {
        type: 'string',
        description: 'Field to sort by: title, updated_time, created_time, user_updated_time, user_created_time (default: updated_time)',
      },
      order_dir: {
        type: 'string',
        enum: ['ASC', 'DESC'],
        description: 'Sort direction: ASC (ascending) or DESC (descending). Default: DESC. Example: order_by=updated_time, order_dir=DESC for most recent first',
      },
    },
  },
}
```

**B. Update handler** (around line 1132-1136):

```typescript
case 'list_all_notes': {
  const params = args as {
    include_deleted?: boolean;
    order_by?: string;
    order_dir?: 'ASC' | 'DESC';
  };

  const notes = await client.listAllNotes(
    params.include_deleted,
    params.order_by,
    params.order_dir
  );
  return { notes };
}
```

**C. Update API method** (around line 247-251):

```typescript
async listAllNotes(
  includeDeleted = false,
  orderBy?: string,
  orderDir?: 'ASC' | 'DESC'
): Promise<unknown> {
  const fields =
    'id,title,body,parent_id,created_time,updated_time,user_created_time,user_updated_time,is_todo,todo_completed';

  let url = `/notes?fields=${fields}`;
  if (includeDeleted) url += '&include_deleted=1';
  if (orderBy) url += `&order_by=${orderBy}`;
  if (orderDir) url += `&order_dir=${orderDir}`;

  return this.paginatedRequest(url);
}
```

**Unit Tests**: Add/update in `mcp-server/src/index.test.ts`:

```typescript
it('should list all notes with sorting', async () => {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({
      items: [{ id: '1', title: 'Note 1' }],
      has_more: false,
    }),
  });

  await client.listAllNotes(false, 'title', 'ASC');

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('order_by=title'),
    expect.anything(),
  );
  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('order_dir=ASC'),
    expect.anything(),
  );
});
```

Run tests: `npm test`

**Commit Message**: `feat(notes): add sorting parameters to list_all_notes`

---

### [ ] 3. Add Sorting to `list_notebooks` (20 minutes)

**File**: `mcp-server/src/index.ts`

**Changes**: Update tool definition, handler, and API method (same pattern as #2)

**Unit Tests**: Add similar sorting tests for notebooks

Run tests: `npm test`

**Commit Message**: `feat(notebooks): add sorting parameters to list_notebooks`

---

### [ ] 4. Add Sorting to `list_tags` (20 minutes)

**File**: `mcp-server/src/index.ts`

**Changes**: Same pattern as #2-3

**Unit Tests**: Add sorting tests for tags

Run tests: `npm test`

**Commit Message**: `feat(tags): add sorting parameters to list_tags`

---

### [ ] 5. Add Sorting to `list_all_resources` (20 minutes)

**File**: `mcp-server/src/index.ts`

**Changes**: Same pattern

**Unit Tests**: Add sorting tests for resources

Run tests: `npm test`

**Commit Message**: `feat(resources): add sorting parameters to list_all_resources`

---

### [ ] 6. Add Sorting to Relationship Methods (40 minutes)

Apply same pattern to:

- `get_notebook_notes`
- `get_notes_by_tag`
- `get_note_attachments`
- `get_resource_notes`

**Unit Tests**: Add sorting tests for each relationship method

Run tests: `npm test`

**Commit Message**: `feat(relationships): add sorting parameters to relationship queries`

---

### [ ] 7. Update Slash Command Tools (30 minutes)

**File**: `commands/joplin.toml`

**Change**: Add more tools beyond just `delete_notebook`

**After**:

```toml
[tools]
search_notes = {
  description = "Search for notes using query syntax",
  args = {
    query = "Search query with optional filters (title:, tag:, notebook:, etc.)"
  }
}

list_all_notes = {
  description = "List all notes with optional sorting",
  args = {
    order_by = "Field to sort by (optional)",
    order_dir = "ASC or DESC (optional)"
  }
}

create_note = {
  description = "Create a new note",
  args = {
    title = "Note title",
    body = "Note content",
    notebook_id = "Notebook ID (optional)",
    tags = "Comma-separated tags (optional)"
  }
}

get_note = {
  description = "Get a specific note by ID",
  args = {
    note_id = "The ID of the note"
  }
}

delete_notebook = {
  description = "Delete a notebook. The notebook must be empty.",
  args = {
    notebook_id = "The ID of the notebook to delete"
  }
}

list_notebooks = {
  description = "List all notebooks",
  args = {}
}

list_tags = {
  description = "List all tags",
  args = {}
}
```

**Unit Tests**: No automated tests needed for TOML file

**Commit Message**: `feat(commands): expand /joplin slash command tool definitions`

---

## Phase 1: P1 - High Impact Features (~3.5 hours)

### [ ] 8. Add Fields Parameter to `list_all_notes` (45 minutes)

**File**: `mcp-server/src/index.ts`

**Changes**: Add `fields` parameter to tool definition, handler, and API method

**Unit Tests**:

```typescript
it('should list notes with custom fields', async () => {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({
      items: [{ id: '1', title: 'Note 1' }],
      has_more: false,
    }),
  });

  await client.listAllNotes(false, undefined, undefined, 'id,title');

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('fields=id,title'),
    expect.anything(),
  );
});
```

Run tests: `npm test`

**Commit Message**: `feat(notes): add fields parameter for custom field selection`

---

### [ ] 9. Add Fields Parameter to Other List Operations (1 hour)

Apply to:

- `get_notebook_notes`
- `list_notebooks`
- `list_tags`
- `list_all_resources`
- `get_notes_by_tag`
- `get_note_attachments`
- `get_resource_notes`

**Unit Tests**: Add fields parameter tests for each

Run tests: `npm test`

**Commit Message**: `feat(api): add fields parameter to all list operations`

---

### [ ] 10. Add Todo Management to `create_note` (30 minutes)

**File**: `mcp-server/src/index.ts`

**Changes**: Add `is_todo`, `todo_due`, `todo_completed` parameters

**Unit Tests**:

```typescript
it('should create a todo with due date', async () => {
  const dueDate = Date.now() + 86400000; // Tomorrow
  mockFetch.mockResolvedValueOnce({
    json: async () => ({
      id: '1',
      title: 'Todo',
      is_todo: 1,
      todo_due: dueDate,
    }),
  });

  const result = await client.createNote(
    'Todo',
    'Body',
    undefined,
    undefined,
    1,
    dueDate,
  );

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('/notes'),
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"is_todo":1'),
    }),
  );
});
```

Run tests: `npm test`

**Commit Message**: `feat(notes): add todo management to create_note (is_todo, todo_due, todo_completed)`

---

### [ ] 11. Add Todo Management to `update_note` (30 minutes)

**File**: `mcp-server/src/index.ts`

**Changes**: Same pattern as create_note

**Unit Tests**: Add tests for updating todo fields

Run tests: `npm test`

**Commit Message**: `feat(notes): add todo management to update_note`

---

### [ ] 12. Add Pagination Control (30 minutes)

**File**: `mcp-server/src/index.ts`

**Changes**: Update `paginatedRequest` to accept custom limit

**Unit Tests**:

```typescript
it('should respect custom pagination limit', async () => {
  mockFetch.mockResolvedValueOnce({
    json: async () => ({ items: Array(10).fill({ id: '1' }), has_more: false }),
  });

  await client.listAllNotes(false, undefined, undefined, undefined, 10);

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('limit=10'),
    expect.anything(),
  );
});
```

Run tests: `npm test`

**Commit Message**: `feat(api): add pagination limit control to all list operations`

---

## Phase 2: P2 - Medium Impact Features (~2.5 hours)

### [ ] 13. Add Permanent Delete Option (30 minutes)

**File**: `mcp-server/src/index.ts`

**Changes**: Add `permanent` parameter to `delete_note` and `delete_notebook`

**Unit Tests**:

```typescript
it('should permanently delete note when flag is set', async () => {
  mockFetch.mockResolvedValueOnce({ json: async () => ({}) });

  await client.deleteNote('123', true);

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('permanent=1'),
    expect.objectContaining({ method: 'DELETE' }),
  );
});
```

Run tests: `npm test`

**Commit Message**: `feat(delete): add permanent delete option for notes and notebooks`

---

### [ ] 14. Add Author & Source URL Tracking (30 minutes)

**File**: `mcp-server/src/index.ts`

**Changes**: Add `author` and `source_url` parameters to `create_note` and `update_note`

**Unit Tests**: Add tests verifying these fields are included in API calls

Run tests: `npm test`

**Commit Message**: `feat(notes): add author and source_url tracking`

---

### [ ] 15. Add User Metadata Support (1 hour)

**File**: `mcp-server/src/index.ts`

**Changes**: Add `user_data` parameter to upload/update resource and create/update notebook

**Unit Tests**: Verify user_data is passed correctly

Run tests: `npm test`

**Commit Message**: `feat(metadata): add user_data custom metadata support`

---

### [ ] 16. Add Notebook Icon Support (30 minutes)

**File**: `mcp-server/src/index.ts`

**Changes**: Add `icon` parameter to `create_notebook` and `update_notebook`

**Unit Tests**: Verify icon field is sent in API calls

Run tests: `npm test`

**Commit Message**: `feat(notebooks): add icon support for notebook customization`

---

## Phase 3: P3 - Advanced Features (~6-12 hours)

### [ ] 17. Add Location Support (1 hour)

**File**: `mcp-server/src/index.ts`

**Changes**: Add `latitude`, `longitude`, `altitude` to `create_note` and `update_note`

**Unit Tests**: Verify location fields are sent

Run tests: `npm test`

**Commit Message**: `feat(notes): add geo-tagging support with location fields`

---

### [ ] 18. Add HTML Format Support (1 hour)

**File**: `mcp-server/src/index.ts`

**Changes**: Add `markup_language` and `body_html` to `create_note` and `update_note`

**Unit Tests**: Verify HTML format is handled correctly

Run tests: `npm test`

**Commit Message**: `feat(notes): add HTML format support for rich text content`

---

### [ ] 19. Implement `delete_tag` Tool (30 minutes)

**File**: `mcp-server/src/index.ts`

**New tool + API method**

**Unit Tests**: Add test for delete_tag

Run tests: `npm test`

**Commit Message**: `feat(tags): implement delete_tag tool`

---

### [ ] 20. Implement `get_notebook_by_id` Tool (20 minutes)

**File**: `mcp-server/src/index.ts`

**New tool + API method**

**Unit Tests**: Add test for get_notebook_by_id

Run tests: `npm test`

**Commit Message**: `feat(notebooks): implement get_notebook_by_id tool`

---

### [ ] 21. Implement `get_tag_by_id` Tool (20 minutes)

**File**: `mcp-server/src/index.ts`

**New tool + API method**

**Unit Tests**: Add test for get_tag_by_id

Run tests: `npm test`

**Commit Message**: `feat(tags): implement get_tag_by_id tool`

---

### [ ] 22. Add Revisions API Access (2-3 hours)

**File**: `mcp-server/src/index.ts`

**New tools**: `list_note_revisions`, `get_revision`

**Unit Tests**: Add tests for revision tools

Run tests: `npm test`

**Commit Message**: `feat(revisions): add version history access tools`

---

### [ ] 23. Add Events API Access (2-3 hours)

**File**: `mcp-server/src/index.ts`

**New tools**: `get_events`, `poll_events`

**Unit Tests**: Add tests for event tools

Run tests: `npm test`

**Commit Message**: `feat(events): add change tracking and sync monitoring tools`

---

## Manual Testing (AFTER ALL IMPLEMENTATION COMPLETE)

Once all phases are done and unit tests pass, run these manual tests with actual Gemini CLI:

### Search Tests

```bash
# Test 1: Basic keyword search
"Find notes about Python"

# Test 2: Field-specific search
"Find notes with 'installation' in the title and tagged 'linux'"

# Test 3: Tag filter
"Search for notes tagged 'tutorial'"

# Test 4: Notebook filter
"Find notes in the 'Work' notebook about meetings"

# Test 5: Date filter
"Show me notes updated in the last week"

# Test 6: Boolean OR
"Find notes about either Docker or Kubernetes"

# Test 7: Exclusion
"Search for Python notes but exclude anything about testing"

# Test 8: Resource filter
"Find notes with PDF attachments"

# Test 9: Combined filters
"Find Linux notes from last month tagged 'server' with images"

# Test 10: Todo search
"Show me all incomplete todos"
```

### Sorting Tests

```bash
# Test 1: Most recent notes
"Show me my 5 most recently updated notes"

# Test 2: Alphabetical notes
"List all my notes alphabetically"

# Test 3: Oldest notes
"Show me my oldest notes"

# Test 4: Alphabetical notebooks
"List my notebooks alphabetically"

# Test 5: Recent notebooks
"Show me my recently updated notebooks"

# Test 6: Alphabetical tags
"List all my tags alphabetically"

# Test 7: Largest attachments
"Show me my largest attachments"

# Test 8: Notes in notebook sorted
"Show me the most recent notes in my 'Work' notebook"

# Test 9: Tagged notes sorted
"List all notes tagged 'tutorial' alphabetically"
```

### Fields Tests

```bash
# Test 1: List without body
"List all my note titles and IDs only"

# Test 2: Include author
"List all notes with their authors"

# Test 3: Include source
"Show all notes with their source URLs"

# Test 4: Performance test
"List 100 notes with just IDs and titles" (note speed)
```

### Todo Management Tests

```bash
# Test 1: Create basic todo
"Create a todo called 'Buy groceries'"

# Test 2: Create todo with due date
"Create a todo 'Review PR' due tomorrow at 5pm"

# Test 3: Create completed todo
"Create a completed todo 'Finished task'"

# Test 4: Convert note to todo
"Convert the 'Project ideas' note into a todo"

# Test 5: Mark todo complete
"Mark the 'Buy groceries' todo as complete"

# Test 6: Mark todo incomplete
"Mark the 'Finish report' todo as incomplete"

# Test 7: Update due date
"Set the due date for 'Review PR' todo to next Monday"

# Test 8: Search incomplete todos
"Find all my incomplete todos"

# Test 9: Search overdue todos
"Find todos that are overdue"
```

### Pagination Tests

```bash
# Test 1: Limit results
"Show me just my 10 most recent notes"

# Test 2: Limit to 50
"List 50 notebooks"

# Test 3: Default behavior
"List all my notes" (should still work with default 100)
```

### Delete Tests

```bash
# Test 1: Regular delete (trash)
"Delete the 'Draft ideas' note"

# Test 2: Permanent delete (should ask for confirmation)
"Permanently delete the 'Spam note' note"

# Test 3: Delete notebook
"Delete the 'Old Projects' notebook"
```

### Metadata Tests

```bash
# Test 1: Create with author
"Create a note titled 'Research' by John Doe"

# Test 2: Create with source URL
"Create a note from this article: https://example.com"

# Test 3: Update author
"Update the 'Research' note author to Jane Smith"

# Test 4: Create notebook with icon
"Create a notebook called 'Work Projects' with a briefcase icon"
```

### Advanced Tests (P3)

```bash
# Test 1: Geo-tagged note
"Create a note 'Coffee shop visit' at coordinates 40.7128, -74.0060"

# Test 2: Update location
"Add location 37.7749, -122.4194 to the 'Meeting notes' note"

# Test 3: HTML note
"Create a note with HTML content: <h1>Title</h1><p>Content</p>"

# Test 4: Delete tag
"Delete the 'obsolete' tag"

# Test 5: Get notebook by ID
"Show me details for notebook ID [your-notebook-id]"

# Test 6: Get tag by ID
"Show me details for tag ID [your-tag-id]"

# Test 7: View revisions (if implemented)
"Show me the version history for the 'Project Plan' note"

# Test 8: Events (if implemented)
"What changes have been made recently?"
```

### Integration Workflows

```bash
# Workflow 1: Search → Get → Update
"Find the note about Docker, then update it to add 'tested on Ubuntu 22.04'"

# Workflow 2: Create → Tag → Move
"Create a note 'Meeting notes', tag it with 'work' and 'meetings', then move it to the 'Work' notebook"

# Workflow 3: Todo workflow
"Create a todo 'Finish report' due Friday, then when I tell you it's done, mark it complete"

# Workflow 4: Search and organize
"Find all notes about Kubernetes and tag them with 'container-tech'"

# Workflow 5: Complex search and action
"Find all notes from last year that are tagged 'draft' and don't have any images, then list them for me"
```

### Slash Command Tests

```bash
# Test 1
/joplin search for notes about kubernetes

# Test 2
/joplin list all my notebooks

# Test 3
/joplin create a note called "Test Note"

# Test 4
/joplin get note [note-id]
```

### Edge Cases

```bash
# Test 1: Empty results
"Find notes about xyzabc123nonexistent"

# Test 2: Special characters
"Search for notes containing \"quotes\" and 'apostrophes'"

# Test 3: Very long query
"Find notes about [very long multi-paragraph query]"

# Test 4: Unicode/emoji
"Create a note with emoji in the title: 🚀 Rocket Project"

# Test 5: No changes update
"Update note [id] with the same title it already has"
```

---

## Success Criteria

**Unit Tests**:

- ✅ All existing tests still pass
- ✅ All new tests pass
- ✅ Code coverage maintained or improved

**Manual Tests**:

- ✅ All search syntax variations work correctly
- ✅ All sorting options work as expected
- ✅ Fields parameter improves performance noticeably
- ✅ Todo management workflow is seamless
- ✅ No regressions in existing functionality
- ✅ Gemini understands and uses new capabilities appropriately

**API Coverage**:

- ✅ P0-P1: ~85% of Joplin API exposed
- ✅ P2: ~90% of Joplin API exposed
- ✅ P3: ~95% of Joplin API exposed

---

## Timeline Estimate

- **P0**: 1-2 days (3 hours implementation + unit tests)
- **P1**: 1-2 days (3.5 hours implementation + unit tests)
- **P2**: 1 day (2.5 hours implementation + unit tests)
- **P3**: 2-3 days (6-12 hours implementation + unit tests)
- **Manual Testing**: 2-3 hours (run through all manual tests)

**Total**: 6-10 days for full implementation, automated testing, and manual verification

---

## Next Steps

1. ✅ Review this plan
2. Start with P0 item #1
3. For each item:
   - Implement the feature
   - Write/update unit tests
   - Run `npm test` to verify
   - Commit with the specified message
4. Complete all phases P0-P3
5. Run comprehensive manual test suite
6. Fix any issues found
7. Ship it! 🚀
