<script lang="ts">
	import '@fontsource-variable/source-serif-4/wght.css';
	import '@fontsource-variable/source-serif-4/wght-italic.css';
	import '@fontsource-variable/jetbrains-mono/wght.css';
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
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
