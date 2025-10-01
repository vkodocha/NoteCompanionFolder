// Mock implementation of Obsidian API for testing

export class Plugin {
	app: any;
	manifest: any;

	constructor(app: any, manifest: any) {
		this.app = app;
		this.manifest = manifest;
	}

	async loadData(): Promise<any> {
		return {};
	}

	async saveData(data: any): Promise<void> {}

	addCommand(command: any): void {}
	addRibbonIcon(icon: string, title: string, callback: any): any {}
	registerEvent(event: any): void {}
	registerDomEvent(el: HTMLElement, type: string, callback: any, options?: any): void {}
	registerMarkdownCodeBlockProcessor(language: string, handler: any): void {}
	addSettingTab(tab: any): void {}
}

export class PluginSettingTab {
	app: any;
	plugin: any;

	constructor(app: any, plugin: any) {
		this.app = app;
		this.plugin = plugin;
	}

	display(): void {}
}

export class Setting {
	constructor(containerEl: HTMLElement) {}
	setName(name: string): this { return this; }
	setDesc(desc: string): this { return this; }
	addText(cb: (text: any) => void): this {
		cb({
			setPlaceholder: () => ({ setValue: () => ({ onChange: () => {} }) })
		});
		return this;
	}
	addToggle(cb: (toggle: any) => void): this {
		cb({
			setValue: () => ({ onChange: () => {} })
		});
		return this;
	}
	addButton(cb: (button: any) => void): this { return this; }
}

export class Modal {
	app: any;
	contentEl: HTMLElement = document.createElement('div');

	constructor(app: any) {
		this.app = app;
	}

	open(): void {}
	close(): void {}
	onOpen(): void {}
	onClose(): void {}
}

export class Notice {
	constructor(message: string) {}
}

export interface TAbstractFile {
	vault: Vault;
	path: string;
	name: string;
	parent: TFolder | null;
}

export interface TFile extends TAbstractFile {
	basename: string;
	extension: string;
}

export class TFolder implements TAbstractFile {
	vault!: Vault;
	path!: string;
	name!: string;
	parent!: TFolder | null;
	children: TAbstractFile[] = [];
}

export class Vault {
	getAbstractFileByPath(path: string): TAbstractFile | null {
		return null;
	}

	getFolderByPath(path: string): TFolder | null {
		return null;
	}

	async createFolder(path: string): Promise<void> {}
	async createBinary(path: string, data: ArrayBuffer): Promise<TFile> {
		return {} as TFile;
	}
	async modifyBinary(file: TFile, data: ArrayBuffer): Promise<void> {}
}

export function normalizePath(path: string): string {
	// Simple normalization for testing
	return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

export function addIcon(iconId: string, svgContent: string): void {}

export class MarkdownView {
	file: TFile | null = null;
	contentEl: HTMLElement = document.createElement('div');
	containerEl: HTMLElement = document.createElement('div');
	editor: any = null;
}

export class App {
	workspace: any;
	vault: Vault = new Vault();
}

export interface WorkspaceLeaf {
	view: any;
}
