import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder, Workspace, addIcon } from 'obsidian';

// Remember to rename these classes and interfaces!

interface NoteCompanionFolderPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: NoteCompanionFolderPluginSettings = {
	mySetting: 'default'
}

const LABEL = 'Reveal Companion Folder';
const ICON_ID = 'companion-folder';
const ICON_SVG = '<g fill="none"><path d="M 9.92126 99 L 79.3701 99 C 84.84946 99 89.29136 95.7707 89.29136 90.29134 L 89.29136 28.283464 L 62.00789 1 L 19.842523 1 C 14.36316 1 9.92126 5.441899 9.92126 10.92126 L 9.92126 25.80315" stroke="currentColor" stroke-linecap="butt" stroke-linejoin="round" stroke-width="10"/><path d="M 59.52756 2.8346457 L 59.52756 32.598425 L 89.29134 32.598425" stroke="currentColor" stroke-linecap="butt" stroke-linejoin="round" stroke-width="10"/><path transform="translate(4, 0)" d="M 44.66635 84.70457 C 47.407297 84.70457 49.629275 82.48259 49.629275 79.74164 L 49.629275 54.927004 C 49.629275 52.186054 47.407297 49.964076 44.66635 49.964076 L 25.062784 49.964076 C 23.376214 49.98061 21.796687 49.139443 20.86911 47.73076 L 18.859125 44.753 C 17.941175 43.359114 16.384079 42.51996 14.71508 42.519685 L 4.9629275 42.519685 C 2.2219783 42.519685 -7105427e-21 44.741663 -7105427e-21 47.48261 L -7105427e-21 79.74164 C -7105427e-21 82.48259 2.2219783 84.70457 4.9629275 84.70457 Z" stroke="currentColor" stroke-linecap="butt" stroke-linejoin="round" stroke-width="8"/></g>';

export default class NoteCompanionFolderPlugin extends Plugin {
	settings: NoteCompanionFolderPluginSettings;

	async onload() {
		await this.loadSettings();

		this.app.vault.on('create', (f) => {
			console.log('Hello from create callback', f);
		});

		addIcon("circle", `<circle cx="50" cy="50" r="50" fill="currentColor" />`);
		addIcon(ICON_ID, ICON_SVG);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!file.path.endsWith('.md')) {
					return;
				}

				menu.addItem((item) => {
					item.setTitle(LABEL).setIcon(ICON_ID).onClick(async () => {
						this.openCompanionFolder(file);
					});
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item.setTitle(LABEL).setIcon(ICON_ID).onClick(async () => {
						if (view.file === null || !view.file.path.endsWith('.md')) {
							return;
						}

						this.openCompanionFolder(view.file);
					});
				});
			})
		);

		const ribbonIconEl = this.addRibbonIcon(ICON_ID, LABEL, (evt: MouseEvent) => {
			let file = this.app.workspace.getActiveFile();
			if (file === null || !file.path.endsWith('.md')) {
				return;
			}

			this.openCompanionFolder(file);
		});
		
		this.addCommand({
			id: 'companion-plugin-reveal',
			name: LABEL,
			editorCallback: (editor) => {
				let file = this.app.workspace.getActiveFile();
				if (file === null || !file.path.endsWith('.md')) {
					return;
				}

				this.openCompanionFolder(file);
			}
		});
		
		this.registerMarkdownCodeBlockProcessor("companion-folder", (source, el, ctx) => {
			/*const rows = source.split("\n").filter((row) => row.length > 0);
	  
			console.log(ctx.docId, ctx.sourcePath);

			const table = el.createEl("table");
			const body = table.createEl("tbody");
	  
			for (let i = 0; i < rows.length; i++) {
			  const cols = rows[i].split(",");
	  
			  const row = body.createEl("tr");
	  
			  for (let j = 0; j < cols.length; j++) {
				row.createEl("td", { text: cols[j] });
			  }
			}*/
			
			const noteFile = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!noteFile) {
				el.createEl('div', { text: `File Ending is not .md` });
				return;
			}

			if (!this.isCompanionFolderExisting(noteFile as TFile)) {
				el.createEl('div', { text: `No companion folder present for this note` });
				return;
			}

			const cf = this.getNoteCompanionFolder(noteFile as TFile);
			if (!cf) {
				el.createEl('div', { text: `No companion folder present for this note` });
				return;
			}

			if (cf.children.length === 0) {
				el.createEl('div', { text: `Companion Folder (${cf.path}) is empty.` });
				return;
			}

			const d = el.createEl('div', { text: `Companion Folder's (${cf.path}) content is:` });
			const l = el.createEl('ul')

			cf.children.forEach(file => {
				l.createEl('li', { text: `${file.name}` })
			});

			el.createEl('div', { text: `${cf.children.length} files in companion folder.` });

		  });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		/*this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});*/

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		//this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	isCompanionFolderExisting(noteFile: TFile): boolean {
		if (!noteFile.path.endsWith('.md')) {
			return false;
		}

		let companionFolderPath = noteFile.path.split('.').slice(0, -1).join('.');
		
		let fileRef = noteFile.vault.getAbstractFileByPath(companionFolderPath);
		return fileRef !== undefined && fileRef !== null;
	}

	getNoteCompanionFolder(noteFile: TFile): TFolder | null {
		if (!this.isCompanionFolderExisting(noteFile)) {
			return null;
		}

		let companionFolderPath = noteFile.path.split('.').slice(0, -1).join('.');
		return noteFile.vault.getAbstractFileByPath(companionFolderPath) as TFolder;
	}

	async openCompanionFolder(file: TAbstractFile) {
		// Absolute paths do not start with / and folder must not have trailing slash!
		let companionFolderPath = file.path.split('.').slice(0, -1).join('.');
		console.log(`Companion Folder for ${file.name} is ${companionFolderPath}`);

		let fileRef = file.vault.getAbstractFileByPath(companionFolderPath);
		console.log(`====== ${fileRef} rel: ${file.vault.getAbstractFileByPath('20240228114211.md')} folder: ${file.vault.getAbstractFileByPath('20240228114211')}`)
		if (fileRef === undefined || fileRef === null) {
			await file.vault.createFolder(companionFolderPath);
		}

		type MyApp = App & { showInFolder(path:string): void }
		(this.app as MyApp).showInFolder(companionFolderPath);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: NoteCompanionFolderPlugin;

	constructor(app: App, plugin: NoteCompanionFolderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
