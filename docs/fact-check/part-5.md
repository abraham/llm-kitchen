# Fact-check: Part V (Ch 11–17)

Claim checklist for the per-chapter fact-check (see [the spec](../spec/sources.md)). Tests:
each chapter's `facts.test.ts`, `src/lib/math/quantize.test.ts`, `src/lib/math/chat-template.test.ts`,
`src/lib/math/transformer.test.ts`, `tests/unit/datasets.test.ts`, each chapter's `chapter.e2e.ts`.

Data: GPT-2 traces from `scripts/record/traces.py` (`the-cat-sat-*` branches, `quirk-*`); base vs.
instruct outputs from `scripts/record/chat.py` (`static/data/chat/base-vs-instruct.json`, greedy, pinned
revisions recorded in the file). Paper figures were checked against the PDFs' text. Ch 17:
`static/data/reasoning/thinking.json`, Qwen3-0.6B with thinking off and on, sampled with the model card's
recommended settings and a fixed seed, by `scripts/record/reasoning.py`; answers are graded on the
last `\boxed{}`, which the prompt asks for.

## Ch 11. Generating text

| Claim                                                                                                                                                          | Backing                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Greedy continuation of "The cat sat on the" is "floor, and the cat was still asleep."                                                                          | Test (recorded trace)                                                                         |
| Picking " bed" leads to the loop ", and the cat sat on the bed, and the cat…"                                                                                  | Test (`the-cat-sat-bed`)                                                                      |
| Greedy decoding tends to repeat; sampling mostly avoids it                                                                                                     | Cite `holtzman2020`                                                                           |
| Each token costs a full run through all 124 million weights                                                                                                    | Model architecture (no caching is shown); `canonical.json`                                    |
| The prompt goes through the model in one run; the reply takes one run per token                                                                                | Cite `pope2022`                                                                               |
| Anthropic charges every model five times as much per output token as per input token                                                                           | Cite `anthropic-pricing` (e.g. $5 vs $25 per million tokens)                                  |
| Claude 3.5 Haiku held candidate end words (rabbit, habit) before writing a couplet's second line; switching off "rabbit" gave a line ending "a powerful habit" | Cite `lindsey2025biology` (§4, Planning in Poems)                                             |
| `<\|endoftext\|>` is token 50,256 and GPT-2's end token                                                                                                        | Cite `gpt2-config` (`eos_token_id: 50256`); test (tokenizer)                                  |
| The Small tier is about 419 MB with the runtime                                                                                                                | `tierMB` (`tiers.test.ts`): the four configs' `onnxMB` (128 + 24 + 112 + 128) + 27 MB runtime |
| The live 8-bit copy's percentages differ from the recorded ones                                                                                                | Checked: " floor" 15.4% (8-bit) vs. 7.6% (full precision)                                     |
| Simple: restates Standard in plainer words, with no new claims                                                                                                 | Reviewed against the Standard text                                                            |
| In depth: greedy takes the arg max; sampling draws from the tempered probabilities                                                                             | Implementations (`sampling.ts`); Ch 2                                                         |
| In depth: " edge" 4.8%, then " of" 96%: " edge of" about 4.6%, over twice " floor," (2%)                                                                       | Test (recorded traces)                                                                        |
| In depth: beam search finds likelier texts, but the likeliest are often dull and repetitive                                                                    | Cite `holtzman2020`                                                                           |
| In depth: about 2 operations per weight per token: about 250 million per token, 124 billion for 500                                                            | Cite `kaplan2020` (§2.1, C_forward ≈ 2N); test                                                |
| In depth: real systems keep earlier tokens' keys and values and run only the newest token                                                                      | Cite `pope2022`                                                                               |

## Ch 12. Scale

