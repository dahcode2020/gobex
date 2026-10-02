# ÉTAPE 1 — IS : Cheminement complet et verrouillage (CGI 2026)
### Moteur modèle pour 33 autres — Update-proof

**Moteur :** `is` — Impôt sur les Sociétés — **Art.3-65 + Art.46 (taux) + Art.64 (MFP) + Art.51 (échéances)**  
**Version RuleBase :** `2026.1-audit-P1` — Loi 2025-22 du 08/12/2025 — Source Droit Afrique 392p  
**Statut :** 🟡 **En vérification** → après votre OK passe 🟢 **Verrouillé**

---

## 1) Pourquoi ce moteur est le plus sensible (et comment on convainc)

Le client voit 2 nombres : **son bénéfice** et **son CA**. L'administration compare **IS théorique** vs **plancher MFP** et prend le plus élevé. S'il ne comprend pas le `max`, il crie à l'erreur.

**Notre phrase opposable :**
> « Votre IS 2026 est de **3 000 000 F** car : bénéfice fiscal 10 000 000 F × 30% = 3 000 000 F, supérieur au plancher MFP 80 000 000 F × 1,5% = 1 200 000 F. C'est le plus élevé qui s'applique (Art.46 + Art.64, FEC 82 écritures, fiabilité A). »

**Preuve affichée :** tableau `Base × Taux = Montant` + articles + FEC mapping + version.

---

## 2) Règles CGI 2026 sources (à cocher avec le PDF)

| Règle | Texte exact CGI 2026 | Valeur JSON | Vérif. |
|---|---|---|---|
| **Qui paie ? Art.3** | SA/SAS/SARL/SCS/Coop + morale lucrative + option SNC/GIE | `personnes: "Art.3 : SA/SAS..."` | ☐ |
| **Taux normal Art.46 b)** | 30% bénéfice imposable pour autres que industriel/école | `taux.normal: 0.30` | ☐ |
| **Taux réduit Art.46 a)** | 25% industriel hors extractive + écoles privées | `taux.industriel:0.25 / enseignement:0.25` | ☐ |
| **Assiette bénéfices Art.20-40** | Résultat comptable OHADA + réintégrations − déductions ; intérêts intragroupe plafonnés 30% EBITDA (Art.39 LF2026) | — | ☐ |
| **Produits encaissables Art.47 §2** | Flux financiers effectifs ou susceptibles (exploitation+financier+HAO), hors prod. immobilisée/stockée, transferts, reprises | — | ☐ |
| **MFP Art.64 §1** | 1,5% produits encaissables | `mfp.taux:0.015` | ☐ |
| **MFP BTP Art.64 §2a** | 3% BTP | `mfp.taux_btp:0.03` | ☐ |
| **MFP Immo Art.64 §2b** | 10% société à prépondérance immobilière (Art.101 §2) | `mfp.taux_immo:0.10` | ☐ |
| **Plancher Art.64** | 500 000 F minimum dans tous les cas | `mfp.min:500000` | ☐ |
| **Échéances Art.51** | Acomptes 10/03,10/06,10/09,10/12 + solde 30/04, AIB imputable | `periodicite` | ☐ |

> Si un taux change en LF2027, **seul le JSON bouge** (cf. `RuleBase-README.md`). Le moteur relit la nouvelle valeur, le PDF tamponne la version.

---

## 3) Schéma de calcul (ce que fait le moteur)

```
Données d'entrée (FEC ou Manuel) :
  CA_HT = Σ Credit 70* − Débit 709          ← FEC 70*
  Charges = Σ Débit 60-68
  Bénéfice_fiscal = (Σ Credit 7* − Σ Débit 6*) ± réint/déd  ≈ CA − Charges (si simplifié)
  Secteur = général | btp | immo | import
  Qualité = normal | industriel | enseignement

Étape 1 — Choisir le taux IS :
  taux_IS = secteur industriel ou école ? 0.25 : 0.30   ← RuleBase taux

Étape 2 — IS théorique :
  IS_th = Bénéfice_fiscal × taux_IS

Étape 3 — MFP :
  taux_MFP = immo?0.10 : btp?0.03 : général 0.015       ← RuleBase mfp
  MFP = max(500000, CA_HT × taux_MFP)                  ← RuleBase mfp.min

Étape 4 — IS dû :
  IS_dû = max(IS_th, MFP)

Étape 5 — Échéancier :
  4 acomptes = IS_dû(N-1)×25% aux dates Art.51 ; solde = IS_dû − acomptes ; imputer AIB.
```

