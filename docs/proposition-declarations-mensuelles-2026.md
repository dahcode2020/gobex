# Proposition — Moteurs Déclarations Mensuelles CGI 2026
## Workflow Fiscalité → Déclarations mensuelles (TVA, AIB, ITS/VPS, IRCM/IRF…)

**Référence :** CGI Bénin 2026 (moteurs existants 38) + 4 précisions 2026-10-03 (TPS ≤50M, CA constaté FEC, IS/IBA exclusif, comptes État 44* prioritaires)  
**Principe inchangé :** RuleBase JSON seule source, §→paragraphe, offline, traçable Art., #0A2F5E/#FFB81C  
**Date :** 2026-10-14

---

### 1. Constat & objectif

Aujourd’hui `calcul-impots.html` calcule **en annuel** (CA annuel → TPS/IS/IBA/TVA… ) à partir du FEC/balance.  
Vous demandez : **générer les vraies déclarations mensuelles** prévues au CGI 2026, **mois par mois**, avec :

- données **mensuelles** extraites de la balance / FEC / livres,
- fallback **saisie manuelle mensuelle**,
- traçabilité RuleBase + génération PDF/CSV de la déclaration.

> Les déclarations étant mensuelles, les données doivent être mensuelles — extraites de la balance et autres livres, + saisie manuelle possible.

---

### 2. Quelles déclarations mensuelles dans le CGI 2026 ?

| # | Déclaration mensuelle (CGI) | Articles | Échéance | Moteur existant | Mensuel ? | Priorité |
|---|------------------------------|----------|----------|-----------------|-----------|----------|
| **M1** | **TVA** (collectée – déductible, prorata) | Art.223-263, Art.241 18%, Art.248-249 prorata, Art.263 retenue 100/40% | 15 du mois N+1 (10 pour certains) | `tva` | **Oui** | **P1** |
| **M2** | **AIB** (1% import/achat, 3% prestation, 5% sans IFU) | Art.130-134 | 10 N+1, imputation 31/12 | `aib` | Oui | P1 |
| **M3** | **ITS** (barème 0-30% + ORTB 1k mars/3k juin) | Art.119-129 | 10 N+1 (10/m) | `its` | Oui | P1 |
| **M4** | **VPS** (4% / 2% enseignement) | Art.191-195 | 10 N+1 avec ITS | `vps` | Oui | P1 |
| **M5** | **IRCM** (5%/10%/15% dividendes + obligations 6%/3%/0%/5%) | Art.68-93 | 10/m, mois distribution | `ircm` | Oui | P1 |
| **M6** | **IRF / Retenue locative** (12% + 4k ORTB, 10% si IBA/IS) | Art.101-107 | 10/m , 4 acomptes Trésor | `irf` | Oui | P1 |
| **M7** | **Prélèvement 10% prestataires non connus** (définitif) | Art.135-140 | 10 N+1 | `prelev_non_connu` | Oui | P2 |
| **M8** | **Retenue 20% non-résidents** | Art.141-143 | 10 N+1 | `retenue_non_resident` | Oui | P2 |
| **M9** | **Prélèvement hydro 0,30F/L** | Art.144 | 10 N+1 | `prelev_hydro` | Oui | P2 |
| **M10** | **Déclaration mensuelle unique des retenues** (regroupe M2-M9) | Art.134, Art.140, Art.143 | 10 N+1 | *nouveau* | Oui | P2 |
| — | **TPS** acomptes | Art.185 10/02-10/06 + solde 30/04 | *Non mensuel* (2 acomptes) | `tps` | Non | — |
| — | Patente/Licence/TFU/TVM/Sport | Art.196-222 | Annuel | — | Non | — |

**Proposition P1 (MVP mensuel) :** M1-M6 = le cœur mensuel de 80% des dossiers (TVA+AIB+ITS/VPS+IRCM/IRF).  
**P2** : M7-M10 en extension.

> La DGI Bénin utilise une **déclaration mensuelle unique des impôts retenus à la source** (ITS/VPS/AIB/IRCM/IRF…) + une **déclaration TVA mensuelle** séparée. On vise ces 2 formulaires + exports.

---

### 3. Données mensuelles — d’où viennent-elles ?

#### 3.1 Sources prioritaires (ordre = précision 2 : FEC fait foi)

