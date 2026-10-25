<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SITE_NAME } from '#lib/site.ts';

	const title = $derived(page.status === 404 ? 'Page not found' : 'Something went wrong');
</script>

<svelte:head>
	<title>{title} · {SITE_NAME}</title>
</svelte:head>

<main id="content" class="prose error">
	<h1>{title}</h1>
	<p>{page.status === 404 ? "There's no page at this address." : page.error?.message}</p>
	<p><a href={resolve('/')}>Back to the menu</a></p>
</main>

<style>
	.error {
		padding-block: var(--space-12);
	}
</style>
