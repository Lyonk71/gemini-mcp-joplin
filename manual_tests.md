# Manual Testing Checklist for P3 Features

## Prerequisites

1. Ensure Joplin desktop app is running
2. Web Clipper is enabled in Joplin (Settings → Web Clipper)
3. You have some existing notes, notebooks, and tags to test with

## Manual Test Checklist

### Test 1: get_notebook_by_id

```bash
# First, get a list of notebooks to find an ID
"List all my notebooks"

# Then get details for a specific notebook
"Get details for notebook [paste-notebook-id-here]"

# Expected: Should show notebook title, parent_id, timestamps
```

### Test 2: get_tag_by_id

```bash
# First, get a list of tags to find an ID
"List all my tags"

# Then get details for a specific tag
"Get details for tag [paste-tag-id-here]"

# Expected: Should show tag title, created_time, updated_time
```

### Test 3: delete_tag

**⚠️ Warning: This will remove the tag from all notes!**

```bash
# First, create a test tag to safely delete
"Create a note called 'Delete Tag Test' and tag it with 'test-delete-me'"

# List tags to get the ID of the test tag
"List all my tags"

# Delete the test tag
"Delete the tag with ID [paste-tag-id-here]"

# Verify it's gone
"List all my tags"
"Get the note 'Delete Tag Test'" # Should no longer have the tag

# Expected: Tag should be removed from system and from all notes
```

### Test 4: list_all_revisions

```bash
# First, create a note with some edits to generate revision history
"Create a note called 'Revision Test' with body 'Version 1'"
"Update the 'Revision Test' note to say 'Version 2'"
"Update the 'Revision Test' note to say 'Version 3'"

# Get the note ID
"Search for the 'Revision Test' note"

# List all revisions across all notes
"List all revisions"

# Find revisions for your specific note by filtering the item_id field
# Expected: Should show revisions with item_id matching your note ID

# Note: The Joplin API doesn't support filtering revisions by note directly.
# You get all revisions and need to filter by item_id to find a specific note's history.
```

### Test 5: get_revision

```bash
# Using the revision list from Test 4, pick a revision ID where item_id matches your note
"Get details for revision [paste-revision-id-here]"

# Expected: Should show:
# - item_id (the note ID this revision belongs to)
# - item_updated_time (when the note was updated)
# - title_diff (changes to title, may be empty)
# - body_diff (changes to content, may be empty)
# - metadata_diff (changes to other fields, may be empty)
# - timestamps
```

### Test 6: Sorting on revisions

```bash
# Get revisions sorted oldest first
"List all revisions sorted by created_time in ascending order"

# Expected: Should show oldest revisions first across all notes
```

### Test 7: Integration Test - Complete Workflow

```bash
# 1. Create a notebook
"Create a notebook called 'Test Workflow'"

# 2. Get notebook details by ID
"List all notebooks" # Get the ID
"Get details for notebook [notebook-id]"

# 3. Create a note in that notebook with tags
"Create a note 'Workflow Note' in the 'Test Workflow' notebook and tag it with 'workflow-test'"

# 4. Update the note a few times
"Update 'Workflow Note' to say 'Version 2'"
"Update 'Workflow Note' to say 'Version 3'"

# 5. View revision history
"Show me the version history for 'Workflow Note'"

# 6. Get a specific revision
"Get details for revision [revision-id]"

# 7. Clean up - delete the test tag
"List all tags" # Get the tag ID
"Delete tag [tag-id]"

# Expected: All operations should work smoothly together
```

## Edge Cases to Test

### Edge Case 1: Non-existent IDs

```bash
"Get notebook with ID 'nonexistent123'"
"Get tag with ID 'fake-tag-id'"
"Get revision with ID 'invalid-revision'"

# Expected: Should return appropriate error messages
```

### Edge Case 2: Note with no revisions

```bash
# If note versioning is disabled in Joplin, or for a brand new note
"Create a note 'No History' with body 'Just created'"
"List revisions for this note"

# Expected: Might return empty list or single revision depending on Joplin settings
```

### Edge Case 3: Custom fields

```bash
"Get notebook [id] with only the fields: id,title"
"Get tag [id] with only the field: title"

# Expected: Should return only requested fields
```

## Success Criteria

- ✅ All get operations return valid data
- ✅ delete_tag removes tag from all notes
- ✅ Revision history shows multiple versions
- ✅ Revision diffs show what changed between versions
- ✅ Sorting and field selection work as expected
- ✅ Error handling works for invalid IDs
- ✅ No crashes or unexpected errors

## Notes

- Test all features with the Gemini CLI interface
- Report any issues or unexpected behavior
- Check that all data returned is formatted correctly
- Verify that error messages are clear and helpful
