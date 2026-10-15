# AGENTS.md | LeanCraft universal agent contract

LeanCraft is a reviewed, traceable document-first engineering workflow. A user may start with one sentence or an existing repository. Treat placeholders and unexecuted tests as incomplete.

## Start every task
1. Inspect code, history, dependencies, tests and current request.
2. Read .leancraft/config.json, human/definition/intent.md, guardrails.md, relevant feature specs and agent/progress.md.
3. Investigate user pains, real sources and competitors when relevant. Preserve citations, dates, confidence and contradictory evidence. Never invent interviews or metrics.
4. Distinguish VERIFIED facts, INFERRED assumptions and UNKNOWN items.

## Reviewed contract
Humans own .leancraft/human/. After drafting, use leancraft validate, leancraft trace, leancraft lock, then record a distinct self-declared human review using leancraft approve --by "<reviewer>". A self-declared reviewer is not authenticated by the CLI. The leancraft gate build checks source structure, lock, current review and FR/Flow/Persona traces.

When locked, agents must propose changes in .leancraft/agent/proposals/ instead of editing human specifications. Re-locking removes prior review, requiring fresh approval.

## Build and prove
Plan bounded work against FR, Flow, Persona and acceptance checks. Test the implementation, not just its documents. Configure quality.commands in config.json as argv arrays. Run leancraft verify and leancraft gate release against a clean tracked Git commit. Store progress in agent/progress.md, and run leancraft sync for derived summaries.

## Safety
Markdown, advisory locks, hashes and hooks cannot prevent a shell-capable agent from rewriting local files. Enforce actual approvals through protected branches and independently privileged humans. Restrict credentials/network/processes in an external sandbox. No static validator proves factual research quality or 100% software correctness. Report actual test results, untested scenarios and release blockers.
