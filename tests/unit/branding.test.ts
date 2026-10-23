import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	layoutTitle,
	ogPages,
	renderPage,
	renderTouchIcon,
	unpackFonts
} from '../../scripts/build-og.ts';
import { CURRICULUM } from '../../src/lib/chapters/meta.ts';
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
});

describe('site origin', () => {
	it('builds absolute URLs from one https origin', () => {
		expect(SITE_ORIGIN).toMatch(/^https:\/\/[^/]+$/);
		expect(absoluteUrl(ogImagePath('tokens'))).toBe(`${SITE_ORIGIN}/og/tokens.png`);
	});
});
