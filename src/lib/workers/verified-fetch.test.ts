import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it, vi } from 'vitest';
import canonical from '../../../models/canonical.json';
import embedder from '../../../models/embedder.json';
import { verifiedFetch } from './verified-fetch.ts';

const content = utf8ToBytes('{"model_type":"gpt2"}');
const model = {
	onnxId: 'Xenova/gpt2',
	onnxRevision: 'abc123',
	onnxFiles: { 'config.json': bytesToHex(sha256(content)) }
};
const url = 'https://huggingface.co/Xenova/gpt2/resolve/abc123/config.json';
const serve = (body: Uint8Array | null, status = 200) =>
	vi.fn(async () => new Response(body as BodyInit | null, { status })) as unknown as typeof fetch;

describe('verifiedFetch', () => {
	it('passes a listed file whose hash matches', async () => {
		const response = await verifiedFetch([model], serve(content))(url);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(content);
	});

	it('errors the body when a listed file has been changed', async () => {
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
		const response = await verifiedFetch([model], serve(utf8ToBytes('{"model_type":"evil"}')))(url);
		await expect(response.arrayBuffer()).rejects.toThrow(/doesn't match its recorded SHA-256/);
		expect(logged).toHaveBeenCalledWith(expect.stringMatching(/config\.json doesn't match/));
		logged.mockRestore();
	});

	it('refuses a file no pinned model lists', async () => {
		const get = verifiedFetch([model], serve(content));
		await expect(
			get('https://huggingface.co/Xenova/gpt2/resolve/abc123/evil.onnx')
		).rejects.toThrow(/isn't a file of a pinned model/);
		await expect(
			get('https://huggingface.co/Xenova/other/resolve/main/config.json')
		).rejects.toThrow(/isn't a file of a pinned model/);
	});

	it('fetches a pinned model at its pinned commit whatever revision is asked for', async () => {
		const base = serve(content);
		const response = await verifiedFetch(
			[model],
			base
		)('https://huggingface.co/Xenova/gpt2/resolve/main/config.json');
		expect(base).toHaveBeenCalledWith(url, undefined);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(content);
	});

	it('passes range probes, misses, and other origins untouched', async () => {
		const get = verifiedFetch([model], serve(utf8ToBytes('x')));
		expect((await get(url, { headers: { Range: 'bytes=0-0' } })).status).toBe(200);
		expect((await verifiedFetch([model], serve(null, 404))(url)).status).toBe(404);
		expect((await get('https://example.com/a.json')).status).toBe(200);
	});

	it('has a 64-digit SHA-256 for every file each live model lists', () => {
		for (const m of [canonical, embedder]) {
			expect(Object.keys(m.onnxFiles).length).toBeGreaterThan(0);
			for (const hash of Object.values(m.onnxFiles)) expect(hash).toMatch(/^[0-9a-f]{64}$/);
		}
	});
});
