# Joplin MCP Extension - High-Priority Feature Roadmap

This roadmap outlines high-priority features to implement in the gemini-mcp-joplin extension. Each section includes complete API specifications and implementation guidance.

---

## High Priority Features

- [ ] **1. List All Notes Globally**
- [ ] **2. List All Tags**
- [ ] **3. Get Notes by Tag**
- [ ] **4. Rename Tag**
- [ ] **5. Rename/Update Notebook**
- [ ] **6. Resources/Attachments - Basic Support**

---

### 1. List All Notes Globally

**Why**: Currently can only list notes by notebook. Users need to see all notes across all notebooks.

**API Endpoint**: `GET /notes`

**Query Parameters**:
- `fields` (string): Comma-separated list of fields to return
  - Default: `id,title,body,parent_id,created_time,updated_time,user_created_time,user_updated_time,is_todo,todo_completed`
- `limit` (number): Items per page (max 100, default 100)
- `page` (number): Page number (starts at 1)
- `order_by` (string): Field to sort by (e.g., `updated_time`)
- `order_dir` (string): `ASC` or `DESC`

**Optional Filters**:
- `include_deleted=1` - Include deleted notes
- `include_conflicts=1` - Include conflict notes

**Response Format**:
```json
{
  "items": [
    {
      "id": "abc123",
      "title": "My Note",
      "body": "Note content...",
      "parent_id": "notebook_id",
      "created_time": 1634567890000,
      "updated_time": 1634567890000,
      "user_created_time": 1634567890000,
      "user_updated_time": 1634567890000,
      "is_todo": 0,
      "todo_completed": 0
    }
  ],
  "has_more": false
}
```

**Implementation in `JoplinApiClient`**:
```typescript
async listAllNotes(fields?: string, includeDeleted = false): Promise<unknown> {
  const fieldsParam = fields ||
    'id,title,body,parent_id,created_time,updated_time,user_created_time,user_updated_time,is_todo,todo_completed';

  let endpoint = `/notes?fields=${fieldsParam}`;
  if (includeDeleted) {
    endpoint += '&include_deleted=1';
  }

  return this.paginatedRequest(endpoint);
}
```

**MCP Tool Definition**:
```typescript
{
  name: 'list_all_notes',
  description: 'List all notes across all notebooks. Returns note titles, IDs, content, and metadata. Optionally include deleted notes.',
  inputSchema: {
    type: 'object',
    properties: {
      include_deleted: {
        type: 'boolean',
        description: 'Include deleted notes (default: false)',
      },
    },
  },
}
```

**Handler**:
```typescript
case 'list_all_notes': {
  const result = await this.apiClient.listAllNotes(
    undefined,
    args.include_deleted as boolean | undefined,
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
```

---

### 2. List All Tags

**Why**: Essential for discovering what tags exist before querying notes by tag.

**API Endpoint**: `GET /tags`

**Query Parameters**:
- `fields` (string): Comma-separated fields (default: `id,title`)
- `limit` (number): Items per page (max 100)
- `page` (number): Page number

**Response Format**:
```json
{
  "items": [
    {
      "id": "tag123",
      "title": "project",
      "created_time": 1634567890000,
      "updated_time": 1634567890000
    }
  ],
  "has_more": false
}
```

**Implementation**:
```typescript
async listTags(): Promise<unknown> {
  return this.paginatedRequest('/tags?fields=id,title,created_time,updated_time');
}
```

**MCP Tool**:
```typescript
{
  name: 'list_tags',
  description: 'List all tags in Joplin. Returns tag IDs, names, and timestamps.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
}
```

**Handler**:
```typescript
case 'list_tags': {
  const result = await this.apiClient.listTags();
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
```

---

### 3. Get Notes by Tag

**Why**: Critical for tag-based workflows. "Show me all notes tagged 'project'".

**API Endpoint**: `GET /tags/{tag_id}/notes`

**Query Parameters**:
- `fields` (string): Fields to return
- `limit`, `page`: Pagination

**Response Format**:
```json
{
  "items": [
    {
      "id": "note123",
      "title": "Project Planning",
      "body": "Note content...",
      "parent_id": "notebook_id"
    }
  ],
  "has_more": false
}
```

