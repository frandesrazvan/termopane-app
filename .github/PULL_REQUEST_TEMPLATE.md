Do not merge Codex PRs if the PR description does not say:
- what changed;
- what was tested;
- what is out of scope;
- whether tenant isolation/auth/calculation/PDF/versioning were touched.

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
- [ ] No real customer/private data committed
- [ ] No production formulas invented
- [ ] Unknown business rules marked configurable or requiring validation

## Screenshots / output

-
