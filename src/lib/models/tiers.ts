import { CANONICAL_LIVE, MINILM, type DownloadableModel } from './downloads.ts';
import { RUNTIME_MB } from './onnx-runtime.ts';

/** A kind of task a widget can run live; a tier covers some of them, each with one model. */
export type Capability = 'next-token' | 'embed';

export type TierId = 'recorded' | 'small';

export interface Tier {
	id: TierId;
	name: string;
	/** What choosing it does, in one line. */
	summary: string;
	covers: Partial<Record<Capability, DownloadableModel>>;
}

/** The choices on the Models page, in order; Recorded is the default. See docs/spec/model-tiers.md. */
export const TIERS: readonly Tier[] = [
	{
		id: 'recorded',
		name: 'Recorded',
		summary: 'Widgets replay real runs recorded ahead of time. Nothing downloads.',
		covers: {}
	},
	{
		id: 'small',
		name: 'Small',
		summary: `${CANONICAL_LIVE.label} for next-token widgets and ${MINILM.label} for meaning maps, in any browser.`,
		covers: { 'next-token': CANONICAL_LIVE, embed: MINILM }
	}
];

export function tier(id: TierId): Tier {
	return TIERS.find((t) => t.id === id)!;
}

/** The models a tier downloads, each once. */
export function tierModels(t: Tier): DownloadableModel[] {
	return [...new Set(Object.values(t.covers))];
}

/** A tier's whole download in MB, with the runtime once. */
export function tierMB(t: Tier): number {
	const models = tierModels(t);
	return models.length ? models.reduce((a, m) => a + m.modelMB, RUNTIME_MB) : 0;
}

/** A saved choice is visitor-controlled storage: anything unknown is Recorded. */
export function parseTier(raw: string | null | undefined): TierId {
	return TIERS.some((t) => t.id === raw) ? (raw as TierId) : 'recorded';
}
