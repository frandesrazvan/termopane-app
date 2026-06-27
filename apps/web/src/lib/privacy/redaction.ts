export function normalizeEmailAddress(email: string) {
  return email.trim().toLowerCase();
}

export function looksLikeEmailAddress(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function redactEmailAddress(email: string | null | undefined) {
  if (!email) {
    return null;
  }

  const normalized = normalizeEmailAddress(email);
  const atIndex = normalized.indexOf("@");

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return "[redacted]";
  }

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const [domainName = "", ...domainSuffixParts] = domain.split(".");
  const suffix = domainSuffixParts.length
    ? `.${domainSuffixParts.join(".")}`
    : "";

  return `${firstVisibleCharacter(localPart)}***@${firstVisibleCharacter(domainName)}***${suffix}`;
}

function firstVisibleCharacter(value: string) {
  return value.trim().charAt(0) || "*";
}
