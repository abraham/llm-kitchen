<script lang="ts">
	import '../styles/global.css';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import AppBar from '#lib/components/page/AppBar.svelte';
	import { LEVEL_CHOICE } from '#lib/chapters/config.ts';
	import { REPO_URL } from '#lib/site.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Lets end-to-end tests wait until widgets are interactive.
	$effect(() => {
		document.documentElement.dataset.hydrated = '';
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<!-- The --page color from tokens.css, for browser chrome; stores/theme.svelte.ts switches `media`. -->
	<meta
		name="theme-color"
		content="#fbf8f3"
		media="(prefers-color-scheme: light)"
		data-scheme="light"
	/>
	<meta
		name="theme-color"
		content="#1c1a17"
		media="(prefers-color-scheme: dark)"
		data-scheme="dark"
	/>
</svelte:head>

{#if !page.error}
	<a class="skip" href="#content">Skip to content</a>
{/if}
<AppBar levelChoice={LEVEL_CHOICE} />
{@render children()}
<footer class="site-footer">
	Made by <a href="https://abrah.am/" rel="noopener noreferrer" target="_blank">Abraham Williams</a>
	·
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href={REPO_URL} rel="noopener noreferrer" target="_blank">Source on GitHub</a>
</footer>

<style>
	.skip {
		position: absolute;
		left: var(--space-4);
		top: -3rem;
		z-index: 20;
		padding: var(--space-2) var(--space-3);
		background: var(--surface);
		border: 1px solid var(--rule);
	}

	.skip:focus {
		top: var(--space-2);
	}

	.site-footer {
		padding: var(--space-6) var(--space-4);
		border-top: 1px solid var(--rule);
		color: var(--ink-muted);
		font-family: var(--font-sans);
		font-size: 0.875rem;
		text-align: center;
	}
</style>
