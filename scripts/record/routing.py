"""Record a small and a bigger model answering the same questions, for `routing` (tier T0).

Usage:
    scripts/.venv/bin/python -m scripts.record routing

Asks Qwen2.5-0.5B-Instruct and Qwen2.5-1.5B-Instruct (greedy, so reruns match) 40 short questions
with checkable answers, and writes static/data/routing/cascade.json: each answer, whether it is
right (graded by code against the accepted answers below), and the model's confidence, the
geometric mean of the probabilities it gave its own answer tokens. The widget replays a cascade
from these: the small model answers, and the harness asks the big one when confidence is low.
"""

from __future__ import annotations

import datetime
import math
import re

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from .common import revision, write_dataset

MODELS = [
    ("small", "Qwen/Qwen2.5-0.5B-Instruct", "Qwen2.5-0.5B-Instruct"),
    ("big", "Qwen/Qwen2.5-1.5B-Instruct", "Qwen2.5-1.5B-Instruct"),
]
SYSTEM = "Answer with just the answer: a word, a name, or a number. No explanation."
MAX_NEW_TOKENS = 16

# (question, accepted answers). Numbers match as whole numbers; words as whole words, any case.
QUESTIONS: list[tuple[str, list[str]]] = [
    ("What is 17 + 25?", ["42"]),
    ("What is 9 × 8?", ["72"]),
    ("What is 23 × 17?", ["391"]),
    ("What is 144 ÷ 12?", ["12"]),
    ("What is 58 + 67?", ["125"]),
    ("What is 36 × 24?", ["864"]),
    ("What is 1000 − 357?", ["643"]),
    ("What is 15 squared?", ["225"]),
    ("What is the capital of France?", ["Paris"]),
    ("What is the capital of Japan?", ["Tokyo"]),
    ("What is the capital of Australia?", ["Canberra"]),
    ("What is the capital of Canada?", ["Ottawa"]),
    ("What is the capital of Brazil?", ["Brasília", "Brasilia"]),
    ("What is the capital of Turkey?", ["Ankara"]),
    ("What is the capital of Kenya?", ["Nairobi"]),
    ("What is the capital of New Zealand?", ["Wellington"]),
    ("What is the capital of Switzerland?", ["Bern", "Berne"]),
    ("What is the capital of Morocco?", ["Rabat"]),
    ("What is the capital of Vietnam?", ["Hanoi", "Ha Noi"]),
    ("What is the capital of Nigeria?", ["Abuja"]),
    ("What is the capital of Peru?", ["Lima"]),
    ("What is the capital of Egypt?", ["Cairo"]),
    ("What is the chemical symbol for gold?", ["Au"]),
    ("What is the chemical symbol for sodium?", ["Na"]),
    ("Which planet is the largest in our solar system?", ["Jupiter"]),
    ("Which planet is closest to the Sun?", ["Mercury"]),
    ("How many legs does a spider have?", ["8", "eight"]),
    ("At what temperature in Celsius does water boil at sea level?", ["100"]),
    ("At what temperature in Fahrenheit does water freeze?", ["32"]),
    ("Who wrote Romeo and Juliet?", ["Shakespeare"]),
    ("Who painted the Mona Lisa?", ["Leonardo", "da Vinci"]),
    ("Who wrote Pride and Prejudice?", ["Austen"]),
    ("Who was the first person to walk on the Moon?", ["Armstrong"]),
    ("What is the largest ocean on Earth?", ["Pacific"]),
    ("How many days are in a leap year?", ["366"]),
    ("How many sides does a hexagon have?", ["6", "six"]),
    ("What is the square root of 81?", ["9", "nine"]),
    ("In what year did World War II end?", ["1945"]),
    ("What is the smallest prime number?", ["2", "two"]),
    ("How many continents are there?", ["7", "seven"]),
]


def correct(answer: str, accepted: list[str]) -> bool:
    text = answer.lower().replace(",", "")
    for a in accepted:
        a = a.lower()
        pattern = rf"(?<!\d){re.escape(a)}(?!\d)" if a.isdigit() else rf"\b{re.escape(a)}\b"
        if re.search(pattern, text):
            return True
    return False


@torch.no_grad()
def ask(tokenizer, model, question: str) -> dict:
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": question}]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    ids = tokenizer(prompt, return_tensors="pt").input_ids
    out = model.generate(ids, max_new_tokens=MAX_NEW_TOKENS, do_sample=False, output_scores=True,
                         return_dict_in_generate=True)
    new = out.sequences[0, ids.shape[1]:].tolist()
    logprobs = []
    for step, token in enumerate(new):
        if token == tokenizer.eos_token_id or token in tokenizer.all_special_ids:
            break
        logprobs.append(torch.log_softmax(out.scores[step][0].float(), dim=-1)[token].item())
    text = tokenizer.decode(new, skip_special_tokens=True).strip()
    confidence = math.exp(sum(logprobs) / len(logprobs)) if logprobs else 0.0
    return {"answer": text, "tokens": len(logprobs), "confidence": round(confidence, 4)}


def main() -> None:
    torch.manual_seed(0)
    models = {}
    answers: dict[str, list[dict]] = {}
    for key, model_id, display in MODELS:
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForCausalLM.from_pretrained(model_id, dtype=torch.float32).eval()
        models[key] = {
            "id": model_id,
            "displayName": display,
            "revision": revision(model_id),
            "parameters": sum(p.numel() for p in model.parameters()),
        }
        answers[key] = []
        for question, accepted in QUESTIONS:
            a = ask(tokenizer, model, question)
            a["correct"] = correct(a["answer"], accepted)
            answers[key].append(a)
        right = sum(a["correct"] for a in answers[key])
        print(f"{display}: {right} of {len(QUESTIONS)} right")

    write_dataset("routing/cascade", {
        "version": 1,
        "system": SYSTEM,
        "small": models["small"],
        "big": models["big"],
        "questions": [
            {"question": q, "accepted": accepted, "small": answers["small"][i], "big": answers["big"][i]}
            for i, (q, accepted) in enumerate(QUESTIONS)
        ],
        "generatedAt": datetime.date.today().isoformat(),
    }, "routing")


if __name__ == "__main__":
    main()
