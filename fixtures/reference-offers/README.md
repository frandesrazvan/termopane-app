# Pachet fixture oferte de referinta

Acest folder pregateste validarea cu ownerii business pentru recrearea ofertelor istorice reale.
Tot ce este commited aici trebuie sa fie sintetic, redactat sau explicit sigur pentru source
control.

Nu se commituiesc PDF-uri private, nume reale de clienti, telefoane, emailuri, adrese de santier,
identificatori fiscali, spreadsheet-uri confidentiale de furnizor sau capturi din oferte reale.
Documentele originale raman in afara repository-ului; in Git ajung doar snapshot-uri JSON aprobate
si redactate.

## Fisiere

- `synthetic-offers.json` contine exemple sintetice pentru exercitarea harness-ului.
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

## Forma snapshot-ului

Pachetele istorice folosesc `packType = "validated-historical-recreation"` si
`dataClassification = "redacted-validated-historical"`. Fiecare caz contine:

- `source.privateArtifactsCommitted = false`;
- `source.originalDocumentAvailable = false`;
- `redaction.customer = "redacted"` si `redaction.project = "redacted"`;
- `businessInputStatus` pentru toate cheile din `requiredReviewInputKeys`;
- `calculationInput` ca snapshot complet pentru calculator, fara citiri din baza de date live;
- `expected.totals` in unitati minore si `expected.warningCodes` pentru comparatie.

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
pnpm --filter @termopane/calculation test -- reference-offer-harness
```

Exemplele curente sunt baseline-uri sintetice. Nu sunt formule de furnizor si nu valideaza productia.
