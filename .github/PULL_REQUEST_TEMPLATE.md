Do not merge Codex PRs if the PR description does not say:
- what changed;
- what was tested;
- what is out of scope;
- whether tenant isolation/auth/calculation/PDF/versioning were touched.
- whether README/docs and Romanian translations were considered.

## Summary

-

## Scope

Included:
-

Excluded:
-

## Risk areas

- [ ] Tenant isolation touched
- [ ] Auth/RBAC touched
- [ ] Calculation behavior touched
- [ ] Quote versioning touched
- [ ] PDF output touched
- [ ] Mobile layout touched
- [ ] Romanian translations touched
- [ ] README/docs touched
- [ ] None of the above

## Tests

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm prisma generate`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Not run, with reason:

## Business validation

- [ ] Tenant isolation considered
- [ ] Pricing assumptions documented
- [ ] Quote versioning unaffected
- [ ] Dealer cost visibility unaffected
- [ ] PDF output checked, if relevant
- [ ] Romanian user-facing copy checked, if relevant
- [ ] README updated or confirmed unchanged
- [ ] No real customer/private data committed
- [ ] No production formulas invented
- [ ] Unknown business rules marked configurable or requiring validation

## Screenshots / output

-
