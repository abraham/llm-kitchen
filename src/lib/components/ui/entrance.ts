import type { Attachment } from 'svelte/attachments';

const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
/** Past this many shapes, a figure fades in as a whole rather than shape by shape. */
const MAX_SHAPES = 300;
const SHAPES = 'path, line, polyline, polygon, circle, ellipse, rect, text';

/** The `--duration` token in ms: 300 normally, 0 under reduced motion (tokens.css). */
function duration(element: Element): number {
	const raw = getComputedStyle(element).getPropertyValue('--duration').trim();
	return raw.endsWith('ms') ? parseFloat(raw) : raw.endsWith('s') ? parseFloat(raw) * 1000 : 0;
}

/** Plays the entrance: lines draw, shapes and text fade in, bars grow, from the top left. */
function play(root: Element, ms: number) {
	const box = root.getBoundingClientRect();
	const delay = (el: Element) => {
		const r = el.getBoundingClientRect();
		const fx = box.width ? (r.left - box.left) / box.width : 0;
		const fy = box.height ? (r.top - box.top) / box.height : 0;
		return Math.max(0, ((fx + fy) / 2) * ms * 1.5);
	};
	const options = (el: Element) => ({
		duration: ms * 2,
		delay: delay(el),
		easing: EASE,
		fill: 'backwards' as const
	});

	const shapes = root instanceof SVGSVGElement ? [...root.querySelectorAll(SHAPES)] : [];
	if (shapes.length > MAX_SHAPES) {
		root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms * 2, easing: EASE });
		return;
	}
	for (const el of shapes) {
		const style = getComputedStyle(el);
		const draws =
			el instanceof SVGGeometryElement &&
			!(el instanceof SVGTextContentElement) &&
			style.stroke !== 'none' &&
			style.strokeDasharray === 'none' &&
			(style.fill === 'none' || el instanceof SVGLineElement);
		if (draws) {
			const length = (el as SVGGeometryElement).getTotalLength();
			el.animate(
				[
					{ strokeDasharray: `${length} ${length}`, strokeDashoffset: length },
					{ strokeDasharray: `${length} ${length}`, strokeDashoffset: 0 }
				],
				options(el)
			);
		} else {
			el.animate([{ opacity: 0, offset: 0 }], options(el));
		}
	}
	for (const el of root.querySelectorAll('[data-enter="grow"]')) {
		el.animate([{ transform: 'scaleX(0)', transformOrigin: 'left', offset: 0 }], options(el));
	}
	for (const el of root.querySelectorAll('[data-enter="fade"]')) {
		el.animate([{ opacity: 0, offset: 0 }], options(el));
	}
}

/**
 * Animates a figure in the first time it comes into view: SVG lines draw themselves, SVG shapes
 * and text fade in, and HTML children marked `data-enter="grow"` (bars) or `data-enter="fade"`
 * follow, sweeping from the top left. A figure on screen when it mounts animates at once; one
 * further down waits, hidden, until it's scrolled into view. Nothing moves under reduced motion,
 * and without JavaScript the prerendered figure simply shows.
 */
export function entrance(): Attachment<HTMLElement | SVGElement> {
	return (element) => {
		const ms = duration(element);
		if (!ms || typeof IntersectionObserver === 'undefined') return;

		// Hidden until it enters (global.css), so it isn't seen whole and then redrawn.
		element.dataset.entering = '';
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((e) => e.isIntersecting)) return;
				observer.disconnect();
				delete element.dataset.entering;
				play(element, ms);
			},
			{ threshold: 0.15 }
		);
		observer.observe(element);
		return () => {
			observer.disconnect();
			delete element.dataset.entering;
		};
	};
}