| Claim                                                                                                                                                                                     | Backing                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| GPT-3: 175 billion weights, 300 billion training tokens, 3.14 × 10²³ FLOPs                                                                                                                | Cite `brown2020` (§2, Table D.1)                                      |
| GPT-3 is more than 1,000 times GPT-2 small                                                                                                                                                | Test (1,406×)                                                         |
| Llama 3 405B: 15.6T tokens, 3.8 × 10²⁵ FLOPs; about 39 tokens per weight                                                                                                                  | Cite `grattafiori2024` (§1, §3.2); test                               |
| Chinchilla 70B on 1.4T tokens, same compute as Gopher (280B, 300B tokens), and better                                                                                                     | Cite `hoffmann2022` (abstract, Table 1; 5.76 × 10²³ FLOPs)            |
| Chinchilla is about 20 tokens per weight                                                                                                                                                  | Test                                                                  |
| GPT-2 small read about 8 million web pages, about 40 GB                                                                                                                                   | Cite `radford2019` §2.1                                               |
| The site's toy models: word-pair counts, 3,790 weights, 192,000 training characters                                                                                                       | Test (computed from the same code as the widgets)                     |
| Tiny model compute ≈ 6 × weights × tokens                                                                                                                                                 | The standard estimate (Kaplan et al. 2020 §2.1, C ≈ 6NE)              |
| Loss falls smoothly with size, data, and compute                                                                                                                                          | Cite `kaplan2020`                                                     |
| L(N) = (8.8 × 10¹³ / N)^0.076, N = non-embedding weights, fit on 768 to 1.5 billion                                                                                                       | Cite `kaplan2020` eq. 1.1, §3; test (`kaplanLoss`)                    |
| GPT-2 sizes' non-embedding counts; released totals 124M/355M/774M/1.56B                                                                                                                   | Test (`GPT2_FAMILY` totals equal the released checkpoints)            |
| e^(−loss) is the average (geometric mean) probability of the right token                                                                                                                  | Definition of cross-entropy                                           |
| Bigger models were much better at learning a task from a few examples in the prompt                                                                                                       | Cite `brown2020`                                                      |
| Training cost of the most compute-heavy models grew about 2.4× a year since 2016; GPT-4 and Gemini: chips and staff each tens of millions of dollars; over $1B by 2027 if the trend holds | Cite `cottier2024` (abstract)                                         |
| In 2024 a GPT-2-small-sized model was trained from scratch in about 90 minutes on one 8-GPU machine for about $20, slightly beating the original on a common-sense test                   | Cite `llmc-gpt2-124m` (8× A100 at ~$14/hour; HellaSwag 29.9 vs. 29.4) |
| The 1.5B GPT-2 took 24 hours and $672; in 2019 it was a project for a whole team                                                                                                          | Cite `llmc-gpt2-1558m` ("an involved project from an entire team")    |
| Simple: restates Standard in plainer words, with no new claims                                                                                                                            | Reviewed against the Standard text                                    |
| In depth: training compute is about 6ND (2 forward, 4 backward per weight per token)                                                                                                      | Cite `kaplan2020` (§2.1)                                              |
| In depth: 6 × 175B × 300B ≈ 3.15 × 10²³, next to the reported 3.14 × 10²³                                                                                                                 | Test; cite `brown2020`                                                |
| In depth: the $20 run read about 10 billion tokens: 6 × 124M × 10¹⁰ ≈ 7.5 × 10¹⁸, about 5 million times fewer than Llama 3                                                                | Cite `llmc-gpt2-124m` (one epoch of FineWeb 10B); test                |
| In depth: ten times the weights multiplies the loss by about 0.84 (16% lower)                                                                                                             | Test (10^−0.076)                                                      |
| In depth: Chinchilla fit L = E + A/N^α + B/D^β with E 1.69, A 406.4, B 410.7, α 0.34, β 0.28                                                                                              | Cite `hoffmann2022` (§3.3, eq. 10)                                    |
| In depth: the fit predicts 1.94 for Chinchilla and 1.99 for Gopher; optimal is about 20 tokens per weight                                                                                 | Test; cite `hoffmann2022`                                             |

## Ch 13. Fewer bits per number

Data: `static/data/quantize/gpt2/precisions.json` from `scripts/record/quantize.py` (GPT-2 small, pinned revision in
the file): every weight matrix rounded to nearest in blocks of 32 with one 16-bit scale per block,
then the top guesses for "The cat sat on the", a 12-token greedy continuation, and the loss on a
short public-domain passage (Lewis Carroll).

