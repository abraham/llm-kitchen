<script lang="ts">
	import { resolve } from '$app/paths';
	import { chapter, type Slug } from '#lib/curriculum/index.ts';

	let {
		to,
		through,
		title = false,
		bare = false
	}: {
		to: Slug;
		/** Last chapter of a range, rendered "Ch a–b". */
		through?: Slug;
		/** Append ": Title". */
		title?: boolean;
		/** Leave off "Ch ", for a second number in a list. */
		bare?: boolean;
	} = $props();

	const first = $derived(chapter(to));
	const last = $derived(through && chapter(through));
	const text = $derived(
		`${bare ? '' : 'Ch '}${first.number}${last ? `–${last.number}` : ''}${title ? `: ${first.title}` : ''}`
	);
</script>

<a href={resolve('/[chapter]', { chapter: to })} title={title ? undefined : first.title}>{text}</a>
