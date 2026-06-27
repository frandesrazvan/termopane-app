# Pachet fixture oferte de referinta

Acest folder pregateste validarea cu ownerii business pentru recrearea ofertelor istorice reale.
Tot ce este commited aici trebuie sa fie sintetic, redactat sau explicit sigur pentru source
control.

Nu se commituiesc PDF-uri private, nume reale de clienti, telefoane, emailuri, adrese de santier,
identificatori fiscali, spreadsheet-uri confidentiale de furnizor sau capturi din oferte reale.
Documentele originale raman in afara repository-ului; in Git ajung doar snapshot-uri JSON aprobate
si redactate.

## Checklist de excludere artefacte private

Inainte de orice commit in acest folder, confirmati explicit:

- [ ] Nu exista PDF-uri, imagini, documente Office sau capturi din oferte reale.
- [ ] Nu exista nume reale de clienti, telefoane, emailuri, adrese, CUI/CNP sau numere de contract.
- [ ] Nu exista spreadsheet-uri confidentiale de furnizor sau liste de pret brute.
- [ ] Nu exista costuri interne/supplier-cost decat daca ownerul a aprobat explicit includerea lor
      in harness-ul redacted.
- [ ] `source.privateArtifactsCommitted` este `false` pentru fiecare caz.
- [ ] `source.originalDocumentAvailable` este `false` pentru fiecare caz commited in Git.
- [ ] Originalele raman in storage privat, iar in repository exista doar JSON redacted/sintetic.

## Fisiere

- `synthetic-offers.json` contine exemple sintetice pentru exercitarea harness-ului.
- `owner-validated-historical-pack.json` este structura goala pentru primul pack istoric
  redacted/owner-validat; ramane `missing-data` pana cand ownerii furnizeaza 10-20 cazuri
  redactate.
- `templates/price-snapshot.template.json` este template pentru snapshot-uri de pret profile,
  sticla, accesorii si servicii.
- `templates/quote-case.template.json` este template pentru un caz istoric redacted.
- `templates/expected-totals.template.json` este template pentru totalurile asteptate.
- `templates/expected-pdf-output-fields.template.json` este template pentru campurile vizibile
  asteptate in outputul PDF/template.
- `README.md` este ghidul scurt pentru intake-ul fixture-urilor.
- `docs/11-business-owner-review-pack.md` este checklist-ul complet pentru sedinta cu ownerii.

## Checklist de colectare

Colectati urmatoarele inainte de recrearea a 10-20 oferte istorice validate:

- sisteme de profil: furnizor, serie, cod, material, status, versiune lista;
- deductii sticla: latime/inaltime, aplicabilitate pe sistem/pachet, unitate mm;
- reguli metru liniar profil: toc, cercevea, montant, traversa, prag, armatura, pierderi;
- reguli feronerie: tip deschidere, cantitati, limite, selectie manuala sau automata;
- accesorii si servicii: unitati, preturi, cantitati, vizibilitate client;
- TVA, discount si adaos: cote, ordine de aplicare, rotunjire, override manual;
- template PDF preferat: `template-a` sau `template-b`, texte obligatorii, footer;
- cerinte pentru output de proba: totaluri, pozitii, denumiri, avertizari si note client.

## Workflow de redactare

1. Ownerul alege 10-20 oferte istorice reprezentative.
2. Originalele raman in storage privat, in afara repository-ului public.
3. Se redacteaza clientul, proiectul, telefonul, emailul, adresa, CUI/CNP si orice identificator.
4. Se copiaza in JSON doar snapshot-ul necesar: catalog, preturi, reguli comerciale, input calcul,
   totaluri asteptate si coduri de avertizare.
5. Campurile necunoscute raman `requires business validation`; nu se inventeaza formule.
6. Se ruleaza harness-ul inainte ca un caz sa fie considerat baza de comparatie.

## Workflow de conversie in fixture sigur

1. Actualizati `owner-validated-historical-pack.json`; nu creati un pack paralel decat daca ownerii
   cer explicit un set separat.
2. Pastrati `packType = "redacted-historical-review"` pana cand exista 10-20 cazuri complet
   validate.
3. Copiati `templates/quote-case.template.json` pentru fiecare oferta istorica selectata.
4. Completati doar datele aprobate si redactate: snapshot de preturi, input de calcul, totaluri
   asteptate, coduri de avertizare si campurile PDF comparabile.
5. Folositi `templates/price-snapshot.template.json` pentru profile, sticla, accesorii si servicii.
   Nu copiati fisierele brute de la furnizor.
