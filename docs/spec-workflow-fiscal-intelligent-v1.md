# Spécification — Workflow Intelligent Fiscalité Bénin (CGI versionné)

**Version : 1.0 — 2026-09-27**
**Auteur : Architecte logiciel fiscalité béninoise — Cabinet GOBEX**
**Référence : Code Général des Impôts Bénin 2026 (Loi 2021-15 + Loi 2025-22) + docs `analyse-cgi-2026-workflow-fiscalite.md` + `cgibenin-2026.json` v2026.1**
**Principe cardinal : AUCUNE règle fiscale codée en dur. Toute valeur (taux, seuil, échéance) lue depuis une base de règles versionnée par année, traçable à un article CGI.**

---

## 0. Glossaire & principes

| Terme | Définition |
|-------|------------|
| **CGI** | Code Général des Impôts du Bénin (Loi 2021-15, mise à jour Loi de finances N°2025-22) |
| **RuleBase** | Base JSON versionnée `cgi-YYYY.json` (ex: `cgi-2026.json`) contenant barèmes, seuils, taux, obligations, pénalités, échéanciers |
| **Dossier** | `gobex_exec_dossiers` — 1 client + 1..N préoccupations + workflowFiscalite |
| **Fiche Client** | `gobex_crm_clients` + fiche exhaustive (IFU, RCCM, régime, activité, effectif, statut existence) |
| **Moteur** | Fonctions pures `evaluer(dossier, fiche, rules) → {échéanciers, diagnostics, décisions}` sans `if (taux===0.30)` en dur |
| **Traçabilité** | Chaque sortie porte `input → ruleId → article CGI → année LF → résultat` |

**Stack cible :** Frontend PWA (Bootstrap + vanilla JS) + `localStorage` (ou IndexedDB) pour démo, évolutif vers API REST + PostgreSQL + `rules` table versionnée. Auth `gobex_admin_auth` + `gobex_workflow_access`.

---

## 1. Architecture globale

```
[Fiche Client + Dossier] ─┐
                          ├─► ÉTAPE 1 Qualification ─► Fiche qualifiée + alertes
                          │         │
                    ┌─────┘         ▼
                    │         ÉTAPE 2 Chargement RuleBase (cgi-YYYY.json)
                    │               │
                    │         ┌─────┴─────┐
                    │         │  Moteur   │
[RuleBase v2026] ───┘         │  Règles   │──► ÉTAPE 3 Échéanciers (Général DGI + Spécifique) ─► Confrontation
                              └───────────┘──► ÉTAPE 4 Diagnostic & Recommandations
                                              └──► ÉTAPE 5 Sortie traçable (Audit JSON)
```

**Invariant :** Le moteur ne contient **aucun littéral fiscal**. Ex. interdit : `if (ca > 50000000) tva=true`. Autorisé : `if (ca > rules.seuils.tva_assujettissement) tva=true` où `50000000` vient de `rules.seuils.tva_assujettissement` (Art.223).

---

## 2. Modèle de données (entrée)

### 2.1 Fiche Client (requise Étape 1)

```json
{
  "id": "CL-2026-001",
  "name": "ETS La Grâce",
  "ifu": "3201501234567",          // Art.460 — obligatoire
  "rccm": "RB/COT/20A1234",
  "typeEntite": "pm",               // enum: pp | pm | ong | ep | giei | snc
  "formeJuridique": "SARL",
  "typeActivite": "general",        // enum: general | industriel | btp | immobilier | station_service | commerce_general | prestation_service | agricole
  "regimeFiscal": "reel_normal",    // enum: entreprenant | tps | reel_simplifie | reel_normal | null (à qualifier)
  "regimeParDefaut": null,          // calculé Étape 1.4
  "caAnnuel": 127000000,            // pour seuil TVA 50M (Art.223) + TPS 20M/50M (Art.1084-18)
  "caPrevisionnel": null,           // si nouvelle entreprise
  "effectifSalarie": 3,             // pour ITS (Art.119) + VPS (Art.191)
  "dateCreation": "2024-03-15",
  "dateImmatriculationIFU": "2024-03-20",
  "statutExistence": null,          // Cas A | B | C — déterminé Étape 1.5
  "connuDGI": null,                 // boolean — si false → Cas C
  "beneficiairesEffectifs": [],     // Art.462
  "mecf": true,                     // Art.217 bis
  "adresse": "Godomey, Abomey-Calavi",
  "completeness": { "score": 0, "casesVides": [] }
}
```