| Claim                                                                                                      | Backing                                                                             |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| GPT-2 small has 124,439,808 weights, published as 32-bit floats (about 498 MB)                             | `canonical.json`; cite `gpt2-model-card` (tensor type F32); test                    |
| Memory ≈ weights × bits ÷ 8: 249 MB at 16 bits; Llama 3 405B ≈ 810 GB at 16 bits, ≈ 203 GB at 4            | Arithmetic; test (`weightBytes`)                                                    |
| 32-bit floats keep about 7 significant digits, 16-bit about 3                                              | IEEE 754 (24- and 11-bit significands)                                              |
| 8 bits allow 256 values, 4 bits 16, 2 bits 4                                                               | 2ⁿ; test (`levels`)                                                                 |
| GGUF's Q4_0 and Q8_0 round blocks of 32 weights to whole numbers times one scale                           | Cite `gguf-quant-types`                                                             |
| At 16 and 8 bits: same top guess (" floor"), same 12 tokens, loss 3.31 → 3.31 / 3.34                       | Test (recorded data)                                                                |
| At 6 and 5 bits the top guess becomes " bed", then " table"                                                | Test                                                                                |
| At 4 bits and below the output falls apart ("The stack." repeated) and the loss shoots up (6.4, 18, 48)    | Test                                                                                |
| The live GPT-2 runs 8-bit weights, a 128 MB download, and its percentages differ (" floor" 15.4% vs. 7.6%) | `inference.worker.ts` (`dtype: 'q8'`); `canonical.json` `onnxMB`; Ch 11 check above |
| Treating a few large outlier numbers separately lets 8-bit match 16-bit up to 175B weights                 | Cite `dettmers2022` (abstract)                                                      |
| Quantization-aware training simulates the rounding during training                                         | Cite `jacob2018`                                                                    |
| Gemma 4's QAT versions have quality similar to the 16-bit (bfloat16) models                                | Cite `gemma4-qat` (accessed 2026-10-23)                                             |
| Simple: restates Standard in plainer words, with no new claims                                             | Reviewed against the Standard text                                                  |
| In depth: scale s = m / (2^(n−1) − 1), stored q = round(w / s), used ŝq; error at most s/2                 | Implementation (`levels`, `record/quantize.py`); test                               |
| In depth: in the widget's block, m = 0.689: a 4-bit step of about 0.098, weights under 0.049 become 0      | Test (recorded data)                                                                |
| In depth: the 16-bit scale per 32 weights makes 4-bit about 4.5 bits per weight: 70 MB, not 62             | Test (recorded sizes); cite `gguf-quant-types` (Q4_0)                               |
| In depth: QAT uses rounded weights going forward and updates the full-precision ones                       | Cite `jacob2018`                                                                    |
| In depth: the outlier method keeps a few large feature dimensions in 16 bits and the rest in 8             | Cite `dettmers2022`                                                                 |

## Ch 14. Guessing ahead

Data: `static/data/speculative/gpt2/drafts.json` from `scripts/record/speculative.py`: GPT-2 small (124,439,808
weights) guesses 4 tokens per round for GPT-2 medium (354,823,168), greedy, 30 new tokens per prompt.
The script asserts the result equals GPT-2 medium's own greedy output.

| Claim                                                                                                                                      | Backing                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Big-model inference is limited by reading weights from memory, not arithmetic                                                              | Cite `leviathan2023` (§1)                                                    |
| One transformer pass predicts the next token after every position                                                                          | Architecture (causal attention, Ch 9); the script relies on it               |
| 30 tokens in 7 passes ("The cat sat on the" and the counting prompt), 9 for "The capital of France is", with two passes keeping no guesses | Test (recorded data)                                                         |
| The output is exactly the big model's greedy text                                                                                          | Assertion in the script; test                                                |
| With sampling, an accept-or-resample rule keeps the big model's probabilities exactly                                                      | Cite `leviathan2023`, `chen2023`                                             |
| About 2–3× faster with identical output                                                                                                    | Cite `leviathan2023` (2–3× on T5-XXL), `chen2023` (2–2.5× on Chinchilla 70B) |
| Gemma 4 `-assistant` drafters: 78M to 0.5B weights, up to 3× faster, multi-token prediction                                                | Cite `gemma4-assistant`; collection listing (accessed 2026-10-23)            |
| Simple: restates Standard in plainer words, with no new claims                                                                             | Reviewed against the Standard text                                           |
| In depth: keep a guess with chance min(1, p/q); otherwise draw from max(0, p − q), rescaled; the result is exactly p                       | Cite `leviathan2023`, `chen2023`; test                                       |
| In depth: with acceptance α and k guesses, a pass adds (1 − α^(k+1)) / (1 − α) tokens on average                                           | Cite `leviathan2023` (eq. 1); test (3.4 at α 0.8, k 4)                       |
| In depth: the cat run averaged about 4.3 tokens per pass                                                                                   | Test (30 / 7)                                                                |