| Source | Format | Clé mensuelle | Extraction mensuelle |
|--------|--------|---------------|----------------------|
| **FEC** | `FEC_IFU_AAAAMMJJ.txt` 18/21 champs `| ou tab` | `DateEcriture` AAAAMMJJ → `MM` | `Σ Mois M : CA = Σ Crédit 70* (701-709) – Débit 709`, Achats 60*, Salaires 64*/661*, 441 IS, **443 TVA collectée**, **445 TVA déd.**, **447 retenues**, 76* IRCM, 75* loyers, **44* État** |
| **Balance mensuelle** | CSV `Compte, Solde, Période` | `Période` ou `Date` | `Solde 70*`, `Solde 443/445/447/441`, `64*` |
| **Facturier MECeF** | CSV `Date, HT, TVA_18, TTC` | `Date` | `CA HT Σ HT`, `TVA collectée Σ TVA_18` |
| **Livre paie** | CSV `Matricule, Brut` | `Mois` | `Σ ITS/VPS par brut` |
| **Livre recettes-dépenses** | CSV | `Date` | `CA Mensuel` |
| **Saisie manuelle** | Formulaire mois → valeurs | `Mois` | Override si pas de FEC |

**Principe 2026-10-03 (4) :** on porte une attention particulière aux **comptes État 44***/`443`/`445`/`447`/`441`/`442`/`448` : leur mouvement mensuel **confirme en priorité** l’impôt dû (même sans mot-clé). Ex : `443` présent en M → TVA due ; `4471` → ITS.

#### 3.2 Agrégation mensuelle

- FEC → groupBy `YYYYMM = DateEcriture.substr(0,6)` ou `DatePiece`.
- Balance → si balance annuelle, on ne peut pas déduire le mensuel → on bascule en **mode manuel mensuel** (tableau 12 mois éditable).
- On stocke : `dataSources.mensuel = { "2026-01": {ca, achats, salaires, tva_collectee: Σ443, tva_deductible: Σ445, aib: Σ60*×taux, its_base: Σ64*, ircm: Σ76*, irf: Σ75*}, ... }`
- **Traçabilité :** chaque cellule mensuelle garde `source: FEC ligne 123 + 70*` ou `manuel`.

#### 3.3 Précisions déjà intégrées (réutilisées)

- **(1) TPS ≤50M → non assujetti TVA** : en mensuel, si `Σ CA Jan→M ≤50M` et régime TPS, on ne génère pas de TVA mensuelle (grisée, badge *Non assujetti Art.223*).
- **(2) CA constaté FEC prime** : le mensuel retient le FEC, alerte si `CA dossier mensuel ≠ CA FEC mensuel`.
- **(3) IS/IBA exclusif** : un mois donné, pas IS+IBA pour la même entité ; société IS → associés IBA perso (note sur déclaration IRCM/IBA).
- **(4) 44* prioritaire** : si `44*` mouvementé le mois, on booste la proposition de la déclaration correspondante (ex : `447` → ITS/VPS).

---

### 4. Architecture proposée — moteurs mensuels

#### 4.1 RuleBase : extension sans hardcode

Actuel : `docs/moteurs-calcul-2026.json` → `moteurs_P1` (IS/IBA/TPS/TVA…) + `moteurs_P2` (autres).  
Proposé : ajouter **`declarations_mensuelles`** (ou `moteurs_MENSUELS`) :

```json
{
  "version": "2026.29.0-Mensuel",
  "declarations_mensuelles": [
    {
      "id": "decl_tva_mensuelle",
      "libelle": "Déclaration TVA mensuelle",
      "periodicite": "mensuelle",
      "echeance": "15 N+1 (10 si retenue)",
      "article": "Art.223-263 + Art.241 18% + Art.248 prorata",
      "base": "Mois M : CA_taxable_HT, CA_total_HT, TVA_collectee (443), TVA_achats (445), exclusions Art.247",
      "formule": "TVA_due_M = TVA_collectee_M – TVA_deductible_M×prorata_M ; prorata_M = ceil((CA_taxable+export)/CA_total×100)",
      "sources": ["FEC 443/445/70*", "MECeF", "balance 443/445"],
      "champs_mensuels": ["ca_total", "ca_taxable", "tva_collectee", "tva_achats", "exclusions"],
      "sortie": "PDF déclaration TVA + CSV"
    },
    { "id": "decl_aib_mensuelle", "article": "Art.130-134", "formule": "AIB_M = Σ achats/imports_M × taux (1%/3%/5%) ..." },
    { "id": "decl_its_vps_mensuelle", "article": "Art.119-129 + Art.191-195", "formule": "ITS_M = Σ barème par salarié (Art.125) + ORTB ; VPS_M = base_ITS×4%/2%" },
    { "id": "decl_ircm_mensuelle", "article": "Art.68-93", ... },
    { "id": "decl_irf_mensuelle", "article": "Art.101-107", ... },
    { "id": "decl_retenues_mensuelle", "article": "Art.130-144 groupé", ... }
  ]
}
```

