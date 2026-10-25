import type { Attachment } from 'svelte/attachments';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Calls `onpoint` with where the pointer is, as fractions (0 to 1) of the element's box, when it's
 * pressed and while it drags. Works with mouse, pen, and touch; give the element
 * `touch-action: none` so a drag on a touch screen moves the point rather than the page. A figure
 * that uses it still offers the same change through a control.
 */
export function pointer(onpoint: (fx: number, fy: number) => void): Attachment<Element> {
	return (element) => {
		let dragging = false;
		const at = (event: PointerEvent) => {
			const box = element.getBoundingClientRect();
			onpoint(
				clamp01((event.clientX - box.left) / box.width),
				clamp01((event.clientY - box.top) / box.height)
			);
		};
		const down = (event: PointerEvent) => {
			if (event.button !== 0) return;
			dragging = true;
			element.setPointerCapture(event.pointerId);
			at(event);
		};
		const move = (event: PointerEvent) => {
			if (dragging) at(event);
		};
		const up = () => (dragging = false);
		const events = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up };
		for (const [name, fn] of Object.entries(events)) {
			element.addEventListener(name, fn as EventListener);
		}
		return () => {
			for (const [name, fn] of Object.entries(events)) {
				element.removeEventListener(name, fn as EventListener);
			}
		};
	};
}
