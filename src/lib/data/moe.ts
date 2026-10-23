/** Mixture-of-experts models for Ch 23: total size vs. the part each token actually uses. */
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