**Implementation**:
```typescript
async getTagNotes(tagId: string, fields?: string): Promise<unknown> {
  const fieldsParam = fields ||
    'id,title,body,parent_id,created_time,updated_time,user_created_time,user_updated_time,is_todo,todo_completed';

  return this.paginatedRequest(`/tags/${tagId}/notes?fields=${fieldsParam}`);
}
```

**Helper Method** (for convenience - find tag by name then get notes):
```typescript
async getNotesByTagName(tagName: string): Promise<unknown> {
  // Search for tag by exact name
  const tags = (await this.searchNotes(tagName, 'tag')) as Array<{
    id: string;
    title: string;
  }>;

  const exactMatch = tags.find(
    (t) => t.title.toLowerCase() === tagName.toLowerCase()
  );

  if (!exactMatch) {
    throw new Error(`Tag not found: ${tagName}`);
  }

  return this.getTagNotes(exactMatch.id);
}
```

**MCP Tool**:
```typescript
{
  name: 'get_notes_by_tag',
  description: 'Get all notes that have a specific tag. Provide either tag_id or tag_name.',
  inputSchema: {
    type: 'object',
    properties: {
      tag_id: {
        type: 'string',
        description: 'The ID of the tag (use this OR tag_name)',
      },
      tag_name: {
        type: 'string',
        description: 'The name of the tag (use this OR tag_id)',
      },
    },
  },
}
```

**Handler**:
```typescript
case 'get_notes_by_tag': {
  let result;
  if (args.tag_id) {
    result = await this.apiClient.getTagNotes(args.tag_id as string);
  } else if (args.tag_name) {
    result = await this.apiClient.getNotesByTagName(args.tag_name as string);
  } else {
    throw new Error('Must provide either tag_id or tag_name');
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
```

---

### 4. Rename Tag

**Why**: Users need to reorganize and rename tags as their system evolves.

**API Endpoint**: `PUT /tags/{tag_id}`

**Request Body**:
```json
{
  "title": "new-tag-name"
}
```

**Response Format**:
```json
{
  "id": "tag123",
  "title": "new-tag-name",
  "updated_time": 1634567890000
}
```

**Implementation**:
```typescript
async renameTag(tagId: string, newName: string): Promise<unknown> {
  return this.request('PUT', `/tags/${tagId}`, { title: newName });
}
```

**Helper Method** (rename by name instead of ID):
```typescript
async renameTagByName(oldName: string, newName: string): Promise<unknown> {
  // Find tag by old name
  const tags = (await this.searchNotes(oldName, 'tag')) as Array<{
    id: string;
    title: string;
  }>;

  const exactMatch = tags.find(
    (t) => t.title.toLowerCase() === oldName.toLowerCase()
  );

  if (!exactMatch) {
    throw new Error(`Tag not found: ${oldName}`);
  }

  return this.renameTag(exactMatch.id, newName);
}
```

**MCP Tool**:
```typescript
{
  name: 'rename_tag',
  description: 'Rename a tag. All notes with this tag will show the new name. Provide either tag_id or current_name.',
  inputSchema: {
    type: 'object',
    properties: {
      tag_id: {
        type: 'string',
        description: 'The ID of the tag to rename (use this OR current_name)',
      },
      current_name: {
        type: 'string',
        description: 'Current name of the tag (use this OR tag_id)',
      },
      new_name: {
        type: 'string',
        description: 'New name for the tag',
      },
    },
    required: ['new_name'],
  },
}
```

**Handler**:
```typescript
case 'rename_tag': {
  let result;
  if (args.tag_id) {
    result = await this.apiClient.renameTag(
      args.tag_id as string,
      args.new_name as string,
    );
  } else if (args.current_name) {
    result = await this.apiClient.renameTagByName(
      args.current_name as string,
      args.new_name as string,
    );
  } else {
    throw new Error('Must provide either tag_id or current_name');
  }

  return {
    content: [
      {
        type: 'text',
        text: `Renamed tag to: ${args.new_name}`,
      },
    ],
  };
}
```

---

### 5. Rename/Update Notebook

**Why**: Users need to reorganize notebooks and fix naming.

**API Endpoint**: `PUT /folders/{folder_id}`

**Request Body**:
```json
{
  "title": "New Notebook Name",
  "parent_id": "optional_parent_folder_id"
}
```

