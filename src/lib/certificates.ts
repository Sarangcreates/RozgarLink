import type { Certificate, RegistryEntry } from "../engine/types";
const key = (id: string, name: string, title: string) =>
  [
    id.trim().toUpperCase(),
    name.trim().toLowerCase(),
    title.trim().toLowerCase(),
  ].join("|");
export async function certificateDigest(
  id: string,
  name: string,
  title: string,
) {
  const bytes = new TextEncoder().encode(key(id, name, title));
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function verifyCertificate(
  c: Certificate,
  name: string,
  registry: RegistryEntry[],
) {
  if (!/^RL-\d{4}-\d{3}$/.test(c.certId.trim().toUpperCase()))
    return {
      ...c,
      status: "Invalid" as const,
      reason: "Certificate ID must use RL-YYYY-NNN.",
    };
  const entry = registry.find(
    (r) => r.certId === c.certId.trim().toUpperCase(),
  );
  if (!entry)
    return {
      ...c,
      status: "Unverified" as const,
      reason: "This ID is not in the simulated local registry.",
    };
  const actual = await certificateDigest(c.certId, name, c.title),
    expected = await certificateDigest(
      entry.certId,
      entry.applicantName,
      entry.title,
    );
  if (
    actual !== expected ||
    entry.issuer.trim().toLowerCase() !== c.issuer.trim().toLowerCase()
  )
    return {
      ...c,
      status: "Invalid" as const,
      reason:
        "ID, applicant name, title, or issuer does not match the local registry.",
    };
  return {
    ...c,
    status: "Verified" as const,
    reason:
      "SHA-256 identity/title digest and issuer match the simulated registry.",
    skillsClaimed: [...entry.skillsClaimed],
  };
}
