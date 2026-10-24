<script lang="ts">
	import { resolve } from '$app/paths';
	import { SITE_NAME } from '#lib/site.ts';
	import { theme, type ThemeChoice } from '#lib/stores/theme.svelte.ts';

	const NAMES: Record<ThemeChoice, string> = {
		auto: 'Auto (matches your system)',
		light: 'Light',
		dark: 'Dark'
	};

	$effect(() => theme.load());
</script>

<header class="app-bar">
	<a class="brand" href={resolve('/')}>{SITE_NAME}</a>
	<button
		type="button"
		class="theme"
		aria-label="Theme: {NAMES[theme.choice]}"
		title="Theme: {NAMES[theme.choice]}"
		onclick={() => theme.next()}
	>
		<svg class="auto" viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="8" />
			<path class="half" d="M12 4a8 8 0 0 1 0 16z" />
		</svg>
		<svg class="sun" viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
			/>
		</svg>
		<svg class="moon" viewBox="0 0 24 24" aria-hidden="true">
			<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
		</svg>
	</button>
</header>

<style>
	.app-bar {
		position: sticky;
		top: 0;
		z-index: 15;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		height: var(--app-bar-height);
		padding: 0 var(--space-4);
		background: var(--page);
		border-bottom: 1px solid var(--rule);
		font-family: var(--font-sans);
	}

	.brand {
		font-weight: 700;
		color: var(--ink);
		text-decoration: none;
	}

	.theme {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border-radius: 50%;
		background: none;
		color: var(--ink);
	}

	svg {
		width: 1.25rem;
		height: 1.25rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.half {
		fill: currentColor;
		stroke: none;
	}

	/* The icon shows the choice before hydration too, so it's set in CSS from the root attribute. */
	.sun,
	.moon,
	:global(:root[data-theme]) .auto {
		display: none;
	}

	:global(:root[data-theme='light']) .sun,
	:global(:root[data-theme='dark']) .moon {
		display: block;
	}
</style>
