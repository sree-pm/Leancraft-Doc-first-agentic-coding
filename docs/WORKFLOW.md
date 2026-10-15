# LeanCraft: complete document-first engineering playbook

## 0. Intake and baseline

Start by reading existing source, tests, deployment context, customer problem, legal and operating constraints. Never delete pre-existing documents to suit a template. Record VERIFIED, INFERRED and UNKNOWN separately.

## 1. Evidence-based discovery

For each recurring pain capture exact source URL, publication date, customer type, severity, representativeness and any contradictory evidence. For interviews record consent and suitable privacy controls. Group pains, then derive personas and JTBD. Research current substitutes and pricing before describing differentiation. For unknown facts use UNKNOWN, not a fabricated quote.

## 2. Product specification

Prepare goals, non-goals, metrics, assumptions, flows, FR/NFR IDs, accessibility needs, risk register, RACI and dependencies. Link FR IDs to flows and personas and make acceptance scenarios testable. For regulated products add specialist evidence and review; for low-risk prototypes explicitly agree a smaller registry.

## 3. Engineering contract

In intent.md record invariants, testable oracles and source trace. In system.md record runtime, data model, deployment and design decisions. In guardrails.md record security, accessibility, reliability, localisation and legal obligations. If relevant add optional data, agent, UX, skills and design-system specifications. Avoid duplicative documents.

## 4. Approval

Human decides scope and architecture. Run `npx leancraft validate`; validate formatting and completeness without claiming research truth. Lock only after review. Post-lock agent proposals do not apply changes. High-risk scope changes require a fresh human review.

## 5. Implementation loop

For every feature: select FR and Flow, inspect code, write a bounded plan, test-first where useful, implement minimally, run actual checks, review diffs, update `agent/progress.md` and regenerate summaries with `npx leancraft sync`. Use reversible migrations and rollback plans.

## 6. Definition of done

Record exact test commands and actual results: unit, integration, user-journey E2E, abuse/security, accessibility, load, packaging and deploy checks as applicable. Independent human acceptance is separate. A document validator cannot establish production readiness.

## 7. Release and operations

Require CI, code reviews, supply chain checks, versioned artefacts, deployment rollback, observability, incident plans and change logs. Track user outcomes and errors after launch, then refine the contract.

## Agent safety boundary

Least-privilege execution, separate secrets, sandboxing, cost controls and code-owner reviews must be implemented by the external runner and repository administration. LeanCraft's JSON policy alone does not restrict tools, tokens or network.