**Response Format**:
```json
{
  "id": "folder123",
  "title": "New Notebook Name",
  "parent_id": "parent_id_or_empty",
  "updated_time": 1634567890000
}
```

**Implementation**:
```typescript
async updateNotebook(
  notebookId: string,
  updates: { title?: string; parent_id?: string }
): Promise<unknown> {
  return this.request('PUT', `/folders/${notebookId}`, updates);
}

async renameNotebook(notebookId: string, newTitle: string): Promise<unknown> {
  return this.updateNotebook(notebookId, { title: newTitle });
}
```

**MCP Tool**:
```typescript
{
  name: 'update_notebook',
  description: 'Update notebook properties (rename or move to different parent).',
  inputSchema: {
    type: 'object',
    properties: {
      notebook_id: {
        type: 'string',
        description: 'The ID of the notebook to update',
      },
      title: {
        type: 'string',
        description: 'Optional: New title for the notebook',
      },
      parent_id: {
        type: 'string',
        description: 'Optional: New parent notebook ID (for nesting)',
      },
    },
    required: ['notebook_id'],
  },
}
```

**Handler**:
```typescript
case 'update_notebook': {
  const updates: { title?: string; parent_id?: string } = {};
  if (args.title) updates.title = args.title as string;
  if (args.parent_id) updates.parent_id = args.parent_id as string;

  const result = await this.apiClient.updateNotebook(
    args.notebook_id as string,
    updates,
  ) as { title: string; id: string };

  return {
    content: [
      {
        type: 'text',
        text: `Updated notebook: ${result.title} (ID: ${result.id})`,
      },
    ],
  };
}
```

---

### 6. Resources/Attachments - Complete Support

**Why**: Enables full multimodal workflows - Gemini can analyze images, PDFs, etc. Complete CRUD operations for resource management.

#### 6a. List All Resources Globally

**Why**: Discover all attachments across all notes. Essential for resource management, finding orphaned files, and cleanup.

**API Endpoint**: `GET /resources`

**Query Parameters**:
- `fields` (string): Comma-separated list of fields to return
  - Default: `id,title,mime,filename,size,created_time,updated_time,file_extension,ocr_text,ocr_status`
- `limit` (number): Items per page (max 100, default 100)
- `page` (number): Page number (starts at 1)
- `order_by` (string): Field to sort by (e.g., `updated_time`)
- `order_dir` (string): `ASC` or `DESC`

**Response Format**:
```json
{
  "items": [
    {
      "id": "resource123",
      "title": "screenshot.png",
      "mime": "image/png",
      "filename": "screenshot.png",
      "size": 123456,
      "file_extension": "png",
      "created_time": 1634567890000,
      "updated_time": 1634567890000,
      "ocr_text": "Extracted text...",
      "ocr_status": 2
    }
  ],
  "has_more": false
}
```

**Implementation**:
```typescript
async listAllResources(fields?: string): Promise<unknown> {
  const fieldsParam = fields ||
    'id,title,mime,filename,size,created_time,updated_time,file_extension,ocr_text,ocr_status';

  return this.paginatedRequest(`/resources?fields=${fieldsParam}`);
}
```

**MCP Tool**:
```typescript
{
  name: 'list_all_resources',
  description: 'List all file attachments (images, PDFs, etc.) across all notes. Returns metadata including OCR text if available.',
  inputSchema: {
    type: 'object',
    properties: {},
  },
}
```

**Handler**:
```typescript
case 'list_all_resources': {
  const result = await this.apiClient.listAllResources();
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
```

---

#### 6b. Get Resource Metadata

**Why**: Check resource details (size, MIME type, OCR text) before downloading. Essential for efficient resource handling.

**API Endpoint**: `GET /resources/{resource_id}`

**Query Parameters**:
- `fields` (string): Specific fields to return

**Response Format**:
```json
{
  "id": "resource123",
  "title": "document.pdf",
  "mime": "application/pdf",
  "filename": "document.pdf",
  "size": 2456789,
  "file_extension": "pdf",
  "created_time": 1634567890000,
  "updated_time": 1634567890000,
  "user_created_time": 1634567890000,
  "user_updated_time": 1634567890000,
  "blob_updated_time": 1634567890000,
  "is_shared": 0,
  "share_id": "",
  "ocr_text": "Extracted text from PDF...",
  "ocr_status": 2,
  "ocr_error": ""
}
```

