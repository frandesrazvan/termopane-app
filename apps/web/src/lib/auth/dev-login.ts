export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isSyntheticDevLoginEmail(email: string) {
  return normalizeAuthEmail(email).endsWith("@example.test");
}
