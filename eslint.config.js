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

const noFetch = {
	regex: '^#lib/datasets/(load|use)\\.ts$',
	allowTypeImports: true,
	message: 'Only widgets get data; components render what they are given.'
};

const COMPONENT_FOLDERS = ['ui', 'primitives', 'frame', 'page', 'widgets'];

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
	// Layers (docs/spec/architecture.md and components.md): imports only point down.
	componentLayer('widgets', ['ui', 'primitives', 'frame']),
	componentLayer('page', ['ui'], [noFetch]),
	componentLayer('frame', ['ui'], [noFetch]),
	componentLayer('primitives', ['ui'], [noFetch]),
	layer(
		['src/lib/components/ui/**'],
		[
			{
				regex: '^(#lib/(?!components/ui/)|\\.\\./)',
				allowTypeImports: true,
				message: 'components/ui/ knows nothing outside itself.'
			}
		],
		'Components: ui'
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

/** `components/<folder>/` may import only the component folders in `allowed`. */
function componentLayer(folder, allowed, patterns = []) {
	const banned = COMPONENT_FOLDERS.filter((f) => f !== folder && !allowed.includes(f));
	return layer(
		[`src/lib/components/${folder}/**`],
		[
			chapterImports,
			{
				regex: `^#lib/components/(${banned.join('|')})/`,
				message: `components/${folder}/ imports only ${allowed.map((f) => `${f}/`).join(', ')}.`
			},
			...patterns
		],
		`Components: ${folder}`
	);
}