**Implementation**:
```typescript
async getResourceMetadata(resourceId: string, fields?: string): Promise<unknown> {
  const fieldsParam = fields ||
    'id,title,mime,filename,size,file_extension,created_time,updated_time,blob_updated_time,is_shared,share_id,ocr_text,ocr_status';

  return this.request('GET', `/resources/${resourceId}?fields=${fieldsParam}`);
}
```

**MCP Tool**:
```typescript
{
  name: 'get_resource_metadata',
  description: 'Get metadata for a specific resource/attachment including size, MIME type, OCR text, and timestamps.',
  inputSchema: {
    type: 'object',
    properties: {
      resource_id: {
        type: 'string',
        description: 'The ID of the resource',
      },
    },
    required: ['resource_id'],
  },
}
```

**Handler**:
```typescript
case 'get_resource_metadata': {
  const result = await this.apiClient.getResourceMetadata(args.resource_id as string);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
```

---

#### 6c. Get Note Resources

**API Endpoint**: `GET /notes/{note_id}/resources`

**Response Format**:
```json
{
  "items": [
    {
      "id": "resource123",
      "title": "image.png",
      "mime": "image/png",
      "filename": "image.png",
      "size": 123456,
      "file_extension": "png",
      "created_time": 1634567890000
    }
  ],
  "has_more": false
}
```

**Implementation**:
```typescript
async getNoteResources(noteId: string, fields?: string): Promise<unknown> {
  const fieldsParam = fields ||
    'id,title,mime,filename,size,file_extension,created_time,updated_time';

  return this.paginatedRequest(`/notes/${noteId}/resources?fields=${fieldsParam}`);
}
```

**MCP Tool**:
```typescript
{
  name: 'get_note_attachments',
  description: 'List all file attachments in a specific note.',
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
}
```

**Handler**:
```typescript
case 'get_note_attachments': {
  const result = await this.apiClient.getNoteResources(args.note_id as string);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
```

---

#### 6d. Reverse Lookup: Find Notes Using Resource

**Why**: Critical for understanding resource usage before deletion. Answers "which notes reference this attachment?"

**API Endpoint**: `GET /resources/{resource_id}/notes`

**Query Parameters**:
- `fields` (string): Fields to return from notes
- `limit`, `page`: Pagination

**Response Format**:
```json
{
  "items": [
    {
      "id": "note123",
      "title": "Project Documentation",
      "parent_id": "notebook_id",
      "updated_time": 1634567890000
    },
    {
      "id": "note456",
      "title": "Meeting Notes",
      "parent_id": "notebook_id2",
      "updated_time": 1634567890000
    }
  ],
  "has_more": false
}
```

**Implementation**:
```typescript
async getResourceNotes(resourceId: string, fields?: string): Promise<unknown> {
  const fieldsParam = fields ||
    'id,title,parent_id,created_time,updated_time';

  return this.paginatedRequest(`/resources/${resourceId}/notes?fields=${fieldsParam}`);
}
```

**MCP Tool**:
```typescript
{
  name: 'get_resource_notes',
  description: 'Find all notes that reference/use a specific resource/attachment. Essential before deleting a resource.',
  inputSchema: {
    type: 'object',
    properties: {
      resource_id: {
        type: 'string',
        description: 'The ID of the resource',
      },
    },
    required: ['resource_id'],
  },
}
```

**Handler**:
```typescript
case 'get_resource_notes': {
  const result = await this.apiClient.getResourceNotes(args.resource_id as string);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
```

---

#### 6e. Download Resource

**API Endpoint**: `GET /resources/{resource_id}/file`

**Returns**: Binary file data

**Implementation**:
```typescript
async downloadResource(resourceId: string): Promise<Buffer> {
  const url = new URL(`/resources/${resourceId}/file`, this.baseUrl);
  url.searchParams.append('token', this.token);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to download resource: ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async downloadResourceToFile(resourceId: string, outputPath: string): Promise<void> {
  const fs = await import('fs');
  const buffer = await this.downloadResource(resourceId);
  fs.writeFileSync(outputPath, buffer);
}
```

