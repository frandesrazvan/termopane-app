import { canManageCatalog } from "../../../lib/auth/permissions";

export function canMutateCatalog(membership: Parameters<typeof canManageCatalog>[0]) {
  return canManageCatalog(membership);
}
