# Analyse du Chapitre IS fourni (Art.2-53) — Mise à jour RuleBase 29/09/2026

## Source
Texte intégral **IS Chapitre 1 — Art.2 à 53** fourni par le Cabinet (Loi 2021-15 + LF 2023/2024 + LF 2025-22). Confronté à nos moteurs `docs/moteurs-calcul-2026.json v2026.1-IS-ajustements`.

Objectif : **parfaire le calcul automatique IS** en intégrant **toutes les déductions/réintégrations** citées, avec formules, plafonds et traçabilité article par article.

---

## 1. Écarts majeurs détectés vs ancienne RuleBase

| Point | Ancienne RuleBase (Art.64) | Texte fourni (Art.47) | Action |
|---|---|---|---|
| **MFP général** | 1,5% CA | **1% CA** Art.47 §1 | Corrigé → `mfp.taux 0.01` |
| **BTP** | 3% | 3% | OK |
| **Immo prépondérance** | 10% | 10% | OK |
| **Min** | 500 000F | **250 000F** §3 | Corrigé → `min 250k` |
| **Station-service** | non géré | **0,60F/litre** §5 min 250k | Ajouté `taux_station 0.60` |
| **ORTB** | 4 000F implicite | **+4 000F** §6 au 10/03 | Ajouté `redevance_ortb 4000` |
| **Produits encaissables déf.** | Art.47 §2 excl. prod immobilisée/stockée, transferts, reprises | identique §2 | Conservé |

> **Note pour client** : La LF 2024 avait introduit 1,5% (Art.64) mais le texte de référence 2026 fourni retient 1% (Art.47 modifié LF23/24). Le moteur lit désormais **1%** ; si une note DGI impose 1,5% en 2026, il suffit de changer `mfp.taux` → recalc instantané.

---

## 2. Champ d'application complété

- **Personnes imposables Art.3** : ajout en `champ_application.personnes_forme/activite` (SA/SAS/SARL/SCS/Coop, groupe, toute société dont associé = personne, entreprises publiques, intermédiaires immeubles, lotisseurs, locations meublées, adjudicataires, assurances, banques, pétrolières/minières/forestières, **option SNC/GIE/civiles avant 30/11**).
- **Exonérations Art.4** : 14 cas dont **coop consommation, offices HLM, mutuelles/SFD, prévoyance agricole, associations désintéressées** (bénévole + AG transparente + rémun ≤10×SMIG + rapport 30/04), **capital-risque 15 ans ≥50% non coté**, **agricole/pêche/élevage**, **CDC**. Ajouté en `exonerations[]` → le moteur affiche **“Exonéré Art.4 ?”** et n'applique pas IS si coché.
- **Territorialité Art.5-7** : établissement stable (siège, succursale, chantier >3 mois, services >183j, agent dépendant) → bénéfices imputables seulement à l'établissement. Ajouté en `champ_application.territorialite`.

---

## 3. Détermination du bénéfice imposable — enrichissement massif

### 3.1 Produits Art.10-13 → Art.14-19 (exonérés/différés)

- Liste Art.10 (14 catégories) ajoutée en `produits.imposables_Art10`
- Exonérés Art.14-15 : **bonis coop, part travailleurs, prépondérance immo, revenus capitaux mobiliers après 30% forfait** (→ déduction 70% `taux 0.70` dans `deductions_def`)
- Subventions Art.16 : équipement étalée sur amort ou 1/10 si non amortissable
- PV Art.17 : **cession immo ≥5 ans réinvestie au Bénin <3 ans → différée** (sinon rapportée) → `deductions_def.plus_value_reemploi`
- Fusions Art.18, réévaluation Art.19 (1/5 provision)

### 3.2 Charges déductibles Art.20-43 → mapping réintégrations/déductions

**Conditions générales Art.20** (7 critères a-g dont facture normalisée, retenue source payée) → checklist affichée.

**Enrichissements clés pour détection auto :**