**MCP Tool**:
```typescript
{
  name: 'download_attachment',
  description: 'Download a file attachment from Joplin by resource ID. Saves to specified path.',
  inputSchema: {
    type: 'object',
    properties: {
      resource_id: {
        type: 'string',
        description: 'The ID of the resource to download',
      },
      output_path: {
        type: 'string',
        description: 'Local file path to save the downloaded file',
      },
    },
    required: ['resource_id', 'output_path'],
  },
}
```

**Handler**:
```typescript
case 'download_attachment': {
  await this.apiClient.downloadResourceToFile(
    args.resource_id as string,
    args.output_path as string,
  );
  return {
    content: [
      {
        type: 'text',
        text: `Downloaded resource to: ${args.output_path}`,
      },
    ],
  };
}
```

---

#### 6f. Upload Resource

**API Endpoint**: `POST /resources`

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `props` (string): JSON-encoded properties object
  - `title` (string): Filename
  - `mime` (string): MIME type (e.g., `image/png`)
- `data` (binary): File contents

**Example props**:
```json
{
  "title": "screenshot.png",
  "mime": "image/png"
}
```

**Response Format**:
```json
{
  "id": "resource123",
  "title": "screenshot.png",
  "mime": "image/png",
  "size": 123456,
  "created_time": 1634567890000
}
```

**Dependencies**:
```bash
npm install form-data
npm install @types/form-data --save-dev
```

**Implementation**:
```typescript
async uploadResource(
  filePath: string,
  title: string,
  mimeType: string
): Promise<unknown> {
  const fs = await import('fs');
  const FormData = (await import('form-data')).default;

  const formData = new FormData();

  // Add props as JSON
  formData.append('props', JSON.stringify({ title, mime: mimeType }));

  // Add file data
  const fileStream = fs.createReadStream(filePath);
  formData.append('data', fileStream);

  // Make request with FormData
  const url = new URL('/resources', this.baseUrl);
  url.searchParams.append('token', this.token);

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData as any,
    headers: formData.getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload resource: ${errorText}`);
  }

  return response.json();
}
```

**MCP Tool**:
```typescript
{
  name: 'upload_attachment',
  description: 'Upload a file attachment (image, PDF, etc.) to Joplin. Returns resource ID that can be referenced in notes.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Local file path to upload',
      },
      title: {
        type: 'string',
        description: 'Filename to use in Joplin',
      },
      mime_type: {
        type: 'string',
        description: 'MIME type (e.g., image/png, application/pdf)',
      },
    },
    required: ['file_path', 'title', 'mime_type'],
  },
}
```

**Handler**:
```typescript
case 'upload_attachment': {
  const result = await this.apiClient.uploadResource(
    args.file_path as string,
    args.title as string,
    args.mime_type as string,
  ) as { id: string; title: string };

  return {
    content: [
      {
        type: 'text',
        text: `Uploaded resource: ${result.title} (ID: ${result.id})`,
      },
    ],
  };
}
```

---

#### 6g. Update Resource

**Why**: Replace outdated attachments or update metadata without manual deletion and re-upload.

**API Endpoint**: `PUT /resources/{resource_id}`

**Two update modes:**

**Mode 1: Update file + metadata** (multipart/form-data)
- Form field `data`: New file content
- Form field `props`: JSON with updated properties

**Mode 2: Update metadata only** (application/json)
- JSON body with properties to update (e.g., `{"title": "New Name"}`)

**Request Examples**:

```typescript
// Update file + metadata
const formData = new FormData();
formData.append('props', JSON.stringify({ title: 'updated.png' }));
formData.append('data', fileStream);
// PUT to /resources/{id}

