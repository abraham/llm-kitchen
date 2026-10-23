import { prefersReducedMotion } from 'svelte/motion';

/** Motion settings shared by every animation. Follows the OS `prefers-reduced-motion` setting. */
export const motion = {
	get reduced(): boolean {
		return prefersReducedMotion.current;
	},
	/** `ms` normally, 0 when reduced motion is on (widgets then jump to the end state). */
	duration(ms: number): number {
		return prefersReducedMotion.current ? 0 : ms;
	}
};
