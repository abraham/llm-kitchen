<script module lang="ts">
	export type Option<T> = { value: T; label: string; disabled?: boolean };
</script>

<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';

	let {
		legend,
		options,
		value = $bindable(),
		appearance = 'radios',
		layout = 'wrap',
		hideLabel = false,
		option
	}: {
		legend: string;
		options: readonly Option<T>[];
		value: T;
		/** Radios for a few short options; a select for many or long ones. */
		appearance?: 'radios' | 'select';
		/** wrap: name above, options in a row. stack: one option per line. inline: name beside them. */
		layout?: 'wrap' | 'stack' | 'inline';
		hideLabel?: boolean;
		/** Custom content for each radio's label. */
		option?: Snippet<[Option<T>]>;
	} = $props();

	const id = $props.id();
</script>

{#if appearance === 'select'}
	<div class="choice {layout}">
		<label class="label" class:visually-hidden={hideLabel} for={id}>{legend}</label>
		<select {id} bind:value>
			{#each options as o, i (i)}
				<option value={o.value} disabled={o.disabled}>{o.label}</option>
			{/each}
		</select>
	</div>
{:else}
	<fieldset class="choice {layout}">
		<legend class="label" class:visually-hidden={hideLabel}>{legend}</legend>
		{#each options as o, i (i)}
			<label>
				<input type="radio" name={id} value={o.value} disabled={o.disabled} bind:group={value} />
				{#if option}{@render option(o)}{:else}{o.label}{/if}
			</label>
		{/each}
	</fieldset>
{/if}

<style>
	.choice {
		min-width: 0;
		margin: 0 0 var(--block-space, var(--space-3));
		padding: 0;
		border: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1) var(--space-4);
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}

	legend {
		padding: 0;
	}

	.stack {
		flex-direction: column;
		align-items: start;
		gap: var(--space-1);
	}

	.inline legend {
		float: left;
		margin-right: var(--space-2);
	}

	div.choice:not(.inline) {
		flex-direction: column;
		align-items: stretch;
		gap: 0;
	}

	div.inline {
		gap: var(--space-2);
	}
</style>
