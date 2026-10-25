<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { LEVEL_NAMES, LEVELS, type Level } from '#lib/levels.ts';
	import type { TierId } from '#lib/models/tiers.ts';
	import { SITE_NAME } from '#lib/site.ts';
	import { level } from '#lib/stores/level.svelte.ts';
	import { modelTier } from '#lib/stores/model-tier.svelte.ts';
	import { theme, type ThemeChoice } from '#lib/stores/theme.svelte.ts';
	import Choice, { type Option } from '../ui/Choice.svelte';

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

	/** Density icons: more lines, more detail. */
	const LEVEL_ICONS: Record<Level, string> = {
		simple: 'M4 8h16M4 16h16',
		standard: 'M4 6h16M4 12h16M4 18h16',
		deep: 'M4 4.5h16M4 9.5h16M4 14.5h16M4 19.5h16'
	};

	$effect(() => theme.load());
	$effect(() => level.load());
	$effect(() => modelTier.load());

	/** Tier icons: a filled dot for recordings, a chip for a tier of models. */
	const TIER_ICONS: Record<TierId, string> = {
		recorded: 'M12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8z',
		small: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4'
	};

	const tierState = $derived(modelTier.state);
	const modelsName = $derived(
		`Models: ${modelTier.tier.name}` +
			(tierState.state === 'downloading'
				? `, downloading ${Math.round(tierState.fraction * 100)}%`
				: tierState.state === 'error'
					? ', download failed'
					: '')
	);

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
					options={LEVEL_OPTIONS}
					bind:value={() => level.current, choose}
					option={levelOption}
				/>
			</div>
		{/if}
		<a
			class="icon models"
			href={resolve('/downloads')}
			aria-label={modelsName}
			title={modelsName}
			aria-current={page.url.pathname === resolve('/downloads') ? 'page' : undefined}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path class:dot={modelTier.choice === 'recorded'} d={TIER_ICONS[modelTier.choice]} />
			</svg>
			{#if tierState.state === 'downloading' || tierState.state === 'checking'}
				<svg class="ring" viewBox="0 0 40 40" aria-hidden="true">
					<circle
						cx="20"
						cy="20"
						r="18"
						pathLength="1"
						stroke-dasharray="{tierState.state === 'downloading' ? tierState.fraction : 0} 1"
					/>
				</svg>
			{:else if tierState.state === 'error'}
				<span class="warning" aria-hidden="true">!</span>
			{/if}
		</a>
		<button
			type="button"
			class="icon"
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

{#snippet levelOption(o: Option<Level>)}
	<span class="option" data-option={o.value} title={o.label}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d={LEVEL_ICONS[o.value]} /></svg>
		<span class="text">{o.label}</span>
	</span>
{/snippet}

<style>
	/* Fixed, not sticky: Chrome scrolls to a focused control in a sticky bar that sits under the root's
	   scroll-padding, jumping the page. */
	.app-bar {
		position: fixed;
		inset: 0 0 auto;
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
		white-space: nowrap;
		/* On the narrowest phones the name gives way, so the controls stay on screen. */
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tools {
		flex-shrink: 0;
		--block-space: 0;
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.level :global(fieldset) {
		flex-wrap: nowrap;
		gap: 2px;
		padding: 2px;
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.level :global(label) {
		position: relative;
		display: flex;
		border-radius: calc(var(--radius) - 2px);
	}

	.level :global(label:hover) {
		background: var(--surface-2);
	}

	/* The radio covers its label, so the whole segment is the click target. */
	.level :global(input) {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	.level :global(label:has(input:focus-visible)) {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}

	.option {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		height: 2rem;
		padding: 0 0.375rem;
		border-radius: inherit;
		color: var(--ink-muted);
		font-size: 0.875rem;
		white-space: nowrap;
	}

	/* Unselected options keep their name for screen readers but show only the icon. */
	.text {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}

	/* Selected from the root attribute, which app.html sets before the page paints. */
	:global(:root:not([data-level])) .option[data-option='standard'],
	:global(:root[data-level='simple']) .option[data-option='simple'],
	:global(:root[data-level='deep']) .option[data-option='deep'] {
		padding-right: var(--space-2);
		background: var(--surface-2);
		color: var(--ink);
		font-weight: 600;
	}

	:global(:root:not([data-level])) .option[data-option='standard'] .text,
	:global(:root[data-level='simple']) .option[data-option='simple'] .text,
	:global(:root[data-level='deep']) .option[data-option='deep'] .text {
		position: static;
		width: auto;
		height: auto;
		clip-path: none;
	}

	.icon {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border-radius: 50%;
		background: none;
		color: var(--ink);
	}

	a.icon:hover,
	a.icon[aria-current='page'] {
		background: var(--surface-2);
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

	.models {
		position: relative;
	}

	.dot {
		fill: currentColor;
	}

	/* The ring and the warning sit over the link's edge, so they don't change its size. */
	.ring {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		rotate: -90deg;
		stroke: var(--c-prob);
		stroke-width: 2.5;
	}

	.warning {
		position: absolute;
		top: 0;
		right: 0;
		display: grid;
		place-items: center;
		width: 0.9rem;
		height: 0.9rem;
		border-radius: 50%;
		background: var(--c-loss);
		color: var(--page);
		font-size: 0.65rem;
		font-weight: 700;
		line-height: 1;
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

	/* Phones: tighter spacing keeps the name, the levels, and both buttons on one line. */
	@media (max-width: 30rem) {
		.app-bar {
			gap: var(--space-2);
			padding: 0 var(--space-3);
		}

		.tools {
			gap: var(--space-1);
		}

		.icon {
			width: 2.25rem;
			height: 2.25rem;
		}

		.option {
			padding: 0 0.25rem;
		}
	}
</style>
