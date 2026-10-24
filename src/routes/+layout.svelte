<script lang="ts">
	import '../styles/global.css';
	import favicon from '#lib/assets/favicon.svg';
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
	<!-- The --page color from tokens.css, for browser chrome. -->
	<meta name="theme-color" content="#fbf8f3" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#1c1a17" media="(prefers-color-scheme: dark)" />
</svelte:head>

{@render children()}