Avantages : pas de hardcode, LF future → maj JSON + `#embeddedMoteurs`.

#### 4.2 Réutilisation moteurs annuels → déclinaison mensuelle

- **TVA** : on garde le moteur `tva` (formule prorata) mais on l’appelle **12×** avec `ca_total_M`, `tva_achats_M`. Le moteur reste inchangé, seule la boucle mensuelle change.
- **AIB** : `aib` idem, par mois.
- **ITS/VPS** : `its` + `vps` par mois (livre paie mensuel).
- **IRCM/IRF** : idem.

→ Pas de duplication de logique, juste un **wrapper mensuel** qui alimente les moteurs existants.

#### 4.3 Flux

```
[FEC / Balance / MECeF / Paie] ── parseFECMensuel() ─→ dataSources.mensuel[YYYY-MM] {ca, 443, 445, 447...}
                                      │
                                      ├─→ [Table mensuelle 12 mois] ←→ Saisie manuelle (override)
                                      │
              ┌───────────────────────┴───────────────────────┐
              │  Pour chaque mois M et chaque déclaration D  │
              │  moteur = RuleBase.declarations_mensuelles[D]│
              │  montant = moteur.formule(mensuel[M])        │
              └───────────────────────┬───────────────────────┘
                                      │
                         [Déclaration M] PDF + CSV + traçabilité Art.
```

#### 4.4 Stockage

- `localStorage.gobex_mensuel_{dossierId}_{YYYY}` → `{ "2026-01": {...}, "2026-02": {...} }`
- `dataSources.mensuel` en mémoire, synchro avec `gobex_exec_dossiers`.

---

### 5. UI / Workflow — proposition

#### 5.1 Nouveau bloc dans `workflow/calcul-impots.html` (ou dédié `workflow/declarations-mensuelles.html`)

**Emplacement :** après `Étape 2 Sources`, nouvelle **Étape 2bis : Déclarations mensuelles** (ou onglet mensuel).

**Wireframe :**

```
[ Mois : ‹ 2026-01 › ▼ 2026-02 ... 2026-12 ]  [Importer balance mensuelle]  [Importer FEC mensuel]  [Saisie manuelle]

┌─────────────────────────────────────────────────────────────────────────┐
│ CA constaté mensuel (FEC 70*) fait foi — 44* État prioritaire          │
│ Jan: CA 4,2M (FEC) • 443 756k • 447 89k • ITS base 1,1M                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Déclaration     │ Statut   │ Base M   │ Montant  │ Échéance │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ TVA (Art.241)   │ ● À faire│  CA 3,8M │  412k    │ 15/02    │
│ AIB (Art.130)   │ ○ Non dû │  1,2M    │   12k    │ 10/02    │
│ ITS+VPS         │ ● À faire│ 1,1M     │  98k+44k │ 10/02    │
│ IRCM            │ ○ —      │   0      │    0     │ —        │
└─────────────────┴──────────┴──────────┴──────────┴──────────┘

[ Voir détail TVA → prorata 87% ]  [ Générer PDF déclaration Jan ]  [ Export CSV annuel ]

Tableau 12 mois éditable (fallback manuel) :
Mois | CA HT | Achats HT | Salaires | TVA coll. (443) | TVA déd. (445) | AIB | ITS base | IRCM | IRF | [Verrouiller]
```

**Détail TVA mensuelle** (existant `updateTvaProrata` adapté en mensuel)

**Génération :** `genererDeclarationMensuelle(mois, id)` → `fiche-declaration` HTML → `imprimer`/`html2pdf` (déjà présent pour fiche calcul).

