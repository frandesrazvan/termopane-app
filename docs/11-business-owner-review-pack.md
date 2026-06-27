# Pachet de review cu ownerii business

Scopul acestui pachet este să facă vizibil ce mai lipsește pentru validarea ofertelor reale, fără
să schimbăm planul aplicației în timpul ședinței. Ownerii confirmă regulile; aplicația păstrează
regulile neconfirmate ca date configurabile sau `requires business validation`.

## Checklist de colectare

| Zonă | Ce se colectează | Decizie necesară |
| --- | --- | --- |
| Sisteme de profil | Furnizor, serie, material, coduri, status activ/inactiv, versiune listă | Ce sisteme intră în MVP și ce coduri apar pe ofertă |
| Deducții sticlă | Deducție lățime/înălțime pe sistem, pachet sau tip deschidere | Valori exacte, unitate mm, prioritate când există mai multe reguli |
| Reguli metru liniar profil | Profile toc/cercevea/montant/traversă/prag, pierderi, armare | Regula de calcul sau marcaj explicit ca nevalidat |
| Feronerie | Seturi, tip deschidere, cantități explicite, limite de dimensiuni | Când se selectează manual și când se poate calcula automat |
| Accesorii și servicii | Glafuri, plase, transport, montaj, unități și prețuri | Ce este vizibil clientului și ce rămâne doar intern |
| TVA, discount, adaos | Cote TVA, adaos, discount, rotunjire, override manual | Ordinea aplicării și permisiunile de rol |
| Template PDF preferat | `template-a` sau `template-b`, texte obligatorii, logo, footer | Template implicit și cerințe minime de ieșire |
| Cerințe pentru output de probă | Totaluri, poziții, denumiri, avertizări, note client | Ce trebuie să se potrivească pentru acceptarea unui caz istoric |

## Ghid de intake pentru fixture-uri

1. Selectați 10-20 oferte istorice reprezentative: ferestre simple, configurații cu sticlă diferită,
   feronerie, accesorii, servicii, discounturi și cel puțin un caz cu override manual.
2. Păstrați PDF-urile originale, pozele, emailurile, Excelurile de furnizor și documentele clientului
   în afara repository-ului public.
3. Redactați nume client, telefon, email, adresă, CUI/CNP, număr contract și orice reper care poate
   identifica proiectul.
4. Transformați doar valorile aprobate în JSON: snapshot catalog, snapshot comercial, input calcul,
   totaluri așteptate și coduri de avertizare.
5. Marcați fiecare câmp necunoscut cu `requires business validation`; nu completați formule din
   memorie sau aproximații neverificate.
6. Rulați harness-ul de comparație înainte ca pachetul să fie folosit ca referință.

## Formă JSON așteptată

Fixture-urile istorice trebuie să urmeze forma din
`fixtures/reference-offers/synthetic-offers.json`, dar cu date redactate și statusuri validate:

## Conversie sigura in fixture-uri redacted

Folositi template-urile din `fixtures/reference-offers/templates/`:

- `price-snapshot.template.json` pentru snapshot-uri profile, sticla, accesorii si servicii;
- `quote-case.template.json` pentru fiecare caz istoric redacted;
- `expected-totals.template.json` pentru totaluri in unitati minore;
- `expected-pdf-output-fields.template.json` pentru campurile PDF/template comparabile.

Statusurile permise pentru cazurile istorice sunt:

- `draft-redacted`: datele sunt redactate, dar nu au fost revizuite de owner;
- `business-reviewed`: ownerul a revizuit cazul, dar comparatia nu este finala;
- `validated-historical`: totaluri, avertizari si campuri PDF/template validate;
- `blocked-missing-data`: lipsesc inputuri business, deci cazul ramane blocat.

Nu schimbati un caz in `validated-historical` pana cand toate intrarile din `businessInputStatus`
sunt `validated` sau `not-applicable`, `source.privateArtifactsCommitted` este `false`, iar
`source.originalDocumentAvailable` este `false`.

Pentru un pack in lucru folositi `packType = "redacted-historical-review"` si
`dataClassification = "redacted-historical"`. Dupa ce exista 10-20 cazuri validate, schimbati la
`packType = "validated-historical-recreation"` si
`dataClassification = "redacted-validated-historical"`.

## Calibrare reguli COD-039

