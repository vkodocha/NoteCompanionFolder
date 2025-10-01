/**
 * @jest-environment jsdom
 */

import { App } from 'obsidian';
import NoteCompanionFolderPlugin from '../src/main';
import { NoteCompanionFolderPluginSettingTab, DEFAULT_SETTINGS } from '../src/settings';

describe('Settings', () => {
	describe('DEFAULT_SETTINGS', () => {
		it('should have empty companionFolderLocation by default', () => {
			expect(DEFAULT_SETTINGS.companionFolderLocation).toBe('');
		});

		it('should have handleFileDrop enabled by default', () => {
			expect(DEFAULT_SETTINGS.handleFileDrop).toBe(true);
		});
	});

	describe('NoteCompanionFolderPluginSettingTab', () => {
		let plugin: NoteCompanionFolderPlugin;
		let settingTab: NoteCompanionFolderPluginSettingTab;
		let mockApp: App;

		beforeEach(() => {
			mockApp = {} as App;
			plugin = new NoteCompanionFolderPlugin({} as any, {} as any);
			plugin.settings = { ...DEFAULT_SETTINGS };
			settingTab = new NoteCompanionFolderPluginSettingTab(mockApp, plugin);
		});

		it('should initialize with app and plugin', () => {
			expect(settingTab.app).toBe(mockApp);
			expect(settingTab.plugin).toBe(plugin);
		});

		it('should create settings UI on display', () => {
			const containerEl = document.createElement('div');
			(containerEl as any).empty = jest.fn(() => { containerEl.innerHTML = ''; });
			settingTab.containerEl = containerEl;

			settingTab.display();

			// Container should be emptied
			expect((containerEl as any).empty).toHaveBeenCalled();
		});

		it('should clear container before displaying', () => {
			const containerEl = document.createElement('div');
			containerEl.innerHTML = '<div>Old content</div>';
			(containerEl as any).empty = jest.fn(() => { containerEl.innerHTML = ''; });
			settingTab.containerEl = containerEl;

			settingTab.display();

			// Old content should be removed
			expect((containerEl as any).empty).toHaveBeenCalled();
		});
	});

	describe('Plugin Settings Management', () => {
		let plugin: NoteCompanionFolderPlugin;

		beforeEach(() => {
			plugin = new NoteCompanionFolderPlugin({} as any, {} as any);
			plugin.settings = { ...DEFAULT_SETTINGS };
		});

		it('should load default settings', async () => {
			const loadDataSpy = jest.spyOn(plugin, 'loadData').mockResolvedValue({});
			await plugin.loadSettings();

			expect(loadDataSpy).toHaveBeenCalled();
			expect(plugin.settings.companionFolderLocation).toBe('');
			expect(plugin.settings.handleFileDrop).toBe(true);
		});

		it('should merge loaded settings with defaults', async () => {
			const loadDataSpy = jest.spyOn(plugin, 'loadData').mockResolvedValue({
				companionFolderLocation: '_files',
			});
			await plugin.loadSettings();

			expect(plugin.settings.companionFolderLocation).toBe('_files');
			expect(plugin.settings.handleFileDrop).toBe(true); // Should use default
		});

		it('should save settings', async () => {
			plugin.app = {
				workspace: {
					iterateAllLeaves: jest.fn()
				}
			} as any;

			const saveDataSpy = jest.spyOn(plugin, 'saveData').mockResolvedValue();
			plugin.settings.companionFolderLocation = '_attachments';

			await plugin.saveSettings();

			expect(saveDataSpy).toHaveBeenCalledWith(plugin.settings);
		});

		it('should install drop handlers when enabling handleFileDrop', async () => {
			plugin.app = {
				workspace: {
					iterateAllLeaves: jest.fn()
				}
			} as any;

			const saveDataSpy = jest.spyOn(plugin, 'saveData').mockResolvedValue();
			const installSpy = jest.spyOn(plugin as any, 'installDropHandlerFromAllLeafs');

			plugin.settings.handleFileDrop = true;
			await plugin.saveSettings();

			expect(installSpy).toHaveBeenCalled();
			saveDataSpy.mockRestore();
			installSpy.mockRestore();
		});

		it('should not install drop handlers when disabling handleFileDrop', async () => {
			plugin.app = {
				workspace: {
					iterateAllLeaves: jest.fn()
				}
			} as any;

			const saveDataSpy = jest.spyOn(plugin, 'saveData').mockResolvedValue();
			const installSpy = jest.spyOn(plugin as any, 'installDropHandlerFromAllLeafs');

			plugin.settings.handleFileDrop = false;
			await plugin.saveSettings();

			expect(installSpy).not.toHaveBeenCalled();
			saveDataSpy.mockRestore();
			installSpy.mockRestore();
		});
	});

	describe('Settings Impact on Path Resolution', () => {
		let plugin: NoteCompanionFolderPlugin;

		beforeEach(() => {
			plugin = new NoteCompanionFolderPlugin({} as any, {} as any);
			plugin.settings = { ...DEFAULT_SETTINGS };
		});

		it('should use sibling mode when companionFolderLocation is empty', () => {
			plugin.settings.companionFolderLocation = '';

			const file = {
				path: 'note.md',
				basename: 'note',
				parent: null,
			} as any;

			const result = plugin.getPathToCompanionFolder(file);
			expect(result).toBe('note');
		});

		it('should use base path mode when companionFolderLocation is set', () => {
			plugin.settings.companionFolderLocation = '_files';

			const file = {
				path: 'note.md',
				basename: 'note',
				parent: null,
			} as any;

			const result = plugin.getPathToCompanionFolder(file);
			expect(result).toBe('_files/note');
		});
	});
});
