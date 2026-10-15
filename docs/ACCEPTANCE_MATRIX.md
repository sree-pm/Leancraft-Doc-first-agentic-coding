# LeanCraft acceptance matrix

Each row must be supported by a tested SHA and real logs. Do not infer 100% correctness from this matrix.

| Check | Required evidence | Status before CI |
|---|---|---|
| CLI installation | Clean packaged npm tarball installs and init works | Awaiting CI |
| Idempotent upgrade | --force preserves human docs, customised skills and history | Awaiting CI |
| Health | Doctor distinguishes healthy scaffold from unfinished docs | Awaiting CI |
| Contract validation | Invalid source, placeholder and duplicate FR tests fail | Awaiting CI |
| Traceability | Missing or unknown FR/Flow/Persona blocks build | Awaiting CI |
| Review | Named review ties to current lock and config digest | Awaiting CI |
| Verification | Tests executed and exits recorded, failing commands fail | Awaiting CI |
| Release freshness | Different SHA, dirty tracked files or stale contract blocks release | Awaiting CI |
| MCP | Handshake, malformed payload recovery and proposal-path rejection | Awaiting CI |
| OS matrix | Linux, macOS, Windows on Node 22 and 24 | Awaiting CI |
| Security scanner | CodeQL analysis | Awaiting CI |
| Packed smoke | Archive installation into a new project | Awaiting CI |
| Independent human approval | Branch rules and separate reviewer access | External control |
| Model budgets and sandbox | OS/runtime enforcement | Not provided |
| Host E2E and actual research verification | Real clients and external primary-source checking | Not verified |

Source files alone cannot demonstrate host usability or security against unrestricted agents. Record specific remaining gaps rather than changing statuses prematurely.
