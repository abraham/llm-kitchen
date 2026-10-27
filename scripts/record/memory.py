"""Record notes kept between chats, for `managing-the-context` (tier T0).

Usage:
    scripts/.venv/bin/python -m scripts.record run memory

Takes the long chat that `agent` recorded (static/data/agent/context.json), asks
Qwen2.5-1.5B-Instruct (greedy, so reruns match) to write notes about the user for next time, then
asks questions in a fresh chat, once without the notes and once with them in the system prompt.
Writes static/data/agent/memory.json.
"""

from __future__ import annotations

from .agent import CONTEXT_SYSTEM, MODEL, Harness
from .common import read_dataset
from .runtime import Run, job

# Two ways to ask for notes: open-ended, and naming exactly what to keep.
NOTES_PROMPTS = {
    "general": (
        "Write short notes about the user that would help you in a future conversation with them. "
        "Keep every name and fact about them. Write only the notes."
    ),
    "specific": (
        "List every child the user mentioned and the nursery rhyme that child loves, one per line, "
        "like this: Name: rhyme. Write only the list."
    ),
}
NOTES_HEADER = "Notes from earlier conversations with this user:"
QUESTIONS = [
    "Which child in my class loves the rhyme about the cat?",
    "Which rhyme does Omar love?",
    "Which rhyme does Sam love?",
]


@job("agent/memory", models=[MODEL], needs=["agent/chat"])
def memory(run: Run) -> dict:
    h = Harness()
    context = read_dataset("agent/context")
    chat = [{"role": "system", "content": CONTEXT_SYSTEM}]
    for turn in context["turns"]:
        chat += [{"role": "user", "content": turn["task"]}, {"role": "assistant", "content": turn["answer"]}]

    def ask(system: str, question: str) -> dict:
        prompt = h.prompt([{"role": "system", "content": system}, {"role": "user", "content": question}], [])
        return {"tokens": h.tokens(prompt), "answer": h.complete(prompt, max_new_tokens=80).strip()}

    without = [{"question": q, **ask(CONTEXT_SYSTEM, q)} for q in QUESTIONS]
    notes = {}
    for key, request in run.items(NOTES_PROMPTS.items(), label=lambda n: n[0]):
        prompt = h.prompt([*chat, {"role": "user", "content": request}], [])
        text = h.complete(prompt, max_new_tokens=300).strip()
        system = f"{CONTEXT_SYSTEM}\n\n{NOTES_HEADER}\n{text}"
        notes[key] = {
            "request": request,
            "notes": text,
            "tokens": h.tokens(text),
            "answers": [{"question": q, **ask(system, q)} for q in QUESTIONS],
        }
        run.log(f"{key} NOTES: {text}")
        for a in notes[key]["answers"]:
            run.log(f"    {a['question']} -> {a['answer'][:160]}")
    for a in without:
        run.log(f"without: {a['question']} -> {a['answer'][:160]}")
    chat_tokens = h.tokens(h.prompt(chat, []))

    return {
        "version": 1,
        "model": run.info(MODEL),
        "system": CONTEXT_SYSTEM,
        "notesHeader": NOTES_HEADER,
        "chatTokens": chat_tokens,
        "without": without,
        "notes": notes,
    }
