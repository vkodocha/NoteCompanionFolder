import { PluginSettingTab, App, Setting } from "obsidian";
import NoteCompanionFolderPlugin from "./main";

export interface NoteCompanionFolderPluginSettings {
	companionFolderLocation: string;
	handleFileDrop: boolean;
}

export const DEFAULT_SETTINGS: NoteCompanionFolderPluginSettings = {
	companionFolderLocation: '',
	handleFileDrop: true
}

export class NoteCompanionFolderPluginSettingTab extends PluginSettingTab {
	plugin: NoteCompanionFolderPlugin;

	constructor(app: App, plugin: NoteCompanionFolderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Base path for companion folders')
			.setDesc('Default is empty which means the companion folder is directly next to the note file. Add a path from the vault root to the folder in which the companion folders are. Path must not start with \'/\' but end with one.')
			.addText(text => text
				.setPlaceholder('Path to folder')
				.setValue(this.plugin.settings.companionFolderLocation)
                .onChange(async (value) => {
					this.plugin.settings.companionFolderLocation = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Move droped files to the companion folder')
			.setDesc('If activated (default) files dragged into the note will automatically placed in the note companion folder instead of the regular app behaviour.')
			.addToggle(text => text
				.setValue(this.plugin.settings.handleFileDrop)
				.onChange(async (value) => {
					this.plugin.settings.handleFileDrop = value;
					await this.plugin.saveSettings();
				}));
	}
}
