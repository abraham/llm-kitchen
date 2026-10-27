# Picking a model

**Question:** If a model is the right tool, which one? There are hundreds to choose from.

**Key idea:** A model's name packs in its family, size, tuning, and often its bits per weight and
file format. `E` means an effective size and `A` an active size; both store more weights than they
use per token. `it` means instruction-tuned, `assistant` a drafter, and `qat` trained to survive
4-bit rounding. Memory for the weights is about weights × bits ÷ 8, plus the KV cache and the
runtime. Narrow by task, inputs, device, speed, context, and license, then test on your own prompts.

## Widgets

- `NameDecoder`: pick a real model ID from Google's Gemma 4 collections, two of DeepSeek's
  R1-Distill models, or the models this site uses.
  Each part of the name lights up, and clicking a part highlights its explanation and the chapter
  behind it:
  - **Family and generation** (`gemma-4`, `Qwen2.5`): who made it and which release.
  - **Size** (`31B`, `1.5B`): billions of parameters ([Scale](scale.md)).
  - **Effective size** (`E2B`, `E4B`): per-layer embedding tables that are only looked up, like the
    token table in [Meaning as position](embeddings.md), so each token costs about as much as a
    smaller model.
  - **Active size** (`26B-A4B`): a mixture of experts ([Many experts](mixture-of-experts.md)); all
    of it must fit in memory, but it runs nearly as fast as a 4B model.
  - **Tuning** (`-it`, `-Instruct`, or nothing): instruction-tuned, or a base model
    ([From predictor to assistant](predictor-to-assistant.md)).
  - **Drafter** (`-assistant`): a drafter for [speculative decoding](speculative-decoding.md).
  - **Distilled** (`DeepSeek-R1-Distill-Qwen-1.5B`): the teacher, `Distill`, then the student's
    family and size ([From predictor to assistant](predictor-to-assistant.md),
    [Thinking before answering](reasoning-models.md)).
  - **Quantization** (`-qat`, `Q4_0`, `w4a16`, `wNa8o8`): bits for weights and activations, and
    whether the model was trained for it ([Fewer bits per number](quantization.md)).
  - **Target and file format** (`-mobile`, `-transformers`, `-ct`, `.gguf`): the same model packaged
    for different hardware and software.
  - **A different kind of model** (`diffusiongemma`): [Painting from noise](diffusion.md).
  - **Not in the name:** context length, inputs (such as audio), a thinking mode, and the license,
    all on the model card. Hugging Face's parameter count counts stored tensors, so it can differ
    from the name.
- `MemoryCalculator`: pick a model and a precision and see the weights' memory next to a phone with
  8 GB, a laptop with 16 GB, and a 24 GB graphics card.
- A closing checklist: the task, the inputs, the device's memory, the speed needed (active
  parameters, drafters), the context length, and the license. Benchmarks narrow the list; testing on
  your own prompts ([Where prompts break](where-prompts-break.md)) decides it.

## Data

Model IDs, name parts, and memory figures in `src/lib/chapters/picking-a-model/data.ts`, citing the Gemma 4 model
cards, the Gemma 4 QAT announcement, and the GGUF format docs with accessed dates. Lineups and
suffixes change often, so the list is dated and re-checked when the site is reviewed.

## Decisions

- The calculator shows the weights only, and says the KV cache, the runtime, and everything else on
  the device need more. A context-length slider was left out: Gemma 4's configs mix sliding-window
  and full-attention layers, share some layers' keys and values, and use different head sizes for
  global layers, so a per-token figure from the config couldn't be checked against a published
  number.
- Sources are the model cards rather than the technical report.
- [Levels](../levels.md): Simple shortens the list of name parts and what isn't in a name. In
  depth works out a full memory bill, weights plus KV cache, for Qwen2.5-1.5B-Instruct.
