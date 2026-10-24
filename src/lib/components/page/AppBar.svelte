<script lang="ts">
	import { resolve } from '$app/paths';
	import { LEVEL_NAMES, LEVELS, type Level } from '#lib/levels.ts';
	import { SITE_NAME } from '#lib/site.ts';
	import { level } from '#lib/stores/level.svelte.ts';
	import { theme, type ThemeChoice } from '#lib/stores/theme.svelte.ts';
	import Choice from '../ui/Choice.svelte';

	let {
		levelChoice = false
	}: {
		/** Whether to show the explanation level control (hidden until a chapter has another level). */
		levelChoice?: boolean;
	} = $props();

	const NAMES: Record<ThemeChoice, string> = {
		auto: 'Auto (matches your system)',
		light: 'Light',
		dark: 'Dark'
	};

	const LEVEL_OPTIONS = LEVELS.map((value) => ({ value, label: LEVEL_NAMES[value] }));

	$effect(() => theme.load());
	$effect(() => level.load());

	/**
	 * Switches level without moving the reader: the block at the top of the content keeps its place,
	 * or, if the new level hides it, the shared block before it does (so its replacement shows there).
	 */
	function choose(next: Level) {
		const top = document.querySelector('.app-bar')?.getBoundingClientRect().bottom ?? 0;
		const blocks = [...(document.getElementById('content')?.children ?? [])];
		const i = blocks.findIndex((el) => el.getBoundingClientRect().bottom > top);
		const anchors = [blocks[i], blocks.slice(0, i).findLast((el) => !el.matches('[data-levels]'))]
			.filter((el) => el !== undefined)
			.map((el) => ({ el, before: el.getBoundingClientRect().top }));
		level.set(next);
		const anchor = anchors.find(({ el }) => el.getClientRects().length > 0);
		if (anchor) scrollBy(0, anchor.el.getBoundingClientRect().top - anchor.before);
	}
</script>

<header class="app-bar">
	<a class="brand" href={resolve('/')}>{SITE_NAME}</a>
	<div class="tools">
		{#if levelChoice}
			<div class="level">
				<Choice
					legend="Explanations"
					hideLabel
					layout="inline"
					appearance="select"
					options={LEVEL_OPTIONS}
					bind:value={() => level.current, choose}
				/>
				<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
			</div>
		{/if}
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
	</div>
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

	.tools {
		--block-space: 0;
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.level {
		position: relative;
	}

	/* The native arrow ignores the theme, so it's replaced by .chevron, drawn in the ink color. */
	.level :global(select) {
		appearance: none;
		height: 2.25rem;
		padding: 0 calc(var(--space-2) + 1.25rem) 0 var(--space-3);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		font-family: var(--font-sans);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.level :global(select:hover) {
		background: var(--surface-2);
	}

	.chevron {
		position: absolute;
		right: var(--space-2);
		top: 50%;
		width: 1rem;
		height: 1rem;
		translate: 0 -50%;
		pointer-events: none;
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
