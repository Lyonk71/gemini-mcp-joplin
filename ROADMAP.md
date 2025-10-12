# Joplin Extension Roadmap

This document outlines the planned features for the Gemini CLI Joplin extension.

## Status Key
- [ ] Not started
- [WIP] Work in progress
- [x] Completed

## Phase 1: Essential Features

### Core Note Operations

- [ ] **Create new notes**
  - Create notes with title and body content
  - Support optional notebook assignment
  - Support optional tags

- [ ] **Read/retrieve note content**
  - Get note by ID
  - Get note by search query
  - Return full note content and metadata

- [ ] **Update existing notes**
  - Append content to existing notes
  - Prepend content to existing notes
  - Replace entire note content

- [ ] **Delete notes**
  - Delete note by ID
  - Support confirmation/safety checks

- [ ] **Search notes**
  - Search by keyword/text content
  - Filter by tag
  - Filter by date range (created/modified)
  - Support combined filters

### Notebook Management

- [ ] **List all notebooks**
  - Get all notebooks with metadata
  - Show notebook hierarchy if nested

- [ ] **Create new notebooks**
  - Create notebook with name
  - Support parent notebook for nesting

- [ ] **Move notes between notebooks**
  - Move single note to different notebook
  - Support bulk move operations

- [ ] **Get notes from specific notebook**
  - List all notes in a notebook
  - Support pagination if needed
  - Return note metadata (title, ID, dates)

## Implementation Notes

The extension will use the Joplin Data API (REST API or CLI) to interact with Joplin. Users should have Joplin running with the Web Clipper service enabled to expose the API.

## Use Cases

Example interactions this extension should support:

- "Do I have any notes that cover setting up a new arch installation?"
- "Can you summarize the product being described in the mvp notebook?"
- "Create a new note in the mvp notebook with that summary"
- "Find notes that haven't been accessed in over a year and move them to an archive notebook"
