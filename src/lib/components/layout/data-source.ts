/** Where a widget's data comes from, shown by DataSourceBadge. */
export type DataSource =
	| { kind: 'recorded'; model?: string }
	| { kind: 'live'; model: string }
	| { kind: 'computed' }
	| { kind: 'sample' };

export function describeSource(source: DataSource): string {
	switch (source.kind) {
		case 'recorded':
			return source.model ? `Recorded · ${source.model}` : 'Recorded';
		case 'live':
			return `Live · ${source.model}`;
		case 'computed':
			return 'Computed in your browser';
		case 'sample':
			return 'Made-up example';
	}
}