// Update metadata only
const body = { title: 'New Title' };
// PUT to /resources/{id} with JSON
```

**Response Format**:
```json
{
  "id": "resource123",
  "title": "updated.png",
  "mime": "image/png",
  "size": 234567,
  "updated_time": 1634567890000,
  "blob_updated_time": 1634567890000
}
```

**Implementation**:
```typescript
// Update file + metadata
async updateResourceWithFile(
  resourceId: string,
  filePath: string,
  updates: { title?: string; mime?: string }
): Promise<unknown> {
  const fs = await import('fs');
  const FormData = (await import('form-data')).default;

  const formData = new FormData();

  // Add props if provided
  if (updates && Object.keys(updates).length > 0) {
    formData.append('props', JSON.stringify(updates));
  }

  // Add file data
  const fileStream = fs.createReadStream(filePath);
  formData.append('data', fileStream);

  const url = new URL(`/resources/${resourceId}`, this.baseUrl);
  url.searchParams.append('token', this.token);

  const response = await fetch(url.toString(), {
    method: 'PUT',
    body: formData as any,
    headers: formData.getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update resource: ${errorText}`);
  }

  return response.json();
}

// Update metadata only
async updateResourceMetadata(
  resourceId: string,
  updates: { title?: string }
): Promise<unknown> {
  return this.request('PUT', `/resources/${resourceId}`, updates);
}
```

**MCP Tool**:
```typescript
{
  name: 'update_resource',
  description: 'Update a resource/attachment. Can update file content, metadata (title), or both.',
  inputSchema: {
    type: 'object',
    properties: {
      resource_id: {
        type: 'string',
        description: 'The ID of the resource to update',
      },
      file_path: {
        type: 'string',
        description: 'Optional: New file to replace existing content',
      },
      title: {
        type: 'string',
        description: 'Optional: New title for the resource',
      },
      mime_type: {
        type: 'string',
        description: 'Optional: New MIME type (only with file_path)',
      },
    },
    required: ['resource_id'],
  },
}
```

**Handler**:
```typescript
case 'update_resource': {
  let result;

  if (args.file_path) {
    // Update with new file
    const updates: { title?: string; mime?: string } = {};
    if (args.title) updates.title = args.title as string;
    if (args.mime_type) updates.mime = args.mime_type as string;

    result = await this.apiClient.updateResourceWithFile(
      args.resource_id as string,
      args.file_path as string,
      updates,
    ) as { title: string; id: string };
  } else if (args.title) {
    // Update metadata only
    result = await this.apiClient.updateResourceMetadata(
      args.resource_id as string,
      { title: args.title as string },
    ) as { title: string; id: string };
  } else {
    throw new Error('Must provide either file_path or title to update');
  }

  return {
    content: [
      {
        type: 'text',
        text: `Updated resource: ${result.title} (ID: ${result.id})`,
      },
    ],
  };
}
```

---

#### 6h. Delete Resource

**Why**: Clean up unused attachments, remove accidental uploads, manage storage.

**API Endpoint**: `DELETE /resources/{resource_id}`

**Response**: Empty response on success (HTTP 200)

**Side Effects**:
- Removes resource file from disk
- Removes resource metadata from database
- Removes note-resource relationships
- Notes with `![](:/resource_id)` references will show broken links

**Implementation**:
```typescript
async deleteResource(resourceId: string): Promise<void> {
  await this.request('DELETE', `/resources/${resourceId}`);
}
```

**MCP Tool**:
```typescript
{
  name: 'delete_resource',
  description: 'Delete a resource/attachment from Joplin. WARNING: This will break references in notes that use this resource. Use get_resource_notes first to check usage.',
  inputSchema: {
    type: 'object',
    properties: {
      resource_id: {
        type: 'string',
        description: 'The ID of the resource to delete',
      },
    },
    required: ['resource_id'],
  },
}
```

**Handler**:
```typescript
case 'delete_resource': {
  // Optional: Check for note references first
  const notes = await this.apiClient.getResourceNotes(args.resource_id as string) as { items: unknown[] };

  if (notes.items.length > 0) {
    return {
      content: [
        {
          type: 'text',
          text: `Warning: This resource is used in ${notes.items.length} note(s). Deleting it will break those references.\n\n${JSON.stringify(notes, null, 2)}`,
        },
      ],
    };
  }

  await this.apiClient.deleteResource(args.resource_id as string);

  return {
    content: [
      {
        type: 'text',
        text: `Deleted resource: ${args.resource_id}`,
      },
    ],
  };
}
```

---

## Implementation Order

**Phase 1: Tag Management** (1-2 days)
1. List all tags
2. Rename tag
3. Get notes by tag

**Phase 2: Global Access** (1 day)
4. List all notes
5. Update notebook

**Phase 3: Resources - Complete CRUD** (3-4 days)
6. List all resources globally
7. Get resource metadata
8. Get note resources
9. Reverse lookup (resource → notes)
10. Download resource
11. Upload resource
12. Update resource (file + metadata)
13. Delete resource

**Total Estimate**: 5-7 days

---

## Testing Strategy

### Unit Tests
Add to `index.test.ts`:

```typescript
describe('High Priority Features', () => {
  it('should list all notes', async () => {
    const client = new JoplinApiClient();
    const notes = await client.listAllNotes();
    expect(Array.isArray(notes)).toBe(true);
  });

  it('should list all tags', async () => {
    const client = new JoplinApiClient();
    const tags = await client.listTags();
    expect(Array.isArray(tags)).toBe(true);
  });

  it('should get notes by tag', async () => {
    const client = new JoplinApiClient();
    const tags = await client.listTags() as Array<{id: string}>;
    if (tags.length > 0) {
      const notes = await client.getTagNotes(tags[0].id);
      expect(Array.isArray(notes)).toBe(true);
    }
  });

  it('should rename a tag', async () => {
    const client = new JoplinApiClient();
    const tag = await client.request('POST', '/tags', { title: 'test-tag' }) as {id: string};
    await client.renameTag(tag.id, 'renamed-tag');
    await client.deleteTag(tag.id);
  });

  // Resource tests
  it('should list all resources', async () => {
    const client = new JoplinApiClient();
    const resources = await client.listAllResources();
    expect(Array.isArray(resources)).toBe(true);
  });

  it('should upload and delete resource', async () => {
    const client = new JoplinApiClient();
    const fs = await import('fs');

    // Create test file
    fs.writeFileSync('/tmp/test.txt', 'test content');

    // Upload
    const resource = await client.uploadResource('/tmp/test.txt', 'test.txt', 'text/plain') as {id: string};
    expect(resource.id).toBeDefined();

    // Get metadata
    const metadata = await client.getResourceMetadata(resource.id);
    expect(metadata).toBeDefined();

    // Delete
    await client.deleteResource(resource.id);

    // Cleanup
    fs.unlinkSync('/tmp/test.txt');
  });

  it('should update resource metadata', async () => {
    const client = new JoplinApiClient();
    const fs = await import('fs');

    fs.writeFileSync('/tmp/test.txt', 'test content');
    const resource = await client.uploadResource('/tmp/test.txt', 'test.txt', 'text/plain') as {id: string};

    // Update metadata
    await client.updateResourceMetadata(resource.id, { title: 'renamed.txt' });

    // Verify
    const metadata = await client.getResourceMetadata(resource.id) as {title: string};
    expect(metadata.title).toBe('renamed.txt');

    // Cleanup
    await client.deleteResource(resource.id);
    fs.unlinkSync('/tmp/test.txt');
  });

  it('should get resource notes (reverse lookup)', async () => {
    const client = new JoplinApiClient();
    const resources = await client.listAllResources() as Array<{id: string}>;
    if (resources.length > 0) {
      const notes = await client.getResourceNotes(resources[0].id);
      expect(Array.isArray(notes)).toBe(true);
    }
  });
});
```

### Integration Tests with Gemini

```bash
# List all notes
gemini "List all my Joplin notes"

# Tags
gemini "List all my Joplin tags"
gemini "Show me all notes tagged with 'project'"
gemini "Rename the tag 'old-name' to 'new-name'"

# Notebooks
gemini "Rename notebook 'Old Name' to 'New Name'"

# Attachment workflows - Complete
gemini "List all attachments across all my notes"
gemini "Show me metadata for resource abc123"
gemini "What attachments are in my bug report note?"
gemini "Which notes use the screenshot resource abc123?"
gemini "Download the screenshot from resource abc123"
gemini "Upload this diagram.png to Joplin"
gemini "Replace resource abc123 with this updated-diagram.png"
gemini "Delete resource abc123 (check which notes use it first)"
```

---

## Notes

- All endpoints use existing `paginatedRequest()` method for consistency
- Follow existing error handling patterns in `request()` method
- Authentication via query parameter `?token={token}`
- Base URL configurable via `JOPLIN_PORT` environment variable

---

## API Reference

**Base URL**: `http://localhost:41184`
**Auth**: Query parameter `?token={token}`
**Docs**: https://joplinapp.org/api/references/rest_api/
