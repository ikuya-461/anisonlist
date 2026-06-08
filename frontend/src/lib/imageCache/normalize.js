export function normalizeText(str) {
  if (!str) return "";
  return str
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
