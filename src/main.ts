import { App, MarkdownView, Notice, Plugin, TAbstractFile, TFile, TFolder, Vault, WorkspaceLeaf, addIcon, normalizePath } from 'obsidian';
import { DEFAULT_SETTINGS, NoteCompanionFolderPluginSettingTab, NoteCompanionFolderPluginSettings } from './settings';
import { FileConflictModal } from './FileConflictModal';


const LABEL = 'Reveal companion folder';
const ICON_ID = 'companion-folder';
const ICON_SVG = '<g fill="none"><path d="M 9.92126 99 L 79.3701 99 C 84.84946 99 89.29136 95.7707 89.29136 90.29134 L 89.29136 28.283464 L 62.00789 1 L 19.842523 1 C 14.36316 1 9.92126 5.441899 9.92126 10.92126 L 9.92126 25.80315" stroke="currentColor" stroke-linecap="butt" stroke-linejoin="round" stroke-width="10"/><path d="M 59.52756 2.8346457 L 59.52756 32.598425 L 89.29134 32.598425" stroke="currentColor" stroke-linecap="butt" stroke-linejoin="round" stroke-width="10"/><path transform="translate(4, 0)" d="M 44.66635 84.70457 C 47.407297 84.70457 49.629275 82.48259 49.629275 79.74164 L 49.629275 54.927004 C 49.629275 52.186054 47.407297 49.964076 44.66635 49.964076 L 25.062784 49.964076 C 23.376214 49.98061 21.796687 49.139443 20.86911 47.73076 L 18.859125 44.753 C 17.941175 43.359114 16.384079 42.51996 14.71508 42.519685 L 4.9629275 42.519685 C 2.2219783 42.519685 -7105427e-21 44.741663 -7105427e-21 47.48261 L -7105427e-21 79.74164 C -7105427e-21 82.48259 2.2219783 84.70457 4.9629275 84.70457 Z" stroke="currentColor" stroke-linecap="butt" stroke-linejoin="round" stroke-width="8"/></g>';

export default class NoteCompanionFolderPlugin extends Plugin {
	settings: NoteCompanionFolderPluginSettings;