**Champs à fort impact fiscal/comptable (Étape 1.2) :**
| Champ vide | Impact CGI | Article | Risque si non renseigné |
|------------|------------|---------|--------------------------|
| `ifu` | Immatriculation 30j, AIB 5% si absent | Art.460, Art.135 | Cas C → factures +5% |
| `typeEntite` | IS (Art.3-4) vs IBA (Art.54) | 3,4,54 | Mauvais taux 30% vs barème |
| `typeActivite` | IMF taux différencié 1,5% / 3% BTP / 10% immo | Art.64 | MFP sous-évalué |
| `regimeFiscal` | TVA, TPS, MECeF, télédeclaration | 1084-18, 223, 256 bis | Échéances fausses |
| `caAnnuel` | Seuil TVA 50M, TPS 20M | 223, 1084-18 | Assujettissement faux |
| `effectifSalarie` | ITS/VPS dûs, exonération 2 ans | 119,192-6 | Omission VPS |
| `connuDGI` | AIB 5% définitif | 135-140 | Alerte manquée |

### 2.2 Dossier

```json
{
  "id": "DOS-2026-034",
  "clientId": "CL-2026-001",
  "dateReception": "2026-09-20",
  "preoccupations": [{"titre":"Déclaration TVA Août 2026", "domaine":"Fiscalité"}],
  "echeanceProposee": null,
  "workflowFiscalite": { "etape": 0, "pistes": [], "echeanciers": {}, "diagnostic": {} }
}
```

### 2.3 RuleBase (Étape 2)

Schéma `docs/cgibenin-2026.json` v2026.1 (extrait) :
```json
{
  "version": "2026.1",
  "annee": 2026,
  "loiFinances": "2025-22 du 08/12/2025",
  "seuils": { "tva_assujettissement": 50000000, "tps_micro_max": 20000000, "tps_petite_max": 50000000, "mfp_taux": 0.015, "mfp_min": 500000 },
  "taux": { "is": 0.30, "is_enseignement": 0.25, "tva": 0.18, "aib_avec_ifu": 0.03, "aib_sans_ifu": 0.05, "vps": 0.04, "loyer": 0.12 },
  "echeanciers": {
    "tva_mensuel": { "jour": 10, "mois_suivant": true, "article": "Art.249 bis" },
    "is_acomptes": { "dates": ["03-10","06-10","09-10","12-10"], "article": "Art.51 / 1120" },
    "tps": { "acomptes": ["02-10","06-10"], "solde": "04-30", "article": "Art.1084-33 / FAQ DGI" }
  },
  "obligations": [ { "id":"ifu_460", "article":"Art.460", "delai":"30j", "sanction":"Art.495" } ],
  "regimes": { "reel_normal": { "teledeclaration_obligatoire": true, "mecf_obligatoire": true } }
}
```

**Chargement :** `fetch('/rules/cgi-' + annee + '.json')` ou `localStorage.getItem('gobex_cgi_' + annee)`. Aucun fallback en dur.

---

## 3. ÉTAPE 1 — Choix et qualification du dossier

### Entrée
`dossierId` sélectionné dans liste (grille Réception ou Workflow Fiscalité).

### Actions système

#### 1.1 Afficher infos utiles (lecture seule)

**UI :** Panneau haut (fiche résumé) :
- Client : nom, IFU, RCCM, régime, typeEntite, typeActivite, CA, effectif, statutExistence (badge couleur)
- Dossier : ref, date, préoccupations, échéance dossier, avancement workflow
- **Badges CGI dynamiques** : ex. `TVA 18% Assujetti (Art.223, CA 127M > 50M)` ou `TPS (CA 28M < 50M)`

**Données lues :** `getDossier() + getClient()` depuis RuleBase-via-fiche.

#### 1.2 Cases vides à fort impact (diagnostic complétude)

**Algorithme (aucune valeur en dur) :**
```
score = 0; casesVides = []
pour chaque champ critique dans rules.obligations_de_qualification:
  si fiche[champ] est vide/null:
    impact = rules.criticite[champ] // ex: ifu → "bloquant", ca → "majeur"
    casesVides.push({champ, impact, article: rules.champs[champ].article})
    score -= poids
sinon score += poids
fiche.completeness = {score, casesVides}
```

