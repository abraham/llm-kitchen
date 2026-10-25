import type { Attachment } from 'svelte/attachments';

/**
 * Makes a scrolling box focusable so keyboard users can scroll it with the arrow keys (WCAG 2.1.1,
 * axe's scrollable-region-focusable). The element still needs an accessible name.
 */
export const scrollable: Attachment<HTMLElement> = (node) => {
	node.tabIndex = 0;
};

/**
 * Makes each block equation inside the node focusable while it's too wide and scrolls sideways
 * (global.css), and only then, so narrow equations don't add Tab stops. Rechecks whenever the node
 * resizes: a new width, chapter, or explanation level.
 */
export const scrollableEquations: Attachment<HTMLElement> = (node) => {
	const observer = new ResizeObserver(() => {
		for (const math of node.querySelectorAll<MathMLElement>('math[display="block"]')) {
			if (math.scrollWidth > math.clientWidth) math.tabIndex = 0;
			else math.removeAttribute('tabindex');
		}
	});
	observer.observe(node);
	return () => observer.disconnect();
};
