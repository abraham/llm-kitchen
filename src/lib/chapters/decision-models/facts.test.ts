import { describe, expect, it } from 'vitest';
import { readDataset } from '#lib/datasets/read.ts';
import { move, moveScores, play } from '#lib/math/decision.ts';

describe('choosing actions', () => {
	const rec = readDataset('decisions/grid');
	const { world, training, net } = rec;
	const name = (cell: number) =>
		`${'ABCDE'[cell % world.size]}${world.size - Math.floor(cell / world.size)}`;
	const run = (target: number) => play(world, net, target);

	it('a 5 by 5 grid: start A1, goal E5, pits B4, D3 and B2, at most 16 moves', () => {
		expect(world.size).toBe(5);
		expect([name(world.start), name(world.goal)]).toEqual(['A1', 'E5']);
		expect(world.pits.map(name)).toEqual(['B4', 'D3', 'B2']);
		expect(world.horizon).toBe(16);
		expect(world.moves).toEqual(['up', 'right', 'down', 'left']);
	});

	it('each move costs 1, the goal pays 20, a pit costs 10 more and ends the run', () => {
		expect(world.rewards).toEqual({ step: -1, goal: 20, pit: -10 });
		expect(move(world, world.start, 0)).toMatchObject({ reward: -1, outcome: undefined });
		expect(move(world, 9, 0)).toMatchObject({ cell: world.goal, reward: 19, outcome: 'goal' });
		expect(move(world, 15, 1)).toMatchObject({ cell: 16, reward: -11, outcome: 'pit' });
		// Walking into the edge stays put and still costs a move.
		expect(move(world, world.start, 3)).toMatchObject({ cell: world.start, reward: -1 });
	});

	it('the best possible score is 12: eight moves, then 20 for the goal', () => {
		expect(Math.max(...Object.keys(training.returns).map(Number))).toBe(12);
		expect(run(12).steps).toHaveLength(8);
		expect(20 - 8).toBe(12);
	});

	it('4,000 training runs: 1,365 random, 2,635 scripted', () => {
		expect(training.runs).toBe(4000);
		expect(training.byPlayer).toEqual({ random: 1365, scripted: 2635 });
	});

	it('1,360 reached the goal, 2,272 fell into a pit, 368 ran out of moves', () => {
		expect(training.byOutcome).toEqual({ goal: 1360, pit: 2272, time: 368 });
	});

	it('only 413 runs, about one in ten, scored 12; none scored from −11 to 3', () => {
		expect(training.returns['12']).toBe(413);
		expect(training.returns['12'] / training.runs).toBeCloseTo(0.1, 1);
		for (let s = -11; s <= 3; s++) expect(training.returns[String(s)]).toBeUndefined();
		expect(Math.min(...Object.keys(training.returns).map(Number))).toBe(-26);
	});

	it('the browser runs the same network as the recording script', () => {
		for (const check of rec.checks) {
			const r = run(check.target);
			expect(
				r.steps.map((s) => s.action),
				`target ${check.target}`
			).toEqual(check.actions);
			expect(r.total).toBe(check.return);
			expect(r.end).toBe(check.end);
			const first = moveScores(net, [check.target], [world.start], []);
			first.forEach((s, i) => expect(s).toBeCloseTo(check.firstScores[i], 2));
		}
	});

	it('aim for 12: a shortest path to the goal, scoring 12', () => {
		const r = run(12);
		expect([r.outcome, r.total, r.steps.length]).toEqual(['goal', 12, 8]);
	});

	it('aim for 8: it reaches the goal in 12 moves, scoring exactly 8', () => {
		const r = run(8);
		expect([r.outcome, r.total, r.steps.length]).toEqual(['goal', 8, 12]);
	});

	it('every target from 4 to 12 is scored exactly, by reaching the goal', () => {
		for (let t = 4; t <= 12; t++) expect([run(t).outcome, run(t).total]).toEqual(['goal', t]);
	});

	it('aim for −14: it steps into a pit on its fourth move', () => {
		const r = run(-14);
		expect([r.outcome, r.total, r.steps.length]).toEqual(['pit', -14, 4]);
	});

	it('targets no run scored: −10 to −2 wander until the moves run out; −1 to 3 score 4', () => {
		for (let t = -10; t <= -2; t++) expect([run(t).outcome, run(t).total]).toEqual(['time', -16]);
		for (let t = -1; t <= 3; t++) expect([run(t).outcome, run(t).total]).toEqual(['goal', 4]);
	});

	it('impossible targets above 12 play the same eight moves as 12', () => {
		const best = run(12).steps.map((s) => s.action);
		for (const t of [13, 16, 20, 24]) expect(run(t).steps.map((s) => s.action)).toEqual(best);
	});

	it('in depth: aiming for 12, still to earn goes 12, 13, … 19, and the goal pays the last 19', () => {
		const r = run(12);
		expect(r.steps.map((s) => s.toGo)).toEqual([12, 13, 14, 15, 16, 17, 18, 19]);
		expect(r.steps.at(-1)!.reward).toBe(19);
	});

	it('in depth: 24 numbers per token, 2 blocks of 2 heads, about 16,000 weights', () => {
		expect([net.width, net.layers, net.heads]).toEqual([24, 2, 2]);
		const count = Object.values(net.weights)
			.flat()
			.reduce<number>((n, row) => n + (Array.isArray(row) ? row.length : 1), 0);
		expect(count).toBe(15772);
		expect(net.steps).toBe(4000);
	});

	it('in depth: 3 tokens per step, so a full 16-move run is 48 tokens', () => {
		expect(3 * world.horizon).toBe(48);
		expect(net.weights['step.weight']).toHaveLength(world.horizon);
	});
});
