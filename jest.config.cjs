module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	transform: {
		'^.+\\.tsx?$': ['ts-jest', {
			tsconfig: {
				esModuleInterop: true,
				allowSyntheticDefaultImports: true,
			}
		}]
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	testMatch: ['**/tests/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
	],
	moduleNameMapper: {
		'^obsidian$': '<rootDir>/tests/mocks/obsidian.ts'
	},
};
