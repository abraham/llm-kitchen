<script lang="ts">
	let { label, checked = $bindable() }: { label: string; checked: boolean } = $props();
</script>

<label class="toggle"><input type="checkbox" bind:checked /> {label}</label>

<style>
	.toggle {
		font-family: var(--font-sans);
		font-size: 0.875rem;
	}
</style>