**Mapping comptable affiché dans l'UI (fiabilité) :**
- **A (FEC)** : `70*` CA, `6*` charges, `661/664` masse, ONASA OHADA.
- **B (Livre)** : `Recettes − Dépenses` + relevés bancaires.
- **C (Relevés)** : `Banque/MoMo` reconstitué, alerte.

---

## 4) 3 exemples chiffrés opposables (testez dans l'outil)

| Cas | CA HT | Bénéfice | Secteur | IS_th (taux) | MFP (taux) | IS dû | Phrase client |
|---|---|---|---|---|---|---|---|
| **A Bénéficiaire général** | 80M | 10M | général 1,5% / IS 30% | 3,0M | 1,2M | **3,0M** | « IS normal, bénéfice porte l'impôt » |
| **B Déficitaire BTP** | 80M | −2M | BTP 3% / IS 30% | 0 | 2,4M | **2,4M** | « Déficit mais plancher BTP vous rattrape (Art.64) » |
| **C École privée bénéficiaire** | 80M | 10M | école 25% / général 1,5% | 2,5M | 1,2M | **2,5M** | « Taux réduit école validé (Art.46a) » |

→ **À tester** : `workflow/calcul-impots.html` → Dossier → coches `IS` → Étape 2 `Secteur` + CA/Charges → Calculer → tu dois retrouver ces 3 totaux.

---

## 5) Code : plus rien en dur (preuve update-proof)

**Avant (fragile) :**
```js
const mfp = Math.max(500000, ca*0.015);
const isCalc = benefice*0.30;
```

**Après (RuleBase, ce commit) :**
```js
const mIS = ruleBase.moteurs_P1.find(m=>m.id==='is');
const tauxIS = mIS.taux.normal; // ou industriel/enseignement
const mfpP = mIS.mfp;
const tauxMFP = secteur==='btp'? mfpP.taux_btp : secteur==='immo'? mfpP.taux_immo : mfpP.taux;
const mfp = Math.max(mfpP.min, Math.round(ca * tauxMFP));
const isCalc = Math.round(benefice * tauxIS);
const isDu = Math.max(isCalc, mfp);
```

**Effet LF2027** : si `mfp.taux` passe à `0.02` dans le JSON, le calcul sort `1,6M` au lieu de `1,2M` — **sans toucher au JS**. Le PDF affiche `v2027.1 — Art.64 modifié le 08/12/2026`.

---

## 6) Check-list de verrouillage (à cocher ensemble)

- [ ] Art.46 taux 30% / 25% industriel+école confirmé sur PDF p.?? 
- [ ] Art.64 MFP 1,5% / 3% / 10% + min 500k confirmé p.??
- [ ] Art.47 produits encaissables bien compris (excl. prod. immobilisée)
- [ ] 3 exemples ci-dessus recalculés à la main et dans l'outil (écart 0)
- [ ] Mapping FEC `70*/6*/661` testé avec `fec-exemple-benin-2025.txt` (CA 82M)
- [ ] Fallback B/C testé (Livre seul → résultat CA−Charges)
- [ ] Export JSON/PDF affiche `version 2026.1-audit-P1 + Art.46+64`
- [ ] `changelog` du moteur renseigné

**Quand coché → je passe `statut:"verrouille"` dans le JSON + badge 🟢 + `git tag v2026.1-is-locked`.**

---

## 7) Prochain pas

Dis **« IS verrouillé »** si les 3 exemples + articles sont bons → je tague et on attaque **IBA (Étape 1 suite)** avec la même méthode (barème 30/35/40). Sinon dis ce qui cloche (taux, MFP, échéance) et je corrige le JSON en direct.
