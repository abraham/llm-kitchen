"""Record fill-in-the-blank guesses for `encoders` (tier T0).

Usage: scripts/.venv/bin/python -m scripts.record encoder

Writes static/data/encoders/fill-mask.json: for each sentence, BERT's top guesses for the blank (it reads
the whole sentence) and GPT-2's top next tokens given only the words before the blank.
"""

from __future__ import annotations

import datetime

import torch
from transformers import AutoModelForCausalLM, AutoModelForMaskedLM, AutoTokenizer

from .common import CANONICAL, revision, write_dataset

BERT = "google-bert/bert-base-uncased"
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


def main() -> None:
    bert_tok = AutoTokenizer.from_pretrained(BERT)
    bert = AutoModelForMaskedLM.from_pretrained(BERT, dtype=torch.float32).eval()
    gpt_tok = AutoTokenizer.from_pretrained(CANONICAL["huggingFaceId"])
    gpt = AutoModelForCausalLM.from_pretrained(CANONICAL["huggingFaceId"], dtype=torch.float32).eval()

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
            "bert": {"id": BERT, "displayName": "BERT base", "revision": revision(BERT)},
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
    write_dataset("encoders/fill-mask", data, "encoder")
    for s in sentences:
        print(s["sentence"])
        print("  BERT:", [(c["text"], c["p"]) for c in s["bert"][:5]])
        print("  GPT-2:", [(c["text"], c["p"]) for c in s["gpt2"][:5]])


if __name__ == "__main__":
    main()