**UI :** Liste rouge `Champs à compléter (fort impact) :`
- Ex. `IFU vide → bloquant — AIB 5% si non connu DGI (Art.460 + Art.135) — [Remplir]`
- Bouton `Compléter fiche` → ouvre `crm-client-form.html` avec focus champ.

**Références CGI :** Art.460 (IFU), Art.3-4/54 (typeEntite), Art.64 (typeActivite → MFP), Art.223 (CA seuil TVA), Art.1084-18 (CA TPS), Art.119/191 (effectif).

#### 1.3 Complément d'information (diagnostic exhaustif)

**UI :** Formulaire dynamique généré depuis `rules.questions_complementaires` :

| Question générée | Condition RuleBase | Article |
|------------------|--------------------|---------|
| Chiffre d'affaires prévisionnel N ? | si `statutExistence == Cas A` | Art.1084-41 |
| Connu au fichier DGI ? (oui/non) | toujours demandé si `ifu` vide | Art.135 |
| Activité mixte (négoce + autre) ? | si `typeActivite==commerce_general` | Art.1084 |
| Marché public >50M en cours ? | si `ca > rules.seuils.marche_public` | Art.248 bis |
| Importations prévues ? | toujours | Art.130 |
| Bénéficiaires effectifs déclarés ? | si `typeEntite==pm` | Art.462 |

Le système **ne pose que les questions pertinentes** selon RuleBase.

#### 1.4 Vérifier & qualifier les attributs déterminants

| Attribut | Règle de qualification (lue depuis RuleBase) | Sortie |
|----------|-----------------------------------------------|--------|
| **Régime fiscal par défaut** | `si caAnnuel <= rules.seuils.tps_micro_max (20M) → micro (TPS 2%) ; si <= rules.seuils.tps_petite_max (50M) → petite (TPS 5%) ; sinon si typeActivite==btp/immo → reel_normal avec MFP 3%/10% (Art.64) ; sinon reel_normal` | `regimeParDefaut` |
| **Type entité** | `si formeJuridique in [SARL, SA] → pm (IS Art.4) ; si PP → pp (IBA Art.54) ; si association/ONG → ong` | `typeEntiteQualifie` |
| **Type activité** | Normalisé via `rules.activites` (codes) | `typeActiviteQualifie` |
| **Effectif salarié** | `si effectif >0 → ITS/VPS dus (Art.119/191) ; si effectif==0 → non` | `itsVpsDus` |

**Traçabilité :** chaque qualification logge `input: ca=28M, rule: seuils.tps_petite_max=50M, article: Art.1084-18, result: TPS`.

#### 1.5 Statut d'existence (Cas A/B/C)

```
si dateCreation > now - 12 mois ET dateImmatriculationIFU != null:
  statut = Cas A (Nouvelle, IFU)
sinon si connuDGI == true:
  statut = Cas B (Ancienne connue)
sinon si connuDGI == false:
  statut = Cas C (Ancienne non connue)
  alerte = {
    niveau: "critique",
    message: "Entreprise ancienne non connue du fichier DGI — AIB 5% définitif sur toutes factures (Art.135-140) prélevé automatiquement via MECeF/DGI. Notifier client.",
    action: "Notifier client (Email + WhatsApp wa.me/22997739046) + Activer prélèvement 5% dans facturation normalisée.",
    reference: "CGI Art.135-140 / Art.171"
  }
```

**UI Cas C :** Bandeau rouge `⚠️ Alerte CGI Art.135 — AIB 5% définitif` + bouton `Notifier client` (mailto + wa.me) + toggle `Activer AIB 5% auto` (met `dossier.aib_taux = rules.taux.aib_sans_ifu`).

### Sortie Étape 1

```json
{
  "ficheQualifiee": { /* fiche + regimeParDefaut + itsVpsDus */ },
  "completeness": { "score": 72, "casesVides": [{ "champ":"typeActivite", "impact":"majeur", "article":"Art.64"}] },
  "complementsDemandes": [ { "question":"Marché >50M ?", "valeur": true } ],
  "alerte": { "cas":"C", "aib_5": true, "notified": false, "article":"Art.135" },
  "trace": [ { "input":"ca=28M", "rule":"seuils.tps_petite_max", "article":"Art.1084-18", "annee":2026, "result":"TPS" } ]
}
```

