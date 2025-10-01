import { TFile } from 'obsidian';
import NoteCompanionFolderPlugin from '../src/main';
import { createMockFile, createMockFolder, createMockVault } from './test-helpers';

describe('Path Resolution', () => {
	let plugin: NoteCompanionFolderPlugin;

	beforeEach(() => {
		plugin = new NoteCompanionFolderPlugin({} as any, {} as any);
		plugin.settings = {
			companionFolderLocation: '',
			handleFileDrop: true,
		};
	});

	describe('getPathToCompanionFolder', () => {
		it('should return null for non-markdown files', () => {
			const file = createMockFile('note.txt', 'note', 'txt');
			const result = plugin.getPathToCompanionFolder(file);
			expect(result).toBeNull();
		});

		it('should return sibling folder path when no base path is configured', () => {
			const file = createMockFile('note.md', 'note');
			const result = plugin.getPathToCompanionFolder(file);
			expect(result).toBe('note');
		});

		it('should return sibling folder path for nested notes', () => {
			const file = createMockFile('folder/subfolder/note.md', 'note');
			const result = plugin.getPathToCompanionFolder(file);
			expect(result).toBe('folder/subfolder/note');
		});

		it('should use base path when configured', () => {
			plugin.settings.companionFolderLocation = '_files';
			const file = createMockFile('note.md', 'note');
			const result = plugin.getPathToCompanionFolder(file);
			expect(result).toBe('_files/note');
		});

		it('should preserve parent path structure with base path', () => {
			plugin.settings.companionFolderLocation = '_files';
			const file = createMockFile('folder/subfolder/note.md', 'note');
			const result = plugin.getPathToCompanionFolder(file);
			expect(result).toBe('_files/folder/subfolder/note');
		});

		it('should handle base path with trailing slash', () => {
			plugin.settings.companionFolderLocation = '_files/';
			const file = createMockFile('note.md', 'note');
			const result = plugin.getPathToCompanionFolder(file);
			expect(result).toBe('_files/note');
		});

		it('should handle notes in vault root', () => {
			const file: TFile = {
				path: 'note.md',
				name: 'note.md',
				basename: 'note',
				extension: 'md',
				parent: null,
			} as TFile;

			const result = plugin.getPathToCompanionFolder(file);
			expect(result).toBe('note');
		});
	});

	describe('isCompanionFolderExisting', () => {
		it('should return false for non-markdown files', () => {
			const file = createMockFile('note.txt', 'note', 'txt');
			const result = plugin.isCompanionFolderExisting(file);
			expect(result).toBe(false);
		});

		it('should return false when folder does not exist', () => {
			const file = createMockFile('note.md', 'note');
			file.vault = createMockVault({});

			const result = plugin.isCompanionFolderExisting(file);
			expect(result).toBe(false);
		});

		it('should return true when folder exists', () => {
			const file = createMockFile('note.md', 'note');
			const mockFolder = createMockFolder('note');
			file.vault = createMockVault({ 'note': mockFolder! });

			const result = plugin.isCompanionFolderExisting(file);
			expect(result).toBe(true);
		});
	});

	describe('getNoteCompanionFolder', () => {
		it('should return null when folder does not exist', () => {
			const file = createMockFile('note.md', 'note');
			file.vault = createMockVault({});

			const result = plugin.getNoteCompanionFolder(file);
			expect(result).toBeNull();
		});

		it('should return folder when it exists', () => {
			const file = createMockFile('note.md', 'note');
			const mockFolder = createMockFolder('note');
			file.vault = createMockVault({ 'note': mockFolder! });

			const result = plugin.getNoteCompanionFolder(file);
			expect(result).toBe(mockFolder);
		});

		it('should return null when path contains a file instead of folder', () => {
			const file = createMockFile('note.md', 'note');
			const mockFile = { path: 'note', extension: 'md' } as any;
			file.vault = createMockVault({ 'note': mockFile });

			const result = plugin.getNoteCompanionFolder(file);
			expect(result).toBeNull();
		});
	});
});
