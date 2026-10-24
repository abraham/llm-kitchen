<script lang="ts">
	import type { Concept } from './concept.ts';

	let {
		label,
		value = $bindable(),
		min,
		max,
		step = 1,
		format = String,
		valueText,
		concept = 'token',
		width,
		layout = 'stack'
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		/** The readout after the label. */
		format?: (value: number) => string;
		/** What assistive tech announces, when the readout alone doesn't say it. */
		valueText?: (value: number) => string;
		concept?: Concept;
		/** Readout width in ch, reserved so the layout doesn't shift as it changes. */
		width?: number;
		/** stack: label above the track. inline: label beside it. */
		layout?: 'stack' | 'inline';
	} = $props();

	const id = $props.id();
</script>

<div class="slider {layout}" style:--accent="var(--c-{concept})">
	<label for={id} class="label"
		>{label}
		<span
			class="mono value"
			class:reserved={width}
			style:min-width={width && `${width}ch`}
			aria-hidden="true">{format(value)}</span
		></label
	>
	<input
		{id}
		type="range"
		{min}
		{max}
		{step}
		bind:value
		aria-valuetext={valueText?.(value) ?? (format === String ? undefined : format(value))}
	/>
</div>

<style>
	.slider {
		margin: 0 0 var(--control-space, var(--space-3));
		display: flex;
		flex-direction: column;
	}

	.inline {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-4);
	}

	.inline input {
		min-width: 12rem;
	}

	.reserved {
		display: inline-block;
		/* ch ignores the label's letter-spacing, so the reserved width would be too narrow. */
		letter-spacing: normal;
	}
</style>