---

## 4. ÉTAPE 2 — Chargement de la base de règles fiscales

### Principe non négociable
**Aucune valeur fiscale en dur dans le code.** Toute constante fiscale est une clé RuleBase.

**Anti-pattern interdit :**
```js
// INTERDIT
if (ca > 50000000) tva = true; // 50M en dur
if (tauxIS = 0.30) // 0.30 en dur
```

**Pattern exigé :**
```js
// AUTORISÉ
const seuilTVA = rules.seuils.tva_assujettissement; // Art.223
if (ca > seuilTVA) tva = true; // traçable
```

### Chargement versionné

1. **Déterminer année** : `annee = dossier.dateReception.getFullYear() || 2026` (ou `fiche.anneeFiscale`)
2. **Fetcher** : `GET /rules/cgi-${annee}.json` (fallback `localStorage` + cache IndexedDB)
3. **Valider schéma** : JSON Schema (ajTV) — si échec → bloquer workflow, log erreur
4. **Mettre en cache** : `localStorage.setItem('gobex_cgi_' + annee, JSON.stringify(rules))`

**Fichiers :** `docs/cgibenin-2026.json` (v2026.1), `docs/cgibenin-2025.json`, etc. Chaque fichier porte `version`, `annee`, `loiFinances`, `articles`.

### Contenu RuleBase (extrait complet voir `cgibenin-2026.json`)

| Catégorie | Clés | Exemple |
|-----------|------|---------|
| Barèmes | `taux.is`, `taux.tva`, `taux.aib_*`, `bareme.its` | `taux.is: 0.30` (Art.63) |
| Seuils/planchers | `seuils.tva_assujettissement`, `mfp_min` | `mfp_min: 500000` (Art.64) |
| Taux par régime/activité | `regimes.reel_normal.teledeclaration`, `activites.btp.mfp` | `btp.mfp: 0.03` |
| Obligations déclaratives | `obligations[]` avec `id, article, echeance, regime` | `ifu_460: {delai:30j, sanction:Art.495}` |
| Pénalités | `penalites.retard_tva: 10%` | Art.506 |
| Échéanciers | `echeanciers.tva_mensuel.jour: 10` | Art.249 bis |

**Traçabilité :** chaque règle porte `article` + `annee`. Ex : `{ "id":"mfp_taux", "valeur":0.015, "article":"Art.64", "annee":2026, "loi":"2025-22" }`.

---

## 5. ÉTAPE 3 — Génération des échéanciers automatiques

### 3.1 Échéancier général DGI

**Source :** `rules.echeanciers` + `rules.obligations` pour l'année.

**Génération :**
```
echeancierGeneral = []
pour chaque obligation dans rules.obligations:
  si obligation.regime == null ou obligation.regime == fiche.regime:
    echeance = calculerDate(obligation.echeance) // "10 du mois suivant" → 10/MM+1/YYYY
    echeancierGeneral.push({
      id: obligation.id, // ex: tva_mensuelle
      libelle: obligation.libelle,
      date: echeance,
      article: obligation.article,
      source: "CGI " + obligation.article + " / LF " + rules.loiFinances,
      type: obligation.type // declaration | acompte | paiement
    })
```

**Ex. 2026 :** TVA mensuelle 10/mois (Art.249 bis), IS acomptes 10/03,10/06,10/09,10/12 + 30/04 (Art.51/1120), TPS 10/02 + 10/06 + 30/04 (FAQ DGI), ITS/VPS 10/mois (Art.129/191).

**Sortie :** Calendrier national complet, **toujours généré**, même si fiche incomplète.

### 3.2 Échéancier spécifique au dossier

**Filtre :** ne garde que les obligations pertinentes au dossier.

