/**
 * Renders the social sharing images (static/og/NAME.png, 1200×630) and the apple-touch-icon from SVG
 * templates, using the site's own fonts and the favicon mark. Runs before `vite build`; no network.
 *
 *   node scripts/build-og.ts
 */
import { Resvg } from '@resvg/resvg-js';
import { decompress } from 'wawoff2';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRICULUM, label, partLabel, type Chapter } from '../src/lib/curriculum/index.ts';
import { MENU_IMAGE, OG_IMAGE_SIZE, SITE_NAME, SITE_TAGLINE } from '../src/lib/site.ts';

const { width: W, height: H } = OG_IMAGE_SIZE;
const MARGIN = 80;

// Light-theme values from src/styles/tokens.css.
const COLORS = {
	page: '#fbf8f3',
	ink: '#1f1b16',
	muted: '#5c5349',
	tokenInk: '#8a3c0b',
	concepts: ['#d97706', '#0d9488', '#7c3aed', '#db2777', '#2563eb', '#dc2626', '#64748b']
};

const SERIF = 'Source Serif 4';
const MONO = 'JetBrains Mono';
const FONT_FILES = [
	'@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2',
	'@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2'
];

const mark = readFileSync(new URL('../src/lib/assets/favicon.svg', import.meta.url));
// resvg skips @media rules, so the nested favicon keeps its light colors.
const markHref = `data:image/svg+xml;base64,${mark.toString('base64')}`;

export type OgPage = { name: string; chapter?: Chapter };

/** One image for the menu, then one per curriculum entry, named by slug. */
export function ogPages(): OgPage[] {
	return [{ name: MENU_IMAGE }, ...CURRICULUM.map((chapter) => ({ name: chapter.slug, chapter }))];
}

/** resvg reads TrueType but not WOFF2, so the fontsource files are unpacked into `dir`. */
export async function unpackFonts(dir: string): Promise<string[]> {
	const paths: string[] = [];
	// One at a time: concurrent wawoff2 calls share the WASM heap and corrupt each other's output.
	for (const [i, file] of FONT_FILES.entries()) {
		const woff2 = readFileSync(fileURLToPath(import.meta.resolve(file)));
		const path = join(dir, `font-${i}.ttf`);
		writeFileSync(path, Buffer.from(await decompress(woff2)));
		paths.push(path);
	}
	return paths;
}

function resvg(svg: string, fonts: string[]): Resvg {
	return new Resvg(svg, {
		font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: SERIF }
	});
}

function escape(text: string): string {
	return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function textWidth(text: string, size: number, fonts: string[]): number {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="${size * 2}"><text x="0" y="${size * 1.5}" font-family="${SERIF}" font-size="${size}">${escape(text)}</text></svg>`;
	return resvg(svg, fonts).getBBox()?.width ?? 0;
}

/** Greedy word wrap at the largest size that fits the title in the allowed lines. */
export function layoutTitle(title: string, fonts: string[]): { size: number; lines: string[] } {
	const maxWidth = W - 2 * MARGIN;
	for (const [size, maxLines] of [
		[76, 2],
		[64, 2],
		[56, 3]
	]) {
		const lines: string[] = [];
		for (const word of title.split(' ')) {
			const last = lines.at(-1);
			if (last !== undefined && textWidth(`${last} ${word}`, size, fonts) <= maxWidth) {
				lines[lines.length - 1] = `${last} ${word}`;
			} else {
				lines.push(word);
			}
		}
		const fits = lines.every((line) => textWidth(line, size, fonts) <= maxWidth);
		if (fits && lines.length <= maxLines) return { size, lines };
	}
	throw new Error(`Title too long for a social image: ${title}`);
}

function stripe(): string {
	const w = W / COLORS.concepts.length;
	return COLORS.concepts
		.map((fill, i) => `<rect x="${i * w}" y="${H - 14}" width="${w}" height="14" fill="${fill}"/>`)
		.join('');
}

function frame(body: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${COLORS.page}"/>
${body}
${stripe()}
</svg>`;
}

function menuSvg(): string {
	return frame(`
<image x="${W / 2 - 90}" y="70" width="180" height="180" href="${markHref}"/>
<text x="${W / 2}" y="${H - 220}" text-anchor="middle" font-family="${SERIF}" font-size="112" fill="${COLORS.ink}" stroke="${COLORS.ink}" stroke-width="2.4" stroke-linejoin="round">${escape(SITE_NAME)}</text>
<text x="${W / 2}" y="${H - 140}" text-anchor="middle" font-family="${SERIF}" font-size="40" fill="${COLORS.muted}">${escape(SITE_TAGLINE)}</text>`);
}

function chapterSvg(chapter: Chapter, fonts: string[]): string {
	const { size, lines } = layoutTitle(chapter.title, fonts);
	const lineHeight = Math.round(size * 1.12);
	const firstBaseline = 540 - (lines.length - 1) * lineHeight;
	const numberBaseline = firstBaseline - size - 12;
	const title = lines
		.map(
			(line, i) =>
				`<tspan x="${MARGIN}" y="${firstBaseline + i * lineHeight}">${escape(line)}</tspan>`
		)
		.join('');
	return frame(`
<image x="${MARGIN}" y="56" width="64" height="64" href="${markHref}"/>
<text x="${MARGIN + 84}" y="102" font-family="${SERIF}" font-size="40" fill="${COLORS.ink}" stroke="${COLORS.ink}" stroke-width="0.8" stroke-linejoin="round">${escape(SITE_NAME)}</text>
<text x="${MARGIN}" y="${numberBaseline - 60}" font-family="${MONO}" font-size="26" fill="${COLORS.muted}">${escape(partLabel(chapter.part, ' · '))}</text>
<text x="${MARGIN}" y="${numberBaseline}" font-family="${MONO}" font-size="38" fill="${COLORS.tokenInk}">${escape(`${label(chapter.slug)}.`)}</text>
<text font-family="${SERIF}" font-size="${size}" fill="${COLORS.ink}" stroke="${COLORS.ink}" stroke-width="${size / 40}" stroke-linejoin="round">${title}</text>`);
}

export function renderPage(page: OgPage, fonts: string[]): Buffer {
	const svg = page.chapter ? chapterSvg(page.chapter, fonts) : menuSvg();
	return resvg(svg, fonts).render().asPng();
}

/** 180 px, on the page color: iOS fills a transparent icon with black. */
export function renderTouchIcon(): Buffer {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
<rect width="180" height="180" fill="${COLORS.page}"/>
<image x="24" y="24" width="132" height="132" href="${markHref}"/>
</svg>`;
	return new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const out = fileURLToPath(new URL('../static/og/', import.meta.url));
	const tmp = mkdtempSync(join(tmpdir(), 'og-fonts-'));
	try {
		const fonts = await unpackFonts(tmp);
		rmSync(out, { recursive: true, force: true });
		mkdirSync(out, { recursive: true });
		for (const page of ogPages())
			writeFileSync(join(out, `${page.name}.png`), renderPage(page, fonts));
		writeFileSync(new URL('../static/apple-touch-icon.png', import.meta.url), renderTouchIcon());
		console.log(`Wrote ${ogPages().length} social images to static/og/ and the apple-touch-icon.`);
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
}
