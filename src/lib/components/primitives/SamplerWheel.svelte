<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { motion } from '#lib/stores/motion-prefs.svelte.ts';
	import { displayToken, formatPercent } from './format.ts';

	let {
		slices,
		landOn = null,
		spin = 0,
		onlanded
	}: {
		slices: { label: string; p: number }[];
		/** Index of the slice to land on, or null to rest. */
		landOn?: number | null;
		/** Change this number to start a new spin to `landOn`. */
		spin?: number;
		onlanded?: (index: number) => void;
	} = $props();

	const SIZE = 220;
	const R = SIZE / 2 - 6;

	const arcs = $derived.by(() => {
		const total = slices.reduce((a, s) => a + s.p, 0);
		const withRest = total < 0.999 ? [...slices, { label: 'other', p: 1 - total }] : slices;
		let start = 0;
		return withRest.map((s, i) => {
			const sweep = s.p * 360;
			const arc = { ...s, index: i, start, end: start + sweep, center: start + sweep / 2, sweep };
			start += sweep;
			return arc;
		});
	});

	const rotation = new Tween(0, { easing: cubicOut });
	let landed = $state<number | null>(null);

	$effect(() => {
		// Re-run on every `spin` change.
		void spin;
		if (landOn === null || !arcs[landOn]) return;
		const index = landOn;
		const center = arcs[index].center;
		untrack(() => {
			const current = rotation.target;
			const wanted = (((-center - current) % 360) + 360) % 360;
			const target = current + (motion.reduced ? 0 : 360 * 3) + wanted;
			landed = null;
			rotation.set(target, { duration: motion.duration(1400) }).then(() => {
				landed = index;
				onlanded?.(index);
			});
		});
	});

	function point(angle: number, radius: number) {
		const rad = ((angle - 90) * Math.PI) / 180;
		return [SIZE / 2 + radius * Math.cos(rad), SIZE / 2 + radius * Math.sin(rad)];
	}

	function slicePath(start: number, end: number) {
		if (end - start >= 359.999) {
			return `M ${SIZE / 2} ${SIZE / 2 - R} a ${R} ${R} 0 1 1 0 ${2 * R} a ${R} ${R} 0 1 1 0 ${-2 * R}`;
		}
		const [x1, y1] = point(start, R);
		const [x2, y2] = point(end, R);
		const large = end - start > 180 ? 1 : 0;
		return `M ${SIZE / 2} ${SIZE / 2} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
	}

	const description = $derived(
		landed === null
			? `Spinner with ${arcs.length} slices sized by probability`
			: `Spinner landed on ${displayToken(arcs[landed].label)}`
	);
</script>

<div class="sampler">
	<svg viewBox="0 0 {SIZE} {SIZE}" width={SIZE} height={SIZE} role="img" aria-label={description}>
		<g transform="rotate({rotation.current} {SIZE / 2} {SIZE / 2})">
			{#each arcs as arc (arc.index)}
				<path
					d={slicePath(arc.start, arc.end)}
					class="slice"
					class:rest={arc.label === 'other'}
					class:alt={arc.index % 2 === 1}
					class:landed={landed === arc.index}
				/>
				{#if arc.sweep > 28}
					{@const [x, y] = point(arc.center, R * 0.62)}
					{@const screen = (((arc.center + rotation.current) % 360) + 360) % 360}
					{@const upright = screen > 90 && screen < 270 ? arc.center + 180 : arc.center}
					<text {x} {y} transform="rotate({upright} {x} {y})" class="slice-label">
						{displayToken(arc.label)}
					</text>
				{/if}
			{/each}
		</g>
		<polygon
			points="{SIZE / 2 - 9},2 {SIZE / 2 + 9},2 {SIZE / 2},20"
			class="pointer"
			aria-hidden="true"
		/>
	</svg>
	<ol class="legend">
		{#each arcs as arc (arc.index)}
			<li class:landed={landed === arc.index}>
				<span class="swatch" class:alt={arc.index % 2 === 1} class:rest={arc.label === 'other'}
				></span>
				<span class="mono">{displayToken(arc.label)}</span>
				<span class="pct">{formatPercent(arc.p)}</span>
			</li>
		{/each}
	</ol>
</div>

<style>
	.sampler {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
	}

	svg {
		flex: none;
		max-width: 100%;
		height: auto;
	}

	.slice {
		fill: var(--c-prob);
		stroke: var(--surface);
		stroke-width: 2;
	}

	.slice.alt {
		fill: var(--c-prob-tint);
		stroke: var(--c-prob);
		stroke-width: 1;
	}

	.slice.rest {
		fill: var(--surface-2);
		stroke: var(--rule);
	}

	.slice.landed {
		stroke: var(--ink);
		stroke-width: 3;
	}

	.slice-label {
		font-family: var(--font-mono);
		font-size: 12px;
		text-anchor: middle;
		dominant-baseline: middle;
		fill: var(--surface);
		pointer-events: none;
	}

	.alt + .slice-label,
	.rest + .slice-label {
		fill: var(--c-prob-ink);
	}

	.pointer {
		fill: var(--ink);
	}

	.legend {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 0.875rem;
	}

	.legend li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.legend li.landed {
		font-weight: 700;
	}

	.swatch {
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 2px;
		background: var(--c-prob);
	}

	.swatch.alt {
		background: var(--c-prob-tint);
		border: 1px solid var(--c-prob);
	}

	.swatch.rest {
		background: var(--surface-2);
		border: 1px solid var(--rule);
	}

	.pct {
		font-family: var(--font-mono);
		color: var(--c-prob-ink);
	}
</style>