```
echeancierSpecifique = echeancierGeneral.filter(o => {
  // Filtre régime
  if (o.regime && o.regime != fiche.regime) return false
  // Filtre entité
  if (o.entite && o.entite != fiche.typeEntite) return false
  // Filtre activité (BTP 3%, immo 10%)
  if (o.activite && !fiche.typeActivite.includes(o.activite)) return false
  // Filtre effectif (ITS/VPS seulement si effectif>0)
  if (o.id.includes('its') && fiche.effectifSalarie==0) return false
  // Filtre Cas C : si Cas C, ajoute obligation AIB 5% définitif
  if (o.id=='aib_5_definitif' && fiche.statutExistence!='C') return false
  // Filtre CA seuil TVA
  if (o.id=='tva' && fiche.caAnnuel < rules.seuils.tva_assujettissement) return false
  // Filtre TPS vs Réel
  if (o.id=='tps' && fiche.regime!='tps') return false
  return true
}).map(o => ({
  ...o,
  personnalise: true,
  baseSur: fiche // pour traçabilité
}))
```

**Cas A (nouvelle) :** si `statut==A`, échéance TPS = dernier jour du mois suivant création (Art.1084-41) + régularisation 30/04 N+1, pas d'historique.

**Cas C (ancienne non connue) :** ajoute `aib_5_definitif` avec échéance 10/mois sur toutes factures normalisées.

### 3.3 Confrontation

```
confrontation = {
  communs: intersection(General, Specifique) // par id
  specifiquesSeuls: Specifique - General // obligations propres au dossier
  generauxManquants: General - Specifique // normales mais non dues (ex: TVA si CA<50M)
  ecarts: []
}
pour chaque echeanceSpecifique:
  echeanceGenerale = find(General, id)
  si dates diffèrent:
    ecarts.push({ id, dateGenerale, dateSpecifique, justification: rule.article })
pour chaque echeanceSpecifique:
  si date < today et non payée:
    retard = { id, joursRetard, penalite: rules.penalites.retard_tva } // Art.506
```

**UI :** Tableau 3 colonnes : `Général DGI | Spécifique Dossier | Écart (justifié Art.)` + badges `Manquante` (rouge), `En retard` (orange), `OK` (vert). Chaque ligne affiche `Art.XXX` cliquable vers DGI.

**Sortie Étape 3 :**
```json
{
  "echeancierGeneral": [ { "id":"tva", "date":"2026-02-10", "article":"Art.249 bis", "source":"LF 2025-22" } ],
  "echeancierSpecifique": [ { "id":"tva", "date":"2026-02-10", "article":"Art.249 bis", "personnalise": true } ],
  "confrontation": { "ecarts": [], "retards": [{ "id":"tps", "jours": 15, "penalite":"10% Art.506" }] }
}
```

---

## 6. ÉTAPE 4 — Diagnostic et recommandations

### Structure rapport (généré par moteur, pas en dur)

```json
{
  "obligationsIdentifiees": [
    { "id":"tva", "libelle":"TVA mensuelle 18%", "due": true, "article":"Art.223/249 bis", "echeance":"10 du mois suivant" },
    { "id":"aib_5", "libelle":"AIB 5% définitif (non connu DGI)", "due": true, "article":"Art.135", "risque":"Cas C" }
  ],
  "risquesDetectes": [
    { "niveau":"critique", "titre":"Non-immatriculation IFU", "detail":"IFU vide depuis 45j >30j", "article":"Art.460+495", "penalite":"100k→200k" },
    { "niveau":"majeur", "titre":"IMF applicable", "detail":"BTP CA 80M → MFP 3% (Art.64)", "article":"Art.64" }
  ],
  "actionsRecommandees": [
    { "priorite":1, "action":"Immatriculer IFU sous 30j", "echeance":"2026-10-27", "article":"Art.460", "responsable":"Secrétariat" },
    { "priorite":1, "action":"Activer AIB 5% sur facturation normalisée", "echeance":"immédiat", "article":"Art.135", "responsable":"Système MECeF" },
    { "priorite":2, "action":"Déposer TVA août avant 10/09", "echeance":"2026-09-10", "article":"Art.249 bis" }
  ],
  "referencesCGI": ["Art.460","Art.135","Art.64","Art.223","Art.1084-18"]
}
```

**Priorisation :** `priorite 1 = bloquant (sanction pécuniaire / rejet DGI)`, `2 = mensuel`, `3 = annuel`.

---

## 7. ÉTAPE 5 — Sortie et traçabilité (audit)

Chaque décision porte un **bloc audit JSON** stocké dans `dossier.auditTrail` :