| Réintégration | Compte OHADA | Article | Plafond / Formule | Calcul moteur |
|---|---|---|---|---|
| **Espèces ≥100k** | tout | Art.21 | `≥100 000F en espèces → réintégré` | Flag si mode paiement espèce (manuel pour l'instant) |
| **Amendes / pénalités** | 6581 | Art.36 | 100% | `montant` |
| **Somptuaires** (chasse/pêche/bateau/avion/résidence) | 625 | Art.33 | 100% → bénéfice distribué | `montant` |
| **Rémun occultes** | 631 | Art.34 | 100% | `montant` |
| **IS/TVM** | 695 / 63513 | Art.35 | 100% | `montant` (hors 60-68 mais 69) |
| **Intérêts** | 661/664 | Art.25 §2-3 | `BCEAO+3pts` + `30% EBITDA` ; excès report 5 ans ; capital non libéré → tout | `excess = interets - min(30%*(resultat+interets+dotations), BCEAO+3%)` |
| **Commissions achats** | 622 | Art.26 | 5% achats HT | `excess = commissions -5%*achats(601)` |
| **Redevances hors Bénin** | 633 | Art.27 | 5% CA HT | `excess = redevances -5%*CA` |
| **Frais siège** | 628 | Art.28 | 10% bénéfice avant (ou dernier bénéficiaire) ; assistance 10% frais généraux | `excess_siege = frais -10%*benefice_avant` |
| **Dons** | 6238/658 | Art.32 §1-2 | 1‰ CA tous dons + 25M secteurs État | `excess = max(0,dons-1‰CA)+max(0,dons_qualif-25M)` |
| **Cadeaux pub** | 6234 | Art.32 §3 | 3‰ CA | `excess = cadeaux -3‰*CA` |
| **Voiture tourisme** | 6811 | Art.38 §4 | 25M TTC max | `excess = amort - amort*25M/prix` |
| **Frais développement >1M** | 6819 | Art.37 | étalé 4 ans | `excess = 3/4 frais si non étalé` |
| **HAO, provisions** | 67,68 | Art.29-41 | conditions | 100% ou selon GUDEF |

Chaque **libellé + montant + calcul de l'excès** est affiché. Exemple démo : don GDIZ 400k avec CA 82M → plafond 1‰ = 82k → **excès réintégré 318k** (au lieu des 400k bruts).

**Déductions**

| Déduction | Compte | Article | Taux/formule |
|---|---|---|---|
| Revenus capitaux mobiliers | 762 | Art.15 | **70%** (30% forfait reste) |
| Reprises provisions | 781/791 | Art.41 §2 | 100% si provision antérieurement non déductible |
| Subventions équipement | 777 | Art.16 | étalée |
| PV réinvesties | 82/77 | Art.17 | 100% si réemploi 3 ans |
| Fusion/scission | 836 | Art.18 | 100% |
| Déficit 5 ans | 119 | Art.43 | `min(déficit, bénéfice) jusqu'à N+5` |
| Pertes douteuses banques 5 ans | 654 | Art.42 | si GUDEF + recouvrement |

### 3.3 Reports déficitaires Art.43
`déficit N → charge N+1..N+5` (5 ans), conditions justifié/non déjà imputé/même entreprise, perdu si saute 1er bénéfice, amort différés = déficit.

### 3.4 Autres
- Prix transfert Art.45 : >50% contrôle → bénéfice transféré réintégré
- Amort dégressif Art.40 : neuf ≥10M HT >3 ans coeff 1.5/2/2.5
- Amort accéléré Art.39 : industriel neuf >5 ans doublement

---

## 4. Calcul de l'impôt Art.46-48

Formule moteur mise à jour :
```
IS_th = Résultat fiscal × 25% (industriel hors extractive + écoles) ou 30% (autres) [Art.46]
MFP = max(250 000, CA_encaissable×1% [ ou 3% BTP, 10% immo, 0.60F/L station ]) [Art.47]
IS dû = max(IS_th, MFP) + 4 000F ORTB (1er acompte 10/03) [Art.47 §6]
```

Échéances Art.51 : 4 acomptes 10/03,10/06,10/09,10/12 sur N-1 (1er sur N-2 si déclaration non déposée, régularisé 2e), solde 30/04 (Art.49-50 avec états OHADA + 8 pièces).

---

## 5. Ce qui a été implémenté automatiquement

**JSON** `moteurs-calcul-2026.json v2026.1-IS-provided` :
- `taux`/`mfp` corrigés (1%/250k/0.60/4000)
- `reintegrations_def` : 16 règles avec `pattern`, `keywords`, `article`, `taux` (1.0 ou `excess`), `calculation` (formule plafond)
- `deductions_def` : 9 règles avec `taux 0.70` pour Art.15
- `charges_deductibles`, `produits`, `champ_application`, `minimum_perception_detail`, `echeances`, `cheminement_IS` 5 étapes

** Workflow** `calcul-impots.html` :
- Détection auto : chaque ligne FEC/Balance testée `compte + mot-clé` ; si `excess`, garde brut mais calcule excès à l'affichage (ex: dons 400k → plafond 82k → réint 318k)
- UI : cartes rouge/vert, badges Art., montants, occurrences, plafonds, switches, preview `Compt.+Réint−Déd = Fiscal` live
- Calcul IS : `fiscal = comptable + Σ réint(excès) − Σ déd(70% pour 762)` → `IS_th vs MFP (250k)`

**FEC exemple** : 9 écritures ajoutées (amende 500k, HAO 800k, provision ND 1M, IS 500k, intérêts groupe 1.2M, don 400k, dividendes 1M, reprise 700k) → **4,4M réint / 1,65M déd** visibles.

---

## 6. Prochaines vérifications proposées

1. **Tester avec ton FEC réel** : dépose-le → le moteur listera chaque réintégration avec `libellé → article → montant brut → plafond → excès` ; tu coches/décoches.
2. **Ajuster les plafonds** : si CA est pris sur 70* brut ou encaissable net (HT − prod stockée/reprises) → on affine la base `CA_encaissable`.
3. **Valider Art.25 30% EBITDA** : fournir `dotations 68 + interets 66` séparément pour calcul précis (actuellement approx).
4. **Verrouiller IS** : quand ok, on tag `v2026.1-IS-locked` et on enchaîne IBA/TPS.

---

*Document généré 29/09/2026 — à joindre à la fiche PDF comme annexe pédagogique pour le client.*
