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

	it('keeps browsers on HTTPS for two years, without the preload list', () => {
		const all = hosting.headers.find((r) => r.source === '**');
		expect(header(all, 'Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
	});

	it('gives workers a full policy, after the page default so it takes precedence', () => {
		const all = hosting.headers.findIndex((r) => r.source === '**');
		const workers = hosting.headers.findIndex((r) => r.source === '/_app/immutable/workers/**');
		expect(workers).toBeGreaterThan(all);
		const csp = header(hosting.headers[workers], 'Content-Security-Policy')!;
		for (const directive of [
			"default-src 'self'",
			"script-src 'self' 'wasm-unsafe-eval'",
			"object-src 'none'"
		]) {
			expect(csp).toContain(directive);
		}
		const page = header(hosting.headers[all], 'Content-Security-Policy')!;
		const downloads = (policy: string) => policy.match(/connect-src ([^;]+)/)![1];
		expect(downloads(csp)).toBe(downloads(page));
	});
});
