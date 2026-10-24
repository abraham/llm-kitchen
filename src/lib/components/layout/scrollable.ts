import type { Attachment } from 'svelte/attachments';

/**
 * Makes a scrolling box focusable so keyboard users can scroll it with the arrow keys (WCAG 2.1.1,
 * axe's scrollable-region-focusable). The element still needs an accessible name.
 */
export const scrollable: Attachment<HTMLElement> = (node) => {
	node.tabIndex = 0;
};