## Ch 15. From predictor to assistant

| Claim                                                                                                  | Backing                                                                                        |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| The ChatML template text, including Qwen's default system prompt                                       | Test: `chatTemplate` equals `apply_chat_template` output from the real tokenizer               |
| Qwen2.5 is a 2024 model family with base and instruct versions                                         | Cite `qwen2024`                                                                                |
| Base Qwen answers "boil an egg" with a question and a multiple-choice quiz                             | Recorded output; test                                                                          |
| Instruct without the template keeps going (Python code; a stray template line)                         | Recorded output; test                                                                          |
| Instruct in its chat format answers and stops                                                          | Recorded output (`stopped: true`); test                                                        |
| Tuning: example answers, then preference comparisons and a reward model                                | Cite `ouyang2022` (Fig. 2)                                                                     |
| People preferred 1.3B InstructGPT over 175B GPT-3                                                      | Cite `ouyang2022` (abstract)                                                                   |
| Qwen2.5's tuning used over a million examples, then multistage reinforcement learning                  | Cite `qwen2024` (abstract)                                                                     |
| Stage 1 example output                                                                                 | Real Qwen2.5-0.5B output (recorded); stage 2–3 examples are illustrations (widget is "sample") |
| Fine-tuning adapts a pretrained model to a task with more training                                     | Cite `hu2022` (abstract)                                                                       |
| LoRA freezes the weights and trains two low-rank tables whose product is added, in some layers         | Cite `hu2022` (§4; applied to attention weights)                                               |
| GPT-2 small's query table is 768 × 768 (589,824); rank-8 tables hold 12,288, about 2%                  | Test; `canonical.json` (embedding size)                                                        |
| On GPT-3, LoRA trained 10,000× fewer numbers, used a third of the memory, and matched full fine-tuning | Cite `hu2022` (abstract)                                                                       |
| Distillation trains a student on the teacher's probabilities, which show near-miss answers             | Cite `hinton2015` (soft targets)                                                               |
| Simple: restates Standard in plainer words, with no new claims                                         | Reviewed against the Standard text                                                             |
| In depth: the reward model loss is −log σ(r(x, y_w) − r(x, y_l))                                       | Cite `ouyang2022` (eq. 1); test                                                                |
| In depth: the third stage maximizes r − β log(π / π_SFT), which keeps the model near the tuned one     | Cite `ouyang2022` (eq. 2)                                                                      |
| In depth: LoRA W' = W + (α / r) BA; only A and B train; B starts at zero                               | Cite `hu2022` (§4.1); test                                                                     |
| In depth: distillation softens with T and scales the loss by T²                                        | Cite `hinton2015`                                                                              |

## Ch 16. Quirks and limits

