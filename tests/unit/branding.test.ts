import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	layoutTitle,
	ogPages,
	renderPage,
	renderTouchIcon,
	unpackFonts
} from '../../scripts/build-og.ts';
import { CURRICULUM } from '../../src/lib/curriculum/index.ts';
import {
	absoluteUrl,
	MENU_IMAGE,
	ogImagePath,
	SITE_DESCRIPTION,
	SITE_ORIGIN
} from '../../src/lib/site.ts';

/** Width and height from a PNG's IHDR chunk. */
function pngSize(png: Buffer) {
	expect(png.subarray(1, 4).toString()).toBe('PNG');
	return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** The RGB at (x, y), decoded by drawing the PNG into an SVG of the same size. */
function pixel(png: Buffer, x: number, y: number) {
	const { width, height } = pngSize(png);
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><image width="${width}" height="${height}" href="data:image/png;base64,${png.toString('base64')}"/></svg>`;
	const rgba = new Resvg(svg).render().pixels;
	const i = (Math.round(y) * width + Math.round(x)) * 4;
	return [rgba[i], rgba[i + 1], rgba[i + 2]];
}

/** Where the mark's pink, white, and green dumplings are, for a mark drawn at (x, y) and `size` px. */
function dumplings(x: number, y: number, size: number) {
	// Centers in the favicon's 960-unit viewBox, measured from its top-left corner.
	return [290, 480, 670].map((c) => [x + (c * size) / 960, y + (c * size) / 960] as const);
}

const DANGO = [
	[219, 39, 119],
	[255, 255, 255],
	[13, 148, 136]
];

describe('descriptions', () => {
	it('every curriculum entry has a description that fits a search result', () => {
		for (const { slug, description } of [
			...CURRICULUM,
			{ slug: 'menu', description: SITE_DESCRIPTION }
		]) {
			expect(description.length, slug).toBeGreaterThanOrEqual(80);
			expect(description.length, slug).toBeLessThanOrEqual(160);
			expect(description, slug).toMatch(/\.$/);
			expect(description, slug).not.toContain('llm-kitchen');
		}
	});

	it('no two chapters share a description', () => {
		const all = CURRICULUM.map((c) => c.description);
		expect(new Set(all).size).toBe(all.length);
	});
});

describe('social images', () => {
	let dir: string;
	let fonts: string[];

	beforeAll(async () => {
		dir = mkdtempSync(join(tmpdir(), 'og-test-'));
		fonts = await unpackFonts(dir);
	});

	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	it('there is one for the menu and one for every curriculum entry', () => {
		expect(ogPages().map((p) => p.name)).toEqual([MENU_IMAGE, ...CURRICULUM.map((c) => c.slug)]);
	});

	it('every chapter title fits on its image', () => {
		for (const chapter of CURRICULUM) {
			const { lines } = layoutTitle(chapter.title, fonts);
			expect(lines.join(' ')).toBe(chapter.title);
		}
	});

	it('renders 1200 × 630 PNGs and a 180 px touch icon', () => {
		for (const page of ogPages().slice(0, 2)) {
			expect(pngSize(renderPage(page, fonts))).toEqual({ width: 1200, height: 630 });
		}
		expect(pngSize(renderTouchIcon())).toEqual({ width: 180, height: 180 });
	});

	it('shows the hanami dango mark on the touch icon, the menu image, and chapter images', () => {
		const images: [Buffer, ReturnType<typeof dumplings>][] = [
			[renderTouchIcon(), dumplings(24, 24, 132)],
			[renderPage(ogPages()[0], fonts), dumplings(1200 / 2 - 90, 70, 180)],
			[renderPage(ogPages()[1], fonts), dumplings(80, 56, 64)]
		];
		for (const [png, centers] of images) {
			centers.forEach(([x, y], i) => {
				pixel(png, x, y).forEach((v, k) => expect(v).toBeCloseTo(DANGO[i][k], -1));
			});
		}
	});
});

describe('site origin', () => {
	it('builds absolute URLs from one https origin', () => {
		expect(SITE_ORIGIN).toMatch(/^https:\/\/[^/]+$/);
		expect(absoluteUrl(ogImagePath('tokens'))).toBe(`${SITE_ORIGIN}/og/tokens.png`);
	});
});
