/**
 * @jest-environment jsdom
 */

import { TFile } from 'obsidian';
import NoteCompanionFolderPlugin from '../src/main';
import { createMockFile, createMockFolder, createMockVault } from './test-helpers';

describe('File Operations', () => {
	let plugin: NoteCompanionFolderPlugin;

	beforeEach(() => {
		plugin = new NoteCompanionFolderPlugin({} as any, {} as any);
		plugin.settings = {
			companionFolderLocation: '',
			handleFileDrop: true,
		};
	});

	describe('getAvailableFileName', () => {
		it('should return filename with (1) when original exists', async () => {
			const file = createMockFile('folder/test.png', 'test', 'png');
			const vault = createMockVault({
				'folder/test.png': file,
			});

			const result = await (plugin as any).getAvailableFileName(file, vault);
			expect(result).toBe('folder/test (1).png');
		});

		it('should increment counter until available name is found', async () => {
			const file = createMockFile('folder/test.png', 'test', 'png');
			const vault = createMockVault({
				'folder/test.png': file,
				'folder/test (1).png': createMockFile('folder/test (1).png', 'test (1)', 'png'),
				'folder/test (2).png': createMockFile('folder/test (2).png', 'test (2)', 'png'),
			});

			const result = await (plugin as any).getAvailableFileName(file, vault);
			expect(result).toBe('folder/test (3).png');
		});

		it('should handle files in vault root', async () => {
			const file: TFile = {
				path: 'test.png',
				name: 'test.png',
				basename: 'test',
				extension: 'png',
				parent: null,
			} as TFile;

			const vault = createMockVault({
				'test.png': file,
			});

			const result = await (plugin as any).getAvailableFileName(file, vault);
			expect(result).toBe('test (1).png');
		});

		it('should throw error after max attempts', async () => {
			const file = createMockFile('folder/test.png', 'test', 'png');

			// Create a vault where all names are taken
			const files: Record<string, TFile> = {
				'folder/test.png': file,
			};
			for (let i = 1; i <= 50; i++) {
				files[`folder/test (${i}).png`] = createMockFile(`folder/test (${i}).png`, `test (${i})`, 'png');
			}
			const vault = createMockVault(files);

			await expect((plugin as any).getAvailableFileName(file, vault, 50))
				.rejects
				.toThrow('Could not find available file name after 50 attempts');
		});
	});

	describe('processDroppedFile', () => {
		it('should process file without conflict', async () => {
			const arrayBuffer = new ArrayBuffer(8);
			const mockFile = {
				name: 'test.png',
				arrayBuffer: jest.fn().mockResolvedValue(arrayBuffer)
			} as any;

			plugin.app = {
				vault: createMockVault({}),
			} as any;

			const result = await plugin.processDroppedFile(mockFile, 'note/test.png');
			expect(result).toBe('note/test.png');
			expect(plugin.app.vault.createBinary).toHaveBeenCalled();
		});

		it('should handle file name conflict with rename option', async () => {
			const arrayBuffer = new ArrayBuffer(8);
			const mockFile = {
				name: 'test.png',
				arrayBuffer: jest.fn().mockResolvedValue(arrayBuffer)
			} as any;

			const existingFile = createMockFile('note/test.png', 'test', 'png');
			plugin.app = {
				vault: createMockVault({
					'note/test.png': existingFile,
				}),
			} as any;

			// Mock FileConflictModal by mocking the constructor
			const { FileConflictModal } = require('../src/FileConflictModal');
			const modalMock = jest.spyOn(FileConflictModal.prototype, 'open').mockImplementation(function(this: any) {
				// Immediately trigger the callback with "rename"
				const resolve = (this as any).onResult;
				resolve('rename');
			});

			const result = await plugin.processDroppedFile(mockFile, 'note/test.png');

			// Should get renamed to test (1).png
			expect(result).toBe('note/test (1).png');
			expect(plugin.app.vault.createBinary).toHaveBeenCalledWith('note/test (1).png', expect.any(ArrayBuffer));

			modalMock.mockRestore();
		});

		it('should handle file name conflict with replace option', async () => {
			const arrayBuffer = new ArrayBuffer(8);
			const mockFile = {
				name: 'test.png',
				arrayBuffer: jest.fn().mockResolvedValue(arrayBuffer)
			} as any;

			const existingFile = createMockFile('note/test.png', 'test', 'png');
			plugin.app = {
				vault: createMockVault({
					'note/test.png': existingFile,
				}),
			} as any;

			// Mock FileConflictModal
			const { FileConflictModal } = require('../src/FileConflictModal');
			const modalMock = jest.spyOn(FileConflictModal.prototype, 'open').mockImplementation(function(this: any) {
				const resolve = (this as any).onResult;
				resolve('replace');
			});

			const result = await plugin.processDroppedFile(mockFile, 'note/test.png');

			// Should keep original name and use modifyBinary
			expect(result).toBe('note/test.png');
			expect(plugin.app.vault.modifyBinary).toHaveBeenCalledWith(existingFile, expect.any(ArrayBuffer));

			modalMock.mockRestore();
		});

		it('should handle file name conflict with cancel option', async () => {
			const arrayBuffer = new ArrayBuffer(8);
			const mockFile = {
				name: 'test.png',
				arrayBuffer: jest.fn().mockResolvedValue(arrayBuffer)
			} as any;

			const existingFile = createMockFile('note/test.png', 'test', 'png');
			plugin.app = {
				vault: createMockVault({
					'note/test.png': existingFile,
				}),
			} as any;

			// Mock FileConflictModal
			const { FileConflictModal } = require('../src/FileConflictModal');
			const modalMock = jest.spyOn(FileConflictModal.prototype, 'open').mockImplementation(function(this: any) {
				const resolve = (this as any).onResult;
				resolve('cancel');
			});

			const result = await plugin.processDroppedFile(mockFile, 'note/test.png');

			// Should return null and not create any file
			expect(result).toBeNull();
			expect(plugin.app.vault.createBinary).not.toHaveBeenCalled();
			expect(plugin.app.vault.modifyBinary).not.toHaveBeenCalled();

			modalMock.mockRestore();
		});
	});

	describe('setupDropHandling', () => {
		it('should not setup drop handling when disabled', () => {
			plugin.settings.handleFileDrop = false;
			const editorEl = document.createElement('div');

			const registerSpy = jest.spyOn(plugin, 'registerDomEvent');
			plugin.setupDropHandling(editorEl);

			expect(registerSpy).not.toHaveBeenCalled();
		});

		it('should setup drop handling when enabled', () => {
			plugin.settings.handleFileDrop = true;
			const editorEl = document.createElement('div');

			const registerSpy = jest.spyOn(plugin, 'registerDomEvent');
			plugin.setupDropHandling(editorEl);

			expect(registerSpy).toHaveBeenCalledWith(editorEl, 'drop', expect.any(Function), true);
		});

		it('should not register twice for same element', () => {
			plugin.settings.handleFileDrop = true;
			const editorEl = document.createElement('div');

			const registerSpy = jest.spyOn(plugin, 'registerDomEvent');

			plugin.setupDropHandling(editorEl);
			plugin.setupDropHandling(editorEl);

			expect(registerSpy).toHaveBeenCalledTimes(1);
		});

		it('should handle null element', () => {
			plugin.settings.handleFileDrop = true;
			const registerSpy = jest.spyOn(plugin, 'registerDomEvent');

			plugin.setupDropHandling(null);

			expect(registerSpy).not.toHaveBeenCalled();
		});
	});
});