#### 5.2 Saisie manuelle

- Table 12 lignes, colonnes : `CA HT`, `CA taxable`, `TVA achats`, `Achats avec/sans IFU`, `Salaires bruts`, `Nb salariés`, `Dividendes`, `Loyers`.
- Chaque cellule = `input number` avec `oninput → recalcul mensuel`.
- Si FEC mensuel présent, cellule **pré-remplie + badge FEC** et grisée (éditable en override avec alerte *écart FEC*).

#### 5.3 Détection auto mensuelle (réutilise `analyserComptaPourMoteurs` mais par mois)

- Pour chaque mois, on lance `analyserComptaPourMoteurMensuel(mois)` : si `443` présent → TVA mensuelle `fort`, si `447` → ITS/VPS, etc.
- En TPS (`isRegimeTPS` annuel), on grise TVA mensuelle toute l’année.

#### 5.4 Exports

- **PDF déclaration mensuelle** (1 mois, 1 impôt) : entête GOBEX, période, base, formule Art., montant, traçabilité.
- **CSV récap annuel** : 12 lignes × montants, pour compta/dépôt DGI.
- **JSON RuleBase** : traçable.

---

### 6. Plan d’implémentation proposé

| Étape | Livrable | Détail | Charge |
|-------|----------|--------|--------|
| **0** | Validation proposition | Vous validez P1 (M1-M6) + P2 optionnel | — |
| **1** | RuleBase `declarations_mensuelles` | Ajout 6 moteurs mensuels dans `moteurs-calcul-2026.json` + `#embeddedMoteurs` | 0,5j |
| **2** | Parser mensuel | `parseFECMensuel(txt)` → groupBy `YYYY-MM`, `parseBalanceMensuel`, `dataSources.mensuel` | 1j |
| **3** | Table mensuelle 12 mois + saisie manuelle | HTML + `renderMensuelTable()` + `syncMensuel()` | 1j |
| **4** | Wrapper moteurs mensuels | `calculerMensuel(mois, id)` qui appelle moteurs existants avec données M | 1j |
| **5** | UI Déclarations mensuelles | `renderDeclarationsMensuelles()`, badges statut, prorata mensuel, AIB/ITS/IRCM mensuels | 1,5j |
| **6** | Génération PDF/CSV | `genererDeclarationMensuelle()` + `telechargerMensuelPDF()` (réutilise `html2pdf`) | 1j |
| **7** | Tests FEC réel | Avec `FEC_2024_GOBEX` → 12 mois, CA 32M/45M/60M/80M, vérif TPS/TVA mensuelle | 0,5j |

**Total MVP P1 ≈ 6-7 jours**, P2 + 2j.

---

### 7. Questions pour vous avant de démarrer

1. **Périmètre MVP** : on démarre par **TVA + AIB + ITS/VPS** (les 3 plus critiques) ou directement **M1-M6** ?
2. **Source mensuelle principale** : vos balances sont-elles **déjà mensuelles** (1 fichier/mois) ou une **balance annuelle** qu’on doit découper via FEC ? Faut-il gérer les 2 ?
3. **Formulaire DGI** : souhaitez-vous qu’on reproduise le **formulaire officiel Bénin** (téléchargeable) ou une **fiche GOBEX** traçable suffit pour dépôt ?
4. **Déclaration unique** : faut-il aussi générer la **déclaration mensuelle unique des retenues** (regroupe ITS/VPS/AIB/IRCM en 1 PDF) ?
5. **Multidossier** : les déclarations sont-elles par **dossier/client** (on l’a) et par **exercice** (2026) ?

---

### 8. Ce qui ne change pas

- Offline, RuleBase seule source, `§→paragraphe` avec infobulle.
- 4 précisions 2026-10-03 conservées et réappliquées en mensuel (seuil 50M, CA FEC, IS/IBA exclusif + associés, 44* prioritaire).
- Couleurs #0A2F5E/#FFB81C, intégration `bibliotheque-chat.js` (le chat pourra aussi répondre *« TVA de janvier ? »* avec CA mensuel).

---

**Prochaine étape :** dites-moi si ce périmètre vous convient (et vos réponses aux 5 questions), je lance l’implémentation du MVP mensuel directement dans `workflow/calcul-impots.html` (ou `workflow/declarations-mensuelles.html` selon votre préférence).

