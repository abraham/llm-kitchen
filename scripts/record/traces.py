"""Generate recorded (T0) traces from the canonical small model.

Usage:
    python3 -m venv scripts/.venv
    scripts/.venv/bin/pip install -r scripts/requirements.txt
    scripts/.venv/bin/python -m scripts.record run traces              # all traces
    scripts/.venv/bin/python -m scripts.record run traces/the-cat-sat  # one trace

Each trace is a job that writes static/data/traces/<model-id>/<name>.json (validated in the browser
by parseTrace in src/lib/models/trace.ts); `vectors/the-cat-sat` writes the vectors.
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass, field

import torch

from .common import CANONICAL, check_canonical, revision
from .runtime import ModelSpec, Run, job

GPT2 = ModelSpec(CANONICAL["huggingFaceId"], CANONICAL["displayName"], attention="eager")


@dataclass
class Spec:
    name: str
    prompt: str
    max_new_tokens: int
    top_k: int = 10
    temperature: float = 0.0  # 0 = always take the most likely token
    # Subtracted from a token's score once for every earlier time it was generated.
    frequency_penalty: float = 0.0
    seed: int = 0
    attention: bool = False
    note: str = ""
    stop_at_newline: bool = False
    extra: dict = field(default_factory=dict)


SPECS = [
    Spec(
        "the-cat-sat",
        "The cat sat on the",
        max_new_tokens=12,
        top_k=50,
        note="`guessing-game`, `probability-and-sampling`, `generating-text`: the running example, greedy.",
    ),
    *[
        Spec(
            f"the-cat-sat-t{str(t).replace('.', '')}",
            "The cat sat on the",
            max_new_tokens=16,
            top_k=10,
            temperature=t,
            seed=seed,
            note=f"`probability-and-sampling`: sampled at temperature {t}.",
        )
        for t, seed in [(0.0, 0), (0.7, 7), (1.5, 15)]
    ],
    # `attention`: recorded attention for the attention viewer (one generated token each).
    Spec("attn-the-cat-sat", "The cat sat on the", max_new_tokens=1, attention=True),
    Spec(
        "attn-ioi",
        "When Mary and John went to the store, John gave a drink to",
        max_new_tokens=1,
        attention=True,
        note="Indirect object identification (Wang et al. 2022).",
    ),
    Spec(
        "attn-trophy-big",
        "The trophy didn't fit in the suitcase because it was too big",
        max_new_tokens=1,
        attention=True,
    ),
    Spec(
        "attn-trophy-small",
        "The trophy didn't fit in the suitcase because it was too small",
        max_new_tokens=1,
        attention=True,
    ),
    Spec(
        "attn-mary-lamb",
        "Mary had a little lamb, its fleece was white as snow",
        max_new_tokens=1,
        attention=True,
    ),
    # `generating-text`: what follows if you pick another of the top first words (the glass-box generator
    # follows these when the visitor overrides the model's choice without the live model).
    *[
        Spec(
            f"the-cat-sat-{word}",
            f"The cat sat on the {word}",
            max_new_tokens=11,
            top_k=50,
            note="`generating-text`: branch of the-cat-sat, greedy.",
        )
        for word in ["bed", "couch", "ground", "edge"]
    ],
    # `generating-text`: the greedy loop after " bed", without and with a frequency penalty.
    *[
        Spec(
            f"penalty-{str(p).replace('.', '')}",
            "The cat sat on the bed",
            max_new_tokens=32,
            top_k=10,
            frequency_penalty=p,
            note=f"`generating-text`: greedy with frequency penalty {p}.",
        )
        for p in [0, 0.5, 5]
    ],
    # `quirks-and-limits`: quirks and limits, greedy with the top 50 at each step.
    *[
        Spec(name, prompt, max_new_tokens=n, top_k=50, note=f"`quirks-and-limits`: {note}")
        for name, prompt, n, note in [
            ("quirk-moon", "The first person to walk on the moon was", 16, "hallucination"),
            (
                "quirk-painter",
                "The famous painter Zorbulon Fiddleworth is best known for his painting",
                16,
                "hallucination about a made-up person",
            ),
            ("quirk-iphone", "The latest iPhone model is the iPhone", 8, "knowledge cutoff"),
            ("quirk-math", "2 + 2 =", 6, "arithmetic"),
            ("quirk-france", "The capital of France is", 12, "wording"),
            ("quirk-france-qa", "Q: What is the capital of France?\nA:", 8, "wording"),
            ("quirk-loop", "The cat sat on the bed", 24, "repetition"),
            ("quirk-nurse", "The nurse said that", 12, "bias"),
            ("quirk-engineer", "The engineer said that", 12, "bias"),
        ]
    ],
]


def token(tokenizer, token_id: int) -> dict:
    return {"id": int(token_id), "text": tokenizer.decode([int(token_id)])}


def trace(spec: Spec, model, tokenizer) -> dict:
    ids = tokenizer(spec.prompt, return_tensors="pt").input_ids[0].tolist()
    prompt_tokens = [token(tokenizer, i) for i in ids]
    generator = torch.Generator().manual_seed(spec.seed)
    steps = []
    context = list(ids)
    counts = torch.zeros(model.config.vocab_size)

    with torch.no_grad():
        for _ in range(spec.max_new_tokens):
            logits = model(torch.tensor([context])).logits[0, -1] - spec.frequency_penalty * counts
            probs = torch.softmax(logits, dim=-1)
            top = torch.topk(probs, spec.top_k)
            if spec.temperature == 0:
                chosen = int(torch.argmax(logits))
            else:
                tempered = torch.softmax(logits / spec.temperature, dim=-1)
                chosen = int(torch.multinomial(tempered, 1, generator=generator))
            candidates = [
                {"token": token(tokenizer, i), "prob": round(float(p), 6)}
                for p, i in zip(top.values.tolist(), top.indices.tolist())
            ]
            steps.append(
                {
                    "context": [token(tokenizer, i) for i in context],
                    "candidates": candidates,
                    "rest": round(max(0.0, 1 - sum(c["prob"] for c in candidates)), 6),
                    "chosen": token(tokenizer, chosen),
                }
            )
            context.append(chosen)
            counts[chosen] += 1
            if spec.stop_at_newline and "\n" in tokenizer.decode([chosen]):
                break

        trace = {
            "version": 1,
            "kind": "recorded",
            "model": CANONICAL["id"],
            "modelDisplayName": CANONICAL["displayName"],
            "prompt": spec.prompt,
            "tokens": prompt_tokens,
            "steps": steps,
            "settings": {"topK": spec.top_k, "temperature": spec.temperature, "seed": spec.seed}
            | ({"frequencyPenalty": spec.frequency_penalty} if spec.frequency_penalty else {}),
            "generatedAt": datetime.date.today().isoformat(),
            "source": {
                "huggingFaceId": CANONICAL["huggingFaceId"],
                "revision": revision(CANONICAL["huggingFaceId"]),
                "torch": torch.__version__,
            },
        }

        if spec.attention:
            out = model(torch.tensor([ids]), output_attentions=True)
            trace["attention"] = {
                "tokens": prompt_tokens,
                "weights": [
                    [[[round(float(w), 4) for w in row] for row in head] for head in layer[0]]
                    for layer in out.attentions
                ],
            }

    if tokenizer.decode(ids) != spec.prompt:
        raise SystemExit(f"{spec.name}: tokens do not round-trip to the prompt")
    return trace


def export_vectors(prompt: str, model, tokenizer) -> dict:
    """Token embeddings, position embeddings, and the last token's vector after every block."""
    ids = tokenizer(prompt, return_tensors="pt").input_ids
    with torch.no_grad():
        out = model(ids, output_hidden_states=True)
    wte = model.transformer.wte.weight[ids[0]]
    wpe = model.transformer.wpe.weight[: ids.shape[1]]
    r = lambda t: [[round(float(x), 4) for x in row] for row in t]  # noqa: E731

    # Logit lens: what the last token's vector would predict if we stopped after each block
    # (apply the final layer norm and the output layer early).
    lens = []
    with torch.no_grad():
        for layer, h in enumerate(out.hidden_states):
            v = h[0, -1] if layer == len(out.hidden_states) - 1 else model.transformer.ln_f(h[0, -1])
            probs = torch.softmax(model.lm_head(v), dim=-1)
            top = torch.topk(probs, 5)
            lens.append(
                [
                    {"token": token(tokenizer, i), "prob": round(float(p), 4)}
                    for p, i in zip(top.values.tolist(), top.indices.tolist())
                ]
            )
    data = {
        "model": CANONICAL["id"],
        "modelDisplayName": CANONICAL["displayName"],
        "prompt": prompt,
        "tokens": [token(tokenizer, i) for i in ids[0].tolist()],
        "dimensions": CANONICAL["embeddingSize"],
        "tokenEmbeddings": r(wte),
        "positionEmbeddings": r(wpe),
        # hidden_states[0] is embeddings + positions; [i] is after block i (the last one is
        # after the final layer norm in Hugging Face's GPT-2).
        "lastTokenByLayer": r(torch.stack([h[0, -1] for h in out.hidden_states])),
        "logitLens": lens,
        "generatedAt": datetime.date.today().isoformat(),
        "source": {"huggingFaceId": CANONICAL["huggingFaceId"], "revision": revision(CANONICAL["huggingFaceId"])},
    }
    return data


def gpt2(run: Run):
    loaded = run.model(GPT2)
    check_canonical(loaded.model)
    return loaded.model, loaded.tokenizer


def declare(spec: Spec) -> None:
    @job(f"traces/{spec.name}", models=[GPT2], compact=True)
    def record_trace(run: Run) -> dict:
        recorded = trace(spec, *gpt2(run))
        run.log(repr(spec.prompt + "".join(s["chosen"]["text"] for s in recorded["steps"])))
        return recorded


for _spec in SPECS:
    declare(_spec)


@job("vectors/the-cat-sat", models=[GPT2], compact=True)
def record_vectors(run: Run) -> dict:
    return export_vectors("The cat sat on the", *gpt2(run))
