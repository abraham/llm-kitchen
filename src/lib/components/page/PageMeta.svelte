<script lang="ts">
	import { absoluteUrl, OG_IMAGE_SIZE, ogImagePath, SITE_NAME } from '#lib/site.ts';

	let {
		title,
		shareTitle = title,
		description,
		path,
		image,
		imageAlt,
		type
	}: {
		/** The document title. */
		title: string;
		/** The title on link previews, where the site name is shown separately. */
		shareTitle?: string;
		description: string;
		path: string;
		image: string;
		imageAlt: string;
		type: 'website' | 'article';
	} = $props();

	const url = $derived(absoluteUrl(path));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={shareTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={absoluteUrl(ogImagePath(image))} />
	<meta property="og:image:width" content={String(OG_IMAGE_SIZE.width)} />
	<meta property="og:image:height" content={String(OG_IMAGE_SIZE.height)} />
	<meta property="og:image:alt" content={imageAlt} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>
