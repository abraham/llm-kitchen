import type { ToolCall } from './tools.ts';

/** One model call inside a recorded agent run (scripts/build-agent-traces.py). */
export interface AgentStep {
	/** The exact text the model was given. */
	prompt: string;
	promptTokens: number;
	/** What the model wrote, up to and including its first tool call. */
	output: string;
	/** Text before the tool call (or the whole answer when there is no call). */
	thought: string;
	call?: ToolCall;
	result?: string;
	/** The harness refused to run the call. */
	blocked?: boolean;
}

export interface ToolInfo {
	name: string;
	description: string;
}

/** A tool as a chat template lists it (OpenAI's function format, which Qwen's template reads). */
export interface ToolSchema {
	type: 'function';
	function: ToolInfo & { parameters: unknown };
}

/** A chat message as chat templates take it, with tool calls and tool results. */
export interface ChatTurn {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	/** The tool a `tool` message answers. */
	name?: string;
	tool_calls?: { type: 'function'; function: ToolCall }[];
}

const TOOL_CALL = /<tool_call>\s*(\{.*?\})\s*<\/tool_call>/s;

/**
 * The text before a reply's first tool call, and the call, as the recording harness
 * (scripts/record/agent.py) reads it. A call that isn't valid JSON counts as no call.
 */
export function parseToolCall(output: string): { thought: string; call?: ToolCall } {
	const match = TOOL_CALL.exec(output);
	if (!match) return { thought: output.trim() };
	try {
		const parsed = JSON.parse(match[1]) as { name?: unknown; arguments?: unknown };
		if (typeof parsed.name !== 'string') return { thought: output.trim() };
		const args =
			typeof parsed.arguments === 'object' && parsed.arguments !== null ? parsed.arguments : {};
		const call: ToolCall = {
			name: parsed.name,
			arguments: Object.fromEntries(
				Object.entries(args).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
			)
		};
		return { thought: output.slice(0, match.index).trim(), call };
	} catch {
		return { thought: output.trim() };
	}
}

export interface AgentRun {
	model: { id: string; displayName: string; revision: string | null };
	task: string;
	system: string;
	history: { role: 'user' | 'assistant'; content: string }[];
	tools: ToolInfo[];
	policy: 'none' | 'ask';
	maxSteps: number;
	steps: AgentStep[];
	/** The model answered without a tool call before the step limit. */
	finished: boolean;
	files: { before: string[]; after: string[] };
}

export interface ContextTurn {
	task: string;
	text: string;
	tokens: number;
	answer: string;
	similarity: number;
	vector: number[];
}

export interface ContextStrategy {
	kept: number[];
	retrieved?: number[];
	summary?: string;
	/** Size of the summary or retrieved text added to the prompt. */
	noteTokens?: number;
	tokens: number;
	answer: string;
}

/** The `managing-the-context` session: six agent tasks, then a question about the first one. */
export interface ContextSession {
	model: AgentRun['model'];
	budget: number;
	baseTokens: number;
	question: string;
	questionTokens: number;
	turns: ContextTurn[];
	questionVector: number[];
	strategies: Record<'all' | 'dropOldest' | 'summarize' | 'retrieve', ContextStrategy>;
}

export type PromptPartKind =
	'marker' | 'system' | 'tools' | 'history' | 'message' | 'call' | 'result' | 'assistant';

export interface PromptPart {
	kind: PromptPartKind;
	text: string;
}

const MARKER = /<\|im_start\|>(system|user|assistant)\n|<\|im_end\|>\n?/g;

/**
 * Split a recorded ChatML prompt into colored parts: chat markers, the system prompt, tool
 * definitions, earlier turns, the current message, tool calls, and tool results.
 */
export function segmentPrompt(text: string): PromptPart[] {
	type Block = { role: string; start: number; end: number };
	const parts: PromptPart[] = [];
	const blocks: Block[] = [];
	const markers: { index: number; text: string; role?: string }[] = [];
	for (const m of text.matchAll(MARKER)) markers.push({ index: m.index, text: m[0], role: m[1] });

	// Pair each start marker with the content up to the next marker.
	markers.forEach((m, i) => {
		const end = markers[i + 1]?.index ?? text.length;
		const start = m.index + m.text.length;
		if (m.role && end > start) blocks.push({ role: m.role, start, end });
	});
	const isResult = (b: Block) => text.slice(b.start, b.end).startsWith('<tool_response>');
	const current = blocks.findLastIndex((b) => b.role === 'user' && !isResult(b));

	let pos = 0;
	const push = (kind: PromptPartKind, s: string) => {
		if (s) parts.push({ kind, text: s });
	};
	for (const m of markers) {
		const block = blocks.find((b) => b.start === m.index + m.text.length);
		push('marker', text.slice(pos, m.index + m.text.length));
		pos = m.index + m.text.length;
		if (!block) continue;
		const content = text.slice(block.start, block.end);
		const index = blocks.indexOf(block);
		if (block.role === 'system') {
			const at = content.indexOf('\n\n# Tools\n\n');
			if (at < 0) push('system', content);
			else {
				push('system', content.slice(0, at));
				push('tools', content.slice(at));
			}
		} else if (isResult(block)) {
			push('result', content);
		} else if (block.role === 'assistant' && content.includes('<tool_call>')) {
			const at = content.indexOf('<tool_call>');
			push(index < current ? 'history' : 'assistant', content.slice(0, at));
			push('call', content.slice(at));
		} else if (index < current) {
			push('history', content);
		} else if (index === current) {
			push('message', content);
		} else {
			push('assistant', content);
		}
		pos = block.end;
	}
	push('marker', text.slice(pos));
	return parts;
}
