import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface HeaderRule {
	source: string;
	headers: { key: string; value: string }[];
}

const firebase = JSON.parse(readFileSync('firebase.json', 'utf8')) as {
	hosting: { public: string; cleanUrls: boolean; headers: HeaderRule[] };
};
const rc = JSON.parse(readFileSync('.firebaserc', 'utf8')) as { projects: { default: string } };

function header(rule: HeaderRule | undefined, key: string) {
	return rule?.headers.find((h) => h.key === key)?.value;
}

describe('firebase hosting config', () => {
	const { hosting } = firebase;

	it('deploys the adapter-static output with clean URLs', () => {
		expect(hosting.public).toBe('build');
		expect(hosting.cleanUrls).toBe(true);
		expect(rc.projects.default).toBeTruthy();
	});

	it('caches hashed assets forever, after the short default so it takes precedence', () => {
		const all = hosting.headers.findIndex((r) => r.source === '**');
		const immutable = hosting.headers.findIndex((r) => r.source === '/_app/immutable/**');
		expect(all).toBeGreaterThanOrEqual(0);
		expect(immutable).toBeGreaterThan(all);
		expect(header(hosting.headers[immutable], 'Cache-Control')).toContain('immutable');
		expect(header(hosting.headers[all], 'Cache-Control')).toMatch(/max-age=\d{1,4},/);
	});

	it('forbids framing the site', () => {
		const all = hosting.headers.find((r) => r.source === '**');
		expect(header(all, 'Content-Security-Policy')).toContain("frame-ancestors 'none'");
	});
});