```json
{
  "decisionId": "qualif_regime_001",
  "input": { "caAnnuel": 28000000, "typeActivite":"general" },
  "rule": { "id":"seuils.tps_petite_max", "valeur":50000000, "article":"Art.1084-18", "annee":2026, "loi":"2025-22" },
  "evaluation": "28000000 <= 50000000 → true",
  "result": { "regime":"tps", "taux":0.05 },
  "timestamp": "2026-09-27T14:00:00Z",
  "acteur": "Moteur CGI"
}
```

**Stockage :** `dossier.workflowFiscalite.trace[]` + `localStorage` + export `audit-YYYY-MM-DD.json`.

**UI :** Bouton `Voir traçabilité` dans modal détail → timeline `Input → Règle Art.XXX (2026) → Résultat`.

**Garantie :** Aucune décision sans `article` + `annee`. Test unitaire : `assert(decision.rule.article != null)`.

---

## 8. Implémentation technique (ex. GOBEX)

| Couche | Choix | Détail |
|--------|-------|--------|
| **RuleBase** | `docs/cgibenin-2026.json` + version `gobex_cgi_2026` localStorage | Schéma JSON Schema, version `2026.1`, champs `article` obligatoire |
| **Moteur** | Fonctions pures JS (pas de `if` fiscal en dur) | `evaluerQualification()`, `genererEcheanciers()`, `confronter()`, `diagnostiquer()` |
| **UI** | `workflow-fiscalite.html` configurateur 3 colonnes | Lit RuleBase, génère rail adaptatif, cartes multi-pistes, checklist Art. |
| **Stockage** | `gobex_exec_dossiers`, `gobex_crm_clients`, `gobex_cgi_config` | IndexedDB prévue pour volumétrie |
| **Auth** | `gobex_admin_auth` + `gobex_workflow_access` | Seul admin édite RuleBase |
| **Tests** | Jest — 1 test par article | Ex: `test Art.460 IFU 30j` |

**Flux code (pseudo) :**
```js
const rules = await chargerRuleBase(2026); // fetch + validate
const ficheQualifiee = qualifierFiche(fiche, rules); // Étape 1
const {general, specifique} = genererEcheanciers(ficheQualifiee, rules); // Étape 3
const confrontation = confronter(general, specifique);
const rapport = diagnostiquer(ficheQualifiee, confrontation, rules); // Étape 4
enregistrerTrace(dossier, {ficheQualifiee, general, specifique, rapport}); // Étape 5
```

---

## 9. Exemple de bout en bout (Cas C)

**Entrée :** ETS BTP, PM, CA 80M, créée 2019, IFU vide, non connue DGI, 5 employés.

**Étape 1 :** `casesVides=[IFU]` → alerte Cas C → `AIB 5%` + `IMF BTP 3% (Art.64)` → statut C.

**Étape 2 :** `rules.taux.aib_sans_ifu=0.05` (Art.135).

**Étape 3 :** Général = TVA+IS+AIB+ITS/VPS ; Spécifique = TVA (CA>50M) + IS MFP 3% + AIB 5% définitif + ITS/VPS → écart : `AIB 5% définitif` absent du général → justifié Art.135.

**Étape 4 :** Risque critique `AIB 5% sur toutes factures` + `IFU >30j (495)` → actions prio 1 `Notifier client` + `Immatriculer`.

**Étape 5 :** Trace `input: connuDGI=false → rule: aib_sans_ifu=0.05 Art.135 (2026) → result: AIB 5%`.

---

## 10. Livrables & roadmap

- [x] `analyse-cgi-2026-workflow-fiscalite.md` + `cgibenin-2026.json` v2026.1 (déjà livré)
- [x] Configurateur dynamique `workflow-fiscalite.html` (Régime/CA/Pistes/Déclencheurs)
- [ ] **Ce spec → implémenter Étapes 1-5** comme fonctions pures + UI qualification (cases vides, Cas C, alerte AIB 5%)
- [ ] Tests par article (Art.460,135,64,223,1084-18, etc.) + CI
- [ ] Version 2027 : `cgi-2027.json` (Loi finances 2026) sans toucher au code

> **Références CGI systématiques** dans UI (badge `Art.XXX` cliquable DGI) + `docs/cgibenin-2026.json`.

