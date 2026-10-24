import { mdsvex } from 'mdsvex';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { remarkMath } from './scripts/mdsvex-math.ts';

// app.html's inline theme script runs before the page paints, so the CSP allows it by hash.
const appScriptHashes = [
	...readFileSync('src/app.html', 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)
].map(([, code]) => `sha256-${createHash('sha256').update(code).digest('base64')}` as const);

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in Svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ strict: true, fallback: '404.html' }),
			preprocess: [mdsvex({ extensions: ['.svx'], remarkPlugins: [remarkMath] })],
			extensions: ['.svelte', '.svx'],
			// The chapter route can load any chapter, so every page links every chapter's small CSS
			// file. Inlining files under 6 KB removes those render-blocking requests (Lighthouse).
			inlineStyleThreshold: 6144,
			// Emitted as a <meta> tag with hashes for SvelteKit's inline scripts; firebase.json adds
			// the header-only directives (frame-ancestors).
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self', 'wasm-unsafe-eval', ...appScriptHashes],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', 'blob:'],
					'font-src': ['self', 'data:'],
					'connect-src': ['self'],
					'worker-src': ['self', 'blob:'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self']
				}
			}
		})
	],
	// Tokenizers and Transformers.js are large but only loaded on demand (dynamic import / worker).
	build: { chunkSizeWarningLimit: 3000 },
	// ES workers keep dynamic imports as separate chunks, so a tokenizer only downloads its own vocabulary.
	worker: { format: 'es' },
	test: {
		expect: { requireAssertions: true },
		environment: 'node',
		include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/unit/**/*.test.ts']
	}
});
