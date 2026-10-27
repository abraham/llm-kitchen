import canonical from '../../../models/canonical.json';
import { type Check, array, integer, nullable, object, string } from './check.ts';
import {
	agentGrades,
	agentRun,
	contextSession,
	memoryRecording,
	searchQuestions
} from './parsers/agent.ts';
import { embeddingMap, embeddingVectors } from './parsers/embeddings.ts';
import { clip, clipImages, decisionRecording, fillMask } from './parsers/models.ts';
import {
	baseVsInstruct,
	fewShot,
	fewShotLabels,
	fragile,
	steps,
	systemPrompts,
	thinking,
	wordProblems,
	wording
} from './parsers/prompts.ts';
import {
	hallucinationSamples,
	injectionLab,
	kvCacheRun,
	quantizeRun,
	routingRecording,
	speculativeRecording
} from './parsers/runs.ts';
import { attentionScores, tokenVectors, trace } from './parsers/trace.ts';

export interface Dataset<T> {
	/** Path under `static/data/`. */
	file: string;
	parse: Check<T>;
	/** The `scripts/record` module that writes it. */
	script: string;
	version: number;
}

function dataset<T>(file: string, parse: Check<T>, script: string, version = 1): Dataset<T> {
	return { file, parse, script, version };
}

/** A dataset recorded from the canonical model, kept in a folder per model like the traces. */
const perModel = <T>(kind: string, name: string, parse: Check<T>, script: string) =>
	dataset(`${kind}/${canonical.id}/${name}.json`, parse, script);
const traceFile = (name: string) => perModel('traces', name, trace, 'traces');