	async onload() {
		await this.loadSettings();

		this.installDropHandlerFromAllLeafs();

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

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				const editorEl = this.getActiveEditorElement();
				this.setupDropHandling(editorEl);
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
			id: 'reveal-folder',
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
			const noteFile = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
			if (!noteFile) {
				el.createEl('div', { text: `File ending is not .md` });
				return;
			}

			if (!(noteFile instanceof TFile)) {
				el.createEl('div', { text: `Note file type is not TFile.` });
				return;
			}

			if (!this.isCompanionFolderExisting(noteFile)) {
				el.createEl('div', { text: `No companion folder present for this note` });
				return;
			}

			const cf = this.getNoteCompanionFolder(noteFile);
			if (!cf) {
				el.createEl('div', { text: `No companion folder present for this note` });
				return;
			}

			if (cf.children.length === 0) {
				el.createEl('div', { text: `Companion folder (${cf.path}) is empty.` });
				return;
			}

			const d = el.createEl('div', { text: `Companion folder's (${cf.path}) content is:` });
			const l = el.createEl('ul')

			cf.children.forEach(file => {
				l.createEl('li', { text: `${file.name}` })
			});

			el.createEl('div', { text: `${cf.children.length} files in companion folder.` });

		});

		this.addSettingTab(new NoteCompanionFolderPluginSettingTab(this.app, this));
	}

	onunload() {
		// we use this.registerDomEvent and so don't need to remove the drop handler manually
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Add drop handler when feature was activated
		// but we do not remove them in the other case
		// this is handled in the handleDrop callback 
		// method.
		if (this.settings.handleFileDrop) {
			this.installDropHandlerFromAllLeafs();
		}
		
	}

	getPathToCompanionFolder(noteFile: TFile): string | null {
		if (!noteFile.path.endsWith('.md')) {
			return null;
		}

		const noteName = noteFile.basename
		const parentPath = noteFile.parent?.path
		let noteSubfolder = '';
		if (parentPath != null && parentPath !== '/' /* Note is directly in vault root */) {
			noteSubfolder = parentPath + '/';
		}

		if (this.settings.companionFolderLocation.length > 0) {
			const l = this.settings.companionFolderLocation
			return normalizePath(l + (l.endsWith('/') ? '' : '/') + noteSubfolder + noteName);
		}

		
		return noteSubfolder + noteName;
	}

	isCompanionFolderExisting(noteFile: TFile): boolean {
		const pathToCompanionFolder = this.getPathToCompanionFolder(noteFile);
		if (!pathToCompanionFolder) {
			return false;
		}

		const fileRef = noteFile.vault.getAbstractFileByPath(pathToCompanionFolder);
		return fileRef !== undefined && fileRef !== null;
	}

	getNoteCompanionFolder(noteFile: TFile): TFolder | null {
		if (!this.isCompanionFolderExisting(noteFile)) {
			return null;
		}

		const pathToCompanionFolder = this.getPathToCompanionFolder(noteFile);
		if (!pathToCompanionFolder) {
			return null;
		}

		const f = noteFile.vault.getAbstractFileByPath(pathToCompanionFolder);
		if (!f || !(f instanceof TFolder)) {
			return null;
		}

		return f;
	}

	async openCompanionFolder(file: TAbstractFile) {
		// Absolute paths do not start with / and folder must not have trailing slash!
		if (!(file instanceof TFile)) {
			new Notice('Unable to find companion folder.');
			return
		}

		const pathToCompanionFolderPath = this.getPathToCompanionFolder(file);
		if (!pathToCompanionFolderPath) {
			new Notice('Unable to find companion folder.');
			return null;
		}

		const pathToCompanionFolder = file.vault.getAbstractFileByPath(pathToCompanionFolderPath);
		
		if (pathToCompanionFolder === undefined || pathToCompanionFolder === null) {
			await file.vault.createFolder(pathToCompanionFolderPath);
		}

		type MyApp = App & { showInFolder(path: string): void }
		(this.app as MyApp).showInFolder(pathToCompanionFolderPath);
	}

	// Drag and drop handling

	private dropListeners = new WeakSet<HTMLElement>();

	private installDropHandlerFromAllLeafs() {
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				console.debug('install drop  handler (if needed) for', leaf.view.containerEl);

				const editorEl = leaf.view.contentEl;
				this.setupDropHandling(editorEl);
			}
		});
	}

	setupDropHandling(editorEl: HTMLElement | null) {
		if (!editorEl) {
			return;
		}

		if (!this.settings.handleFileDrop) {
			console.debug(`Do not setup drop handling for companion folder`);

			return;
		}

		if (!this.dropListeners.has(editorEl)) {
			console.debug('registerEvent in file-open register drop for ', editorEl);
			this.dropListeners.add(editorEl);
			this.registerDomEvent(editorEl, "drop", this.handleDrop, true);
		} else {
			console.debug('event is already registered ', editorEl);
		}
	}

	private getActiveEditorElement(): HTMLElement | null {
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeLeaf) return null;

		return activeLeaf.containerEl;
	}

	private handleDrop = async (event: DragEvent) => {
		if (!event.dataTransfer) return;

		// We need to check this as we can't remove the handler added with this.registerDomEvent.
		if (!this.settings.handleFileDrop) {
			console.debug(`Do not setup drop handling for companion folder`);

			return;
		}

		event.preventDefault();
		event.stopPropagation();

		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeLeaf) return null;

		const noteFile = activeLeaf.file;
		if (!noteFile) return null;

		const pathToCompanionFolderPath = this.getPathToCompanionFolder(noteFile);
		if (!pathToCompanionFolderPath) {
			new Notice('Unable to find companion folder.');
			console.error('Could not getPathToCompanionFolder for note at ' + noteFile);

			return null;
		}

		const pathToCompanionFolder = noteFile.vault.getAbstractFileByPath(pathToCompanionFolderPath);
		if (pathToCompanionFolder === undefined || pathToCompanionFolder === null) {
			await noteFile.vault.createFolder(pathToCompanionFolderPath);
		}

		const existingCompanionFolder = noteFile.vault.getFolderByPath(pathToCompanionFolderPath);
		if (!existingCompanionFolder) {
			new Notice('Unable to find companion folder.');
			console.error('Could not getFolderByPath for note companion folder at ' + pathToCompanionFolderPath);

			return null;
		}

		const files = Array.from(event.dataTransfer.files);
		const embedLinks = [];
		for (const file of files) {
			// do not use `<file>.vault.getFolderByPath` here as it does not work for a file which does not yet exist in the vault.
			const targetFilePath = `${existingCompanionFolder.path}/${file.name}`;

			const movedFilePath = await this.processDroppedFile(file, targetFilePath);
			if (!movedFilePath) continue;

			embedLinks.push(movedFilePath);
		}

		// Insert at current cursor position
		this.handleFileEmbeds(activeLeaf, embedLinks, event.shiftKey);
	};
	
	async processDroppedFile(file: File, targetFile: string): Promise<string | null> {
		console.debug(`in processDroppedFile for ${file.name} move it to ${targetFile}`);

		const arrayBuffer = await file.arrayBuffer();
		
		let replaceFile = false;
		const tf = this.app.vault.getAbstractFileByPath(targetFile);
		if (tf !== undefined && tf !== null) {
			// A file with the same name exist already at the destination
			const decision = await new Promise((resolve) => {
				new FileConflictModal(this.app, tf.name, resolve).open();
			});

			if (decision === "replace") {
				replaceFile = true;
			} else if (decision === "rename") {
				try {
					targetFile = await this.getAvailableFileName(tf as TFile, this.app.vault);
				} catch (err) {
					new Notice("Unable to find a unique file name.");

					return null; // behaves like cancel in this case
				  }
			} else {
				return null;
			}
		}
		
		await this.moveFile(targetFile, arrayBuffer, replaceFile);

		return targetFile;
	}

	private async moveFile(targetFile: string, arrayBuffer: ArrayBuffer, override: boolean = false) {
		try {
			if (override) {
				const tf = this.app.vault.getAbstractFileByPath(targetFile);
				if (!tf) return null; // we checked earlier if the file exists so this operation is not expected to return null
				await this.app.vault.modifyBinary(tf as TFile, arrayBuffer);
			} else {
				await this.app.vault.createBinary(targetFile, arrayBuffer);
			}
			
			new Notice(`Moved dropped file to: ${targetFile}`);
		} catch (e) {
			console.error("Error saving dropped file:", e);
		}
	}

	private handleFileEmbeds(view: MarkdownView, filesToEmbed: string[], embedAsLinkOnly: boolean) {
		const editor = view.editor;
		if (!editor) return;

		editor.replaceRange(filesToEmbed.map(f => embedAsLinkOnly ? `[[${f}]]` : `![[${f}]]`).join("\n"), editor.getCursor());
	}

	/**
	* Finds the first available filename by appending (1), (2), ... up to maxAttempts.
	*
	* @param originalFile - The original TFile to base the name on
	* @param vault - The vault to check for file existence
	* @param maxAttempts - Optional maximum attempts to try (default: 50)
	* @returns A new file path that does not exist yet
	* @throws If no available name is found within maxAttempts
	*/
	private async getAvailableFileName(
		originalFile: TFile,
		vault: Vault,
		maxAttempts: number = 50
	): Promise<string> {
		const folderPath = originalFile.parent?.path ?? "";
		const baseName = originalFile.basename;
		const extension = originalFile.extension;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			const name = `${baseName} (${attempt}).${extension}`;
			const newPath = folderPath ? `${folderPath}/${name}` : name;

			if (!vault.getAbstractFileByPath(newPath)) {
				return newPath;
			}
		}

		throw new Error(`Could not find available file name after ${maxAttempts} attempts`);
	}

}
