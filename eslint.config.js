import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

const chapterImports = {
	regex: '^#lib/chapters/',
	message: 'Only routes and chapters import chapter code.'
};

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	// Layers (docs/spec/architecture.md): imports only point down.
	layer(['src/lib/components/widgets/**'], [chapterImports], 'Shared widgets'),
	layer(
		['src/lib/components/primitives/**', 'src/lib/components/layout/**'],
		[
			chapterImports,
			{
				regex: '^#lib/components/widgets/',
				message: 'Primitives and layout render what they are given.'
			},
			{
				regex: '^#lib/datasets/(load|use)\\.ts$',
				allowTypeImports: true,
				message: 'Primitives and layout never fetch data.'
			}
		],
		'Primitives and layout'
	),
	layer(
		['src/lib/chapters/*/**'],
		[
			{
				regex: '^(\\.\\./[^.]|#lib/chapters/)',
				message: 'A chapter imports its own files and shared widgets, not another chapter.'
			}
		],
		'Chapters'
	),
	{
		files: [
			'src/lib/math/**',
			'src/lib/harness/**',
			'src/lib/curriculum/**',
			'src/lib/datasets/check.ts',
			'src/lib/datasets/registry.ts',
			'src/lib/datasets/parsers/**'
		],
		ignores: ['**/*.test.ts'],
		languageOptions: { globals: { ...globals.node } },
		rules: {
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{
					patterns: [
						chapterImports,
						{
							regex:
								'^(svelte|\\$app)(/|$)|^#lib/(components|workers|stores)/|^#lib/models/(browser-|inference-|load-)|^#lib/datasets/(load|use)\\.ts$',
							message: 'Logic is plain TypeScript: no Svelte, app, UI, or browser-model imports.'
						}
					]
				}
			],
			'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage']
		}
	}
);

/** Files in `files` may not import modules matching `patterns`. */
function layer(files, patterns, name) {
	return {
		name: `layers/${name}`,
		files,
		ignores: ['**/*.test.ts', '**/*.e2e.ts'],
		rules: { '@typescript-eslint/no-restricted-imports': ['error', { patterns }] }
	};
}
