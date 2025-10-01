import { TFile, TFolder, Vault } from 'obsidian';

/**
 * Creates a mock TFile for testing
 */
export function createMockFile(path: string, basename?: string, extension = 'md'): TFile {
	const parts = path.split('/');
	const fileName = parts[parts.length - 1];
	const actualBasename = basename || fileName.replace(/\.[^/.]+$/, '');

	return {
		path,
		name: fileName,
		basename: actualBasename,
		extension,
		parent: createMockFolder(parts.slice(0, -1).join('/')),
		vault: {} as Vault,
	} as TFile;
}

/**
 * Creates a mock TFolder for testing
 */
export function createMockFolder(path: string): TFolder | null {
	if (!path || path === '/') {
		return null;
	}

	const folder = new TFolder();
	folder.path = path;
	folder.name = path.split('/').pop() || '';
	folder.children = [];
	folder.parent = null;
	folder.vault = {} as Vault;

	return folder;
}

/**
 * Creates a mock Vault for testing
 */
export function createMockVault(files: Record<string, TFile | TFolder> = {}): Vault {
	return {
		getAbstractFileByPath: (path: string) => files[path] || null,
		getFolderByPath: (path: string) => {
			const file = files[path];
			return file && 'children' in file ? file : null;
		},
		createFolder: jest.fn(),
		createBinary: jest.fn(),
		modifyBinary: jest.fn(),
	} as unknown as Vault;
}