/** Every recorded dataset the site reads. Files live at `static/data/<file>`. */
export const DATASETS = {
	'traces/the-cat-sat': traceFile('the-cat-sat'),
	'traces/the-cat-sat-bed': traceFile('the-cat-sat-bed'),
	'traces/the-cat-sat-couch': traceFile('the-cat-sat-couch'),
	'traces/the-cat-sat-edge': traceFile('the-cat-sat-edge'),
	'traces/the-cat-sat-ground': traceFile('the-cat-sat-ground'),
	'traces/the-cat-sat-t00': traceFile('the-cat-sat-t00'),
	'traces/the-cat-sat-t07': traceFile('the-cat-sat-t07'),
	'traces/the-cat-sat-t15': traceFile('the-cat-sat-t15'),
	'traces/attn-the-cat-sat': traceFile('attn-the-cat-sat'),
	'traces/attn-ioi': traceFile('attn-ioi'),
	'traces/attn-mary-lamb': traceFile('attn-mary-lamb'),
	'traces/attn-trophy-big': traceFile('attn-trophy-big'),
	'traces/attn-trophy-small': traceFile('attn-trophy-small'),
	'traces/quirk-france': traceFile('quirk-france'),
	'traces/quirk-france-qa': traceFile('quirk-france-qa'),
	'traces/quirk-iphone': traceFile('quirk-iphone'),
	'traces/quirk-loop': traceFile('quirk-loop'),
	'traces/penalty-0': traceFile('penalty-0'),
	'traces/penalty-05': traceFile('penalty-05'),
	'traces/penalty-5': traceFile('penalty-5'),
	'traces/quirk-nurse': traceFile('quirk-nurse'),
	'traces/quirk-engineer': traceFile('quirk-engineer'),
	'traces/quirk-math': traceFile('quirk-math'),
	'traces/quirk-moon': traceFile('quirk-moon'),
	'traces/quirk-painter': traceFile('quirk-painter'),
	'vectors/the-cat-sat': perModel('vectors', 'the-cat-sat', tokenVectors, 'traces'),
	'attention/ioi-scores': perModel('attention', 'ioi-scores', attentionScores, 'attention'),
	'embeddings/minilm-map': dataset('embeddings/minilm-map.json', embeddingMap, 'embeddings'),
	'embeddings/minilm-vectors': dataset(
		'embeddings/minilm-vectors.json',
		embeddingVectors,
		'embeddings'
	),
	'quantize/precisions': perModel('quantize', 'precisions', quantizeRun, 'quantize'),
	'speculative/drafts': perModel('speculative', 'drafts', speculativeRecording, 'speculative'),
	'chat/base-vs-instruct': dataset('chat/base-vs-instruct.json', baseVsInstruct, 'chat'),
	'reasoning/thinking': dataset('reasoning/thinking.json', thinking, 'reasoning'),
	'prompts/wording': dataset('prompts/wording.json', wording, 'prompts'),
	'prompts/fewshot': dataset('prompts/fewshot.json', fewShot, 'prompts'),
	'prompts/labels': dataset('prompts/labels.json', fewShotLabels, 'prompts'),
	'prompts/problems': dataset('prompts/problems.json', wordProblems, 'prompts'),
	'prompts/system': dataset('prompts/system.json', systemPrompts, 'prompts'),
	'prompts/steps': dataset('prompts/steps.json', steps, 'prompts'),
	'prompts/fragile': dataset('prompts/fragile.json', fragile, 'prompts'),
	'routing/cascade': dataset('routing/cascade.json', routingRecording, 'routing'),
	'hallucination/samples': dataset(
		'hallucination/samples.json',
		hallucinationSamples,
		'hallucination'
	),
	'agent/chat': dataset('agent/chat.json', agentRun, 'agent'),
	'agent/math-no-tools': dataset('agent/math-no-tools.json', agentRun, 'agent'),
	'agent/math-tools': dataset('agent/math-tools.json', agentRun, 'agent'),
	'agent/agent-cat': dataset('agent/agent-cat.json', agentRun, 'agent'),
	'agent/inject-none': dataset('agent/inject-none.json', agentRun, 'agent'),
	'agent/inject-ask': dataset('agent/inject-ask.json', agentRun, 'agent'),
	'agent/inject-allowlist': dataset('agent/inject-allowlist.json', agentRun, 'agent'),
	'agent/context': dataset('agent/context.json', contextSession, 'agent'),
	'agent/grades': dataset('agent/grades.json', agentGrades, 'grading'),
	'agent/search': dataset('agent/search.json', searchQuestions, 'search'),
	'agent/memory': dataset('agent/memory.json', memoryRecording, 'memory'),
	'caching/kv-cache': dataset('caching/kv-cache.json', kvCacheRun, 'caching'),
	'injection/lab': dataset('injection/lab.json', injectionLab, 'injection'),
	'encoders/fill-mask': dataset('encoders/fill-mask.json', fillMask, 'encoder'),
	'vision/clip': dataset('vision/clip.json', clip, 'clip'),
	'vision/clip-images': dataset('vision/clip-images.json', clipImages, 'clip'),
	'decisions/grid': dataset('decisions/grid.json', decisionRecording, 'decisions')
} as const;

export type DatasetId = keyof typeof DATASETS;
export type DataOf<I extends DatasetId> = (typeof DATASETS)[I] extends Dataset<infer T> ? T : never;

type After<T, P extends string> = T extends `${P}${infer N}` ? N : never;
/** Names of the recorded GPT-2 traces, as in `traces/<name>`. */
export type TraceName = After<DatasetId, 'traces/'>;
/** Names of the recorded agent runs, as in `agent/<name>` (the context session and grades are other shapes). */
export type AgentRunName = Exclude<
	After<DatasetId, 'agent/'>,
	'context' | 'grades' | 'search' | 'memory'
>;

const envelope = object({
	dataset: string,
	version: integer,
	script: string,
	models: array(object({ id: string, revision: nullable(string) })),
	generatedAt: nullable(string)
});

/** Check a dataset file's envelope against the registry, then parse its data. */
export function parseDataset<I extends DatasetId>(id: I, json: unknown): DataOf<I> {
	const entry = DATASETS[id] as Dataset<DataOf<I>>;
	const head = envelope(json, id);
	if (head.dataset !== id) throw new Error(`${id}: file says it is ${head.dataset}`);
	if (head.version !== entry.version) {
		throw new Error(`${id}: version ${head.version}, expected ${entry.version}`);
	}
	return entry.parse((json as { data: unknown }).data, `${id}.data`);
}
