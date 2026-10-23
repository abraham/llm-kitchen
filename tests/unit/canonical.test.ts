import { describe, expect, it } from 'vitest';
import canonical from '../../models/canonical.json';

// Published GPT-2 small facts. The paper (Radford et al. 2019, Table 2) lists the smallest model
// as 117M parameters, 12 layers, d_model 768; the released checkpoint has 124,439,808 parameters
// with tied input/output embeddings. Milestone 5's build-traces script re-checks these against
// the model's own config.
describe('models/canonical.json', () => {
	it('has every field the site reads', () => {
		for (const key of [
			'id',
			'displayName',
			'huggingFaceId',
			'onnxId',
			'onnxFile',
			'onnxMB',
			'tokenizer',
			'parameters',
			'layers',
			'heads',
			'embeddingSize',
			'mlpSize',
			'vocabularySize',
			'contextLength'
		]) {
			expect(canonical).toHaveProperty(key);
		}
	});

	it('matches GPT-2 small', () => {
		expect(canonical).toMatchObject({
			layers: 12,
			heads: 12,
			embeddingSize: 768,
			mlpSize: 3072,
			vocabularySize: 50257,
			contextLength: 1024
		});
	});

	it('has a parameter count consistent with the architecture', () => {
		const { layers: L, embeddingSize: d, vocabularySize: V, contextLength: n } = canonical;
		const embeddings = V * d + n * d;
		const perBlock =
			2 * (2 * d) + (d * 3 * d + 3 * d) + (d * d + d) + (d * 4 * d + 4 * d) + (4 * d * d + d);
		const finalNorm = 2 * d;
		expect(embeddings + L * perBlock + finalNorm).toBe(canonical.parameters);
	});
});
