# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin that manages companion folders for notes. Each note can have a dedicated folder (with the same name as the note) to store its attachments, keeping files organized on a per-note basis.

## Build Commands

- **Development mode**: `npm run dev` - Watches files and rebuilds on changes
- **Production build**: `npm run build` - Type checks, then builds optimized bundle
- **Version bump**: `npm run version` - Updates manifest.json and versions.json, then stages files

## Architecture

### Core Components

**Main Plugin (src/main.ts)**
- Entry point extending Obsidian's `Plugin` class
- Registers commands, ribbon icons, context menus, and file menu items
- Implements drag-and-drop handling for automatic file placement
- Contains companion folder path resolution logic

**Settings (src/settings.ts)**
- `companionFolderLocation`: Base path for all companion folders (empty = next to note)
- `handleFileDrop`: Toggle automatic file drop handling

**File Conflict Modal (src/FileConflictModal.ts)**
- Handles file name conflicts during drag-and-drop operations
- Provides "replace", "rename", or "cancel" options

### Key Concepts

**Companion Folder Location Modes**:
1. **Sibling mode** (default): Folder is next to note file (`note.md` → `note/`)
2. **Base path mode**: All companion folders under a configured path (`_files/note/`)

**Path Resolution** (`getPathToCompanionFolder` in src/main.ts:140):
- Takes note's basename (without `.md`) as folder name
- Preserves parent path structure when base path is configured
- Uses `normalizePath` for cross-platform compatibility

**Drag-and-Drop System**:
- Drop handlers registered per-editor element using `WeakSet` to prevent duplicates
- Files automatically moved to companion folder on drop
- Holds Shift during drop to insert regular links instead of embeds
- File name conflicts trigger `FileConflictModal`

### Build System

Uses esbuild (see esbuild.config.mjs) to bundle TypeScript into main.js. All Obsidian API imports are marked external. Development mode enables watch mode and inline sourcemaps.

## Code Style Notes

- Uses `TFile`, `TFolder`, and `TAbstractFile` from Obsidian API for file operations
- Paths should never start with `/` and folders should not have trailing slashes
- Use `normalizePath()` for all path construction
- `strictNullChecks` is enabled in TypeScript config
