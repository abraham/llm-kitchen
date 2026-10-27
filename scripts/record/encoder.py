"""Record fill-in-the-blank guesses for `encoders` (tier T0).

Usage: scripts/.venv/bin/python -m scripts.record run encoder

Writes static/data/encoders/fill-mask.json: for each sentence, BERT's top guesses for the blank (it reads
the whole sentence) and GPT-2's top next tokens given only the words before the blank.
"""

from __future__ import annotations

import datetime

import torch

from .common import CANONICAL, ENCODER, revision
from .runtime import ModelSpec, Run, job

BERT_SPEC = ModelSpec(ENCODER["huggingFaceId"], ENCODER["displayName"], kind="masked")
GPT2 = ModelSpec(CANONICAL["huggingFaceId"], CANONICAL["displayName"])
BERT = BERT_SPEC.id
TOP = 10
SENTENCES = [
    "The cat sat on the [MASK] of the fridge.",
    "She went to the [MASK] to buy some bread.",
    "I put on my [MASK] because my feet were cold.",
    "The [MASK] wagged its tail and barked.",
]


def top(probs: torch.Tensor, decode) -> list[dict]:
    values, ids = probs.topk(TOP)
    return [
        {"text": decode(int(i)), "id": int(i), "p": round(float(v), 5)}
        for v, i in zip(values, ids)
    ]


@job("encoders/fill-mask", models=[BERT_SPEC, GPT2])
def fill_mask(run: Run) -> dict:
    bert_loaded, gpt_loaded = run.model(BERT_SPEC), run.model(GPT2)
    bert_tok, bert = bert_loaded.tokenizer, bert_loaded.model
    gpt_tok, gpt = gpt_loaded.tokenizer, gpt_loaded.model

    sentences = []
    for sentence in SENTENCES:
        enc = bert_tok(sentence, return_tensors="pt")
        position = int((enc.input_ids[0] == bert_tok.mask_token_id).nonzero()[0, 0])
        with torch.no_grad():
            logits = bert(**enc).logits[0, position]
        bert_top = top(logits.softmax(-1), lambda i: bert_tok.convert_ids_to_tokens(i))

        before = sentence.split("[MASK]")[0].rstrip()
        ids = gpt_tok(before, return_tensors="pt").input_ids
        with torch.no_grad():
            logits = gpt(ids).logits[0, -1]
        gpt_top = top(logits.softmax(-1), lambda i: gpt_tok.decode([i]))

        sentences.append(
            {
                "sentence": sentence,
                "before": before,
                # BERT's own pieces of the sentence, without its [CLS]/[SEP] markers.
                "tokens": bert_tok.convert_ids_to_tokens(enc.input_ids[0])[1:-1],
                "bert": bert_top,
                "gpt2": gpt_top,
            }
        )

    data = {
        "version": 1,
        "models": {
            "bert": {"id": BERT, "displayName": ENCODER["displayName"], "revision": revision(BERT)},
            "gpt2": {
                "id": CANONICAL["huggingFaceId"],
                "displayName": CANONICAL["displayName"],
                "revision": revision(CANONICAL["huggingFaceId"]),
            },
        },
        "sentences": sentences,
        "generatedAt": datetime.date.today().isoformat(),
        "source": {"torch": torch.__version__},
    }
    for s in sentences:
        run.log(s["sentence"])
        run.log(f"  BERT: {[(c['text'], c['p']) for c in s['bert'][:5]]}")
        run.log(f"  GPT-2: {[(c['text'], c['p']) for c in s['gpt2'][:5]]}")
    return data