Pentru calibrare se copiaza doar reguli validate explicit de owner:

- deductii sticla in `glass.deductionRule`;
- reguli metru liniar profil in `frameProfile.meterRule`;
- hardware, accesorii si servicii in `materialCalculationRules` sau `explicitMaterialRequirements`
  numai cand exista cantitate, unitate si pret snapshot.

Nu se deduc formule dintr-un singur PDF si nu se reverse-engineer-uiesc formule de furnizor.
Diferentele fata de outputul istoric trebuie sa ramana vizibile in raportul `pnpm reference:validate`.
Tolerantele de rotunjire sunt permise doar in `expected.tolerances` cu `approvedBy =
"business-owner"`.

## Exemplu JSON validat

```json
{
  "schemaVersion": 1,
  "packId": "redacted-historical-review-pack",
  "packType": "validated-historical-recreation",
  "dataClassification": "redacted-validated-historical",
  "requirementsChecklist": [
    { "key": "profilePriceList", "label": "Liste profile", "status": "validated" },
    { "key": "sampleOutputRequirements", "label": "Output proba", "status": "validated" }
  ],
  "cases": [
    {
      "caseId": "redacted-historical-01",
      "title": "Oferta istorica redactata 01",
      "reviewStatus": "validated-historical",
      "dataClassification": "redacted-validated-historical",
      "preferredTemplateKey": "template-a",
      "source": {
        "kind": "redacted-historical-json",
        "originalDocumentAvailable": false,
        "privateArtifactsCommitted": false
      },
      "redaction": {
        "customer": "redacted",
        "project": "redacted",
        "sourceDocuments": "none-committed"
      },
      "businessInputStatus": {
        "profilePriceList": "validated",
        "glassDeductionRules": "validated",
        "glassPriceList": "validated",
        "hardwareRules": "validated",
        "accessoryServicePrices": "validated",
        "commercialRules": "validated",
        "preferredPdfTemplate": "validated",
        "sampleOutputRequirements": "validated"
      },
      "calculationInput": {
        "quoteId": "redacted-historical-01",
        "commercialRules": {
          "markupBasisPoints": 0,
          "discountBasisPoints": 0,
          "vatBasisPoints": 1900
        },
        "items": [
          {
            "elementId": "redacted-historical-01-line-1",
            "type": "custom-line",
            "description": "Linie redactata",
            "quantity": 1,
            "unit": "fixed",
            "unitPriceMinor": 0
          }
        ]
      },
      "expected": {
        "itemCount": 1,
        "warningCodes": [],
        "totals": {
          "totalWithVatMinor": 0
        },
        "pdfOutputFields": {
          "templateKey": "template-a",
          "quoteId": "redacted-historical-01",
          "itemCount": 1,
          "totalWithVatMinor": 0,
          "warningCodes": []
        }
      }
    }
  ]
}
```

`calculationInput` trebuie să fie un snapshot complet pentru `QuoteCalculationInput`, nu o referință
la baza de date live. Totalurile sunt în unități minore (`bani` pentru RON).

## Harness de comparație

`packages/calculation/src/reference-offer-harness.ts` validează pachetul, respinge referințele la
artefacte private și compară rezultatul calculului cu totalurile așteptate. Pentru pachetele istorice
validate, dimensiunea acceptată este 10-20 cazuri.

Comandă recomandată:

```powershell
pnpm reference:validate
```

Comanda afiseaza numarul de cazuri, inputurile business lipsa, mismatch-urile de avertizari,
mismatch-urile de totaluri si mismatch-urile de campuri PDF/template.

Raportul `createReferenceOfferComparisonReport` întoarce numărul de cazuri, erori de validare,
cazuri trecute/eșuate și dacă pachetul este pregătit pentru sesiunea de review.

## Dashboard

Dashboard-ul owner/admin afișează callout-ul `Validare business necesară` când catalogul, regulile de
preț sau setările de calcul conțin marcaje de validare. Callout-ul nu afișează costuri interne sau
date client; arată doar categoriile și numărul de înregistrări care trebuie confirmate.

## În afara scopului

Acest pachet nu introduce formule ERP, CNC, optimizare de debitare, facturare, integrare furnizori sau
date reale în repository. Scopul este doar să strângem lipsurile exacte pentru validarea business.
