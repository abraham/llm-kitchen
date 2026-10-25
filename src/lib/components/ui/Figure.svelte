<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		width = $bindable(0),
		height = 0,
		max,
		viewBox,
		maxWidth,
		overflow = false,
		children
	}: {
		/** What the figure shows now, for screen readers; derive it from the same state as the drawing. */
		label: string;
		/** Redrawn figures: the width to draw at, in CSS pixels. Starts at the bound value (drawn before
		 * the page hydrates), then follows the room there is, up to `max`. */
		width?: number;
		/** Redrawn figures: the height to draw at, in CSS pixels. */
		height?: number;
		/** Redrawn figures: the widest they draw; without it they fill the room there is. */
		max?: number;
		/** Scaled figures: a fixed drawing size that scales to fit, while text keeps its CSS size. */
		viewBox?: readonly [number, number];
		/** Scaled figures: the widest they show, as a CSS length. */
		maxWidth?: string;
		/** Show what's drawn past the edges, such as an end label beside a line; hidden otherwise. */
		overflow?: boolean;
		children: Snippet;
	} = $props();

	let measured = $state(0);

	$effect(() => {
		if (!viewBox && measured) width = max ? Math.min(measured, max) : measured;
	});

	const size = $derived(viewBox ?? [width, height]);
	/** Drawing units per CSS pixel. Scaled figures size text as `max(12px, var(--min-text))`, so a
	 * label never shows smaller than 11px however far the figure scales down. */
	const k = $derived(viewBox && measured ? viewBox[0] / measured : 1);
</script>

<div
	class="figure"
	bind:clientWidth={measured}
	style:max-width={viewBox ? maxWidth : max ? `${max}px` : undefined}
	style:--min-text="{11 * k}px"
>
	<svg
		viewBox="0 0 {size[0]} {size[1]}"
		style:height={viewBox ? undefined : `${height}px`}
		class:overflow
		role="img"
		aria-label={label}
	>
		{@render children()}
	</svg>
</div>

<style>
	.figure {
		min-width: 0;
	}

	/* A redrawn figure keeps its height (set inline), so the page doesn't shift when it hydrates and
	   redraws at the measured width; until then its drawing scales to fit inside that box. */
	svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: hidden;
		font-family: var(--font-sans);
	}

	.overflow {
		overflow: visible;
	}
</style>
