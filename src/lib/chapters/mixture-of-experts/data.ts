/** Mixture-of-experts models for `mixture-of-experts`: total size vs. the part each token actually uses. */
export interface MoeModel {
	name: string;
	year: number;
	totalParameters: number;
	activeParameters: number;
	cite: string;
}

export const MOE_MODELS: MoeModel[] = [
	{
		name: 'Mixtral 8x7B',
		year: 2024,
		totalParameters: 47e9,
		activeParameters: 13e9,
		cite: 'jiang2024'
	},
	{
		name: 'DeepSeek-V3',
		year: 2024,
		totalParameters: 671e9,
		activeParameters: 37e9,
		cite: 'deepseek2024'
	}
];

/** Mixtral 8x7B's blocks, each with 8 experts of which a token uses 2 (jiang2024, Table 1). */
export const MIXTRAL = { blocks: 32, experts: 8, perToken: 2 } as const;
