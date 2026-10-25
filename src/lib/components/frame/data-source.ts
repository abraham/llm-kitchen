/** Where a widget's data comes from, shown by DataSourceBadge. */
export type DataSource =
	/** `note` says why a widget with a live option shows its recording instead. */
	| { kind: 'recorded'; model?: string; note?: string }
	| { kind: 'live'; model: string; tier?: string }
	| { kind: 'computed' }
	| { kind: 'sample' };

export function describeSource(source: DataSource): string {
	switch (source.kind) {
		case 'recorded':
			if (source.note) return `Recorded · ${source.note}`;
			return source.model ? `Recorded · ${source.model}` : 'Recorded';
		case 'live':
			return source.tier ? `Live · ${source.tier} · ${source.model}` : `Live · ${source.model}`;
		case 'computed':
			return 'Computed in your browser';
		case 'sample':
			return 'Made-up example';
	}
}
