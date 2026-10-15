# LeanCraft acceptance matrix

Each row must be supported by a tested SHA and real logs. Do not infer 100% correctness from this matrix.

| Check | Required evidence | Verification reference |
|---|---|---|
| CLI installation | Clean packaged npm tarball installs and init works | Verify latest passing Actions run for the exact commit |
| Idempotent upgrade | --force preserves human docs, customised skills and history | Verify latest passing Actions run for the exact commit |
| Health | Doctor distinguishes healthy scaffold from unfinished docs | Verify latest passing Actions run for the exact commit |
| Contract validation | Invalid source, placeholder and duplicate FR tests fail | Verify latest passing Actions run for the exact commit |
| Traceability | Missing or unknown FR/Flow/Persona blocks build | Verify latest passing Actions run for the exact commit |
| Review | Named review ties to current lock and config digest | Verify latest passing Actions run for the exact commit |
| Verification | Tests executed and exits recorded, failing commands fail | Verify latest passing Actions run for the exact commit |
| Release freshness | Different SHA, dirty tracked files or stale contract blocks release | Verify latest passing Actions run for the exact commit |
| MCP | Handshake, malformed payload recovery and proposal-path rejection | Verify latest passing Actions run for the exact commit |
| OS matrix | Linux, macOS, Windows on Node 22 and 24 | Verify latest passing Actions run for the exact commit |
| Security scanner | CodeQL analysis | Verify latest passing Actions run for the exact commit |
| Packed smoke | Archive installation into a new project | Verify latest passing Actions run for the exact commit |
| Independent human approval | Branch rules and separate reviewer access | External control |
| Model budgets and sandbox | OS/runtime enforcement | Not provided |
| Host E2E and actual research verification | Real clients and external primary-source checking | Not verified |

The latest results should be checked under the repository Actions tab for the exact commit being released. Source files alone cannot demonstrate host usability or security against unrestricted agents. Record specific remaining gaps rather than changing statuses prematurely.