6. Folositi `templates/expected-totals.template.json` pentru totaluri in unitati minore.
7. Folositi `templates/expected-pdf-output-fields.template.json` pentru campurile comparabile acum:
   `templateKey`, `quoteId`, `itemCount`, `totalWithVatMinor`, `warningCodes`.
8. Marcati statusul cazului:
   - `draft-redacted`: datele sunt redactate, dar ownerul nu le-a revizuit inca;
   - `business-reviewed`: ownerul a revizuit cazul, dar comparatia nu este finala;
   - `validated-historical`: totalurile, avertizarile si campurile PDF se potrivesc;
   - `blocked-missing-data`: lipsesc inputuri business si cazul nu trebuie folosit ca referinta.
9. Cand pack-ul are 10-20 cazuri `validated-historical`, schimbati `packType` la
   `validated-historical-recreation` si `dataClassification` la `redacted-validated-historical`.
10. Rulati `pnpm reference:validate` si corectati orice lipsa sau mismatch raportat.

`Status: missing-data` este normal pentru pack-ul gol sau pentru cazuri `blocked-missing-data`.
`Status: fail` inseamna erori de validare, totaluri nealiniate, avertizari nealiniate sau campuri
PDF/template nealiniate.

## Reguli validate si calibrare

Snapshot-urile pot include reguli explicite validate de owner:

- `glass.deductionRule` cu `deductionWidthMm`, `deductionHeightMm`, `sourceRule` si
  `validationStatus`;
- `frameProfile.meterRule` cu `kind = "rectangular-perimeter"`, multiplicatori si optional
  `wasteBasisPoints`;
- `materialCalculationRules` sau `explicitMaterialRequirements` pentru hardware, accesorii si
  servicii numai cand ownerul furnizeaza cantitatea, unitatea si pretul snapshot.

Regulile cu `validationStatus = "requires-business-validation"` ruleaza cu avertizari si nu trebuie
tratate ca formule de productie. Reguli hardware, accesorii sau servicii care nu contin cantitati
explicite raman in afara calculului; nu se deduc automat dintr-un PDF istoric.

Tolerantele de rotunjire se declara in `expected.tolerances`. Pentru cazurile istorice validate,
`approvedBy` trebuie sa fie `business-owner`; tolerantele sintetice nu sunt acceptate ca validare
istorica.

Momentan repository-ul contine doar structura goala
`owner-validated-historical-pack.json`, nu un pack istoric owner-validat de 10-20 cazuri. Exemplele
commited raman sintetice si nu valideaza formule de productie.

## Forma snapshot-ului

Pachetele istorice folosesc `packType = "validated-historical-recreation"` si
`dataClassification = "redacted-validated-historical"`. Fiecare caz contine:

- `source.privateArtifactsCommitted = false`;
- `source.originalDocumentAvailable = false`;
- `redaction.customer = "redacted"` si `redaction.project = "redacted"`;
- `businessInputStatus` pentru toate cheile din `requiredReviewInputKeys`;
- `calculationInput` ca snapshot complet pentru calculator, fara citiri din baza de date live;
- `expected.totals` in unitati minore si `expected.warningCodes` pentru comparatie.
- `expected.pdfOutputFields` pentru campurile template/PDF comparabile.

Cheile obligatorii pentru review sunt:

- `profilePriceList`;
- `glassDeductionRules`;
- `glassPriceList`;
- `hardwareRules`;
- `accessoryServicePrices`;
- `commercialRules`;
- `preferredPdfTemplate`;
- `sampleOutputRequirements`.

## Harness

Harness-ul din `packages/calculation/src/reference-offer-harness.ts` valideaza ca:

- pachetele sunt sintetice/redactate sau istorice validate redactate;
- nu exista referinte la PDF-uri private sau artefacte private commited;
- fiecare categorie de input business are status;
- pachetele istorice validate contin 10-20 cazuri;
- totalurile, numarul de pozitii si codurile de avertizare se potrivesc.

Rulare recomandata:

```powershell
pnpm reference:validate
```

Comanda valideaza implicit `synthetic-offers.json` si `owner-validated-historical-pack.json`.
Afiseaza statusul `pass`, `fail` sau `missing-data`, numarul de cazuri, inputurile business lipsa,
mismatch-urile de avertizari, mismatch-urile de totaluri si mismatch-urile de campuri template/PDF.
Pentru debugging mai granular se poate rula in continuare:

```powershell
pnpm --filter @termopane/calculation test -- reference-offer-harness
```

Exemplele curente sunt baseline-uri sintetice. Nu sunt formule de furnizor si nu valideaza productia.
