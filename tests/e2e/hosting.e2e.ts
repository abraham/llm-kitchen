import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';

// These run against the Firebase Hosting emulator, so they check firebase.json as deployed.

test('serves chapters at clean URLs without a trailing slash', async ({ request }) => {
	for (const path of ['/attention.html', '/attention/']) {
		const response = await request.get(path, { maxRedirects: 0 });
		expect(response.status(), path).toBe(301);
		expect(response.headers().location, path).toBe('/attention');
	}
	expect((await request.get('/attention')).status()).toBe(200);
});

test('answers unknown paths with the 404 page', async ({ request }) => {
	const response = await request.get('/no-such-chapter');
	expect(response.status()).toBe(404);
	expect(await response.text()).toBe(readFileSync('build/404.html', 'utf8'));
});

test('sends the security headers on pages', async ({ request }) => {
	const headers = (await request.get('/')).headers();
	expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
	expect(headers['permissions-policy']).toContain('camera=()');
	expect(headers['cross-origin-opener-policy']).toBe('same-origin');
	expect(headers['cache-control']).toBe('public, max-age=300, must-revalidate');
});

test('gives the inference worker a full policy that allows model downloads, and caches it forever', async ({
	request
}) => {
	const file = readdirSync('build/_app/immutable/workers').find((f) =>
		f.startsWith('inference.worker-')
	);
	const headers = (await request.get(`/_app/immutable/workers/${file}`)).headers();
	const csp = headers['content-security-policy'];
	expect(csp).toContain("default-src 'self'");
	expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval' blob:;");
	expect(csp).toContain("object-src 'none'");
	expect(csp).toContain('https://huggingface.co');
	expect(headers['cache-control']).toBe('public, max-age=31536000, immutable');
});

test("leaves script-src to each page's own policy, which has its inline scripts' hashes", async ({
	request
}) => {
	const headers = (await request.get('/attention')).headers();
	expect(headers['content-security-policy']).not.toContain('script-src');
});

test('keeps recorded data on the short cache', async ({ request }) => {
	const response = await request.get('/data/traces/gpt2/attn-the-cat-sat.json');
	expect(response.status()).toBe(200);
	expect(response.headers()['cache-control']).toBe('public, max-age=300, must-revalidate');
});
