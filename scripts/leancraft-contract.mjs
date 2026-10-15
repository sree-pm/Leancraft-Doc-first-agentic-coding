import { createHash } from "node:crypto";

/** Hash only contract-bearing fields; exclude transient review metadata and timestamps. */
export function contractDigest(cfg) {
  const fields = ["version","profile","docRegistry","ownership","budget","quality","reviewPolicy","research","lockedFiles"];
  const contract = {};
  for (const key of fields) contract[key] = cfg[key] ?? null;
  return createHash("sha256").update(JSON.stringify(contract)).digest("hex");
}