| Claim                                                                                                                                                                                                                   | Backing                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| GPT-2: first person on the moon was "a man named John, who was born in 1829."                                                                                                                                           | Test (recorded)                                        |
| Hallucination is the term for fluent, made-up text                                                                                                                                                                      | Cite `ji2023`                                          |
| InstructGPT made up information about half as often as GPT-3 (21% vs. 41%)                                                                                                                                              | Cite `ouyang2022` (§1)                                 |
| WebText excludes links created after Dec 2017                                                                                                                                                                           | Cite `radford2019` §2.1                                |
| Top guesses for the latest iPhone: 6, 5, 7                                                                                                                                                                              | Test (recorded)                                        |
| Hundreds of verbatim passages extracted from GPT-2, including names, phone numbers, and emails posted online, chat logs, and code; some in one document; larger models memorized more                                   | Cite `carlini2021` (abstract)                          |
| After "The nurse said that", GPT-2 gives " she" 14.9% and " he" 2.9% (about 5×); after "The engineer said that", " he" 6.9% and " she" 0.8% (over 8×)                                                                   | Test (recorded traces `quirk-nurse`, `quirk-engineer`) |
| Eight value-aligned models that look unbiased on standard benchmarks showed 21 stereotypes (race, gender, religion, health) when tested indirectly, and the associations predicted their choices between two candidates | Cite `bai2024` (abstract)                              |
| " strawberry" is one GPT-2 token; "strawberry" is three                                                                                                                                                                 | e2e (live tokenizer) and Ch 4 tests                    |
| After "2 + 2 =", " 3" is more likely than " 4"                                                                                                                                                                          | Test (recorded: 10.2% vs. 5.5%)                        |
| "The capital of France is" rambles; the Q/A version says Paris                                                                                                                                                          | Test (recorded)                                        |
| Formatting alone changed accuracy by up to 76 points                                                                                                                                                                    | Cite `sclar2024` (abstract, LLaMA-2-13B)               |
| GPT-2's context window is 1,024 tokens; the live generator keeps only the last 1,024                                                                                                                                    | `canonical.json`; implementation                       |
| Simple: restates Standard in plainer words, with no new claims                                                                                                                                                          | Reviewed against the Standard text                     |
| In depth: the loss rewards likely continuations, true or not                                                                                                                                                            | Follows from the cross-entropy objective (Ch 7)        |
| In depth: intrinsic hallucinations contradict the given text; extrinsic ones can't be checked against it                                                                                                                | Cite `ji2023`                                          |
| In depth: GPT-2 splits " 2023" as " 20" + "23" and " 1234567" as " 123" + "45" + "67"                                                                                                                                   | Test (browser tokenizer)                               |
| In depth: GPT-4's tokenizer cuts numbers into groups of up to three from the left                                                                                                                                       | Test (browser tokenizer: 202 + 3; 123 + 456 + 7)       |

## Ch 17. Thinking before answering

| Claim                                                                                                               | Backing                                              |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Asking large models for step-by-step working improved math word problems                                            | Cite `wei2022`                                       |
| Qwen3's thinking can be switched off                                                                                | Cite `qwen3`; model card                             |
| Strawberry: 2 with thinking off, 3 with thinking on, after spelling it out                                          | Test (recorded data)                                 |
| About 24 times as many tokens with thinking on; 4 of 6 right both ways                                              | Test                                                 |
| Twice the thinking hit the 6,000-token limit without answering                                                      | Test                                                 |
| DeepSeek trained with rewards for checkable answers; answers grew longer; AIME 15.6% → 71.0%                        | Cite `deepseek2025` (§2.2)                           |
| Qwen3's thinking settings allow 32,768 output tokens and warn against greedy decoding                               | Cite `qwen3-model-card`                              |
| DeepSeek tuned Qwen and Llama models on 800,000 examples made with R1 (`R1-Distill`)                                | Cite `deepseek2025` §2.4                             |
| For Qwen-32B, distillation beat training with rewards directly                                                      | Cite `deepseek2025` §4.1 (Table 6)                   |
| Qwen3-0.6B was distilled from larger Qwen3 models' probabilities                                                    | Cite `qwen3` §4.5 (logits of Qwen3-32B or 235B-A22B) |
| Simple: restates Standard in plainer words, with no new claims                                                      | Reviewed against the Standard text                   |
| In depth: GRPO samples a group of answers, rewards right answers and the expected format, and uses (r − mean) / std | Cite `deepseek2025` (§2.2.1–2.2.2)                   |
| In depth: the update is limited per step and penalized for drifting from the starting model                         | Cite `deepseek2025` (§2.2.1)                         |
| In depth: Qwen3 writes scratch work between think tags and skips it when thinking is off                            | Cite `qwen3-model-card`                              |
