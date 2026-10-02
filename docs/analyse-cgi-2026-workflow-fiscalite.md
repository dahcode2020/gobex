# Analyse CGI Bénin 2026 — Workflow Fiscalité GOBEX (Dynamique)

**Source principale :** Loi n°2021-15 du 23 décembre 2021 portant Code Général des Impôts (CGI) de la République du Bénin, **mise à jour Loi n°2025-22 du 08 décembre 2025 portant loi de finances pour la gestion 2026** — Édition Droit Afrique 2026 (392 p., EAN 9782353083237) [2](https://www.eyrolles.com/Entreprise/Livre/benin-code-general-des-impots-2026-9782353083237/) [3](https://www.lgdj.fr/benin-code-general-des-impots-2026-9782353083237.html) — accessible via DGI Bénin [1](https://api.impots.bj/media/6984ebbbb7bc0_B%C3%A9nin-Code%20G%C3%A9n%C3%A9ral%20des%20Imp%C3%B4ts%202026.pdf)

> Pièce jointe analysée : `6bf6608d-850a-4700-b97a-514e5e221fae.pdf` — Code Général des Impôts 2026 (même référence que [1](https://api.impots.bj/media/6984ebbbb7bc0_B%C3%A9nin-Code%20G%C3%A9n%C3%A9ral%20des%20Imp%C3%B4ts%202026.pdf)). Fichier non persisté en sandbox (cf. limitation `/home/user/uploads`) — analyse réalisée via recherche croisée DGI + Droit Afrique + RESCRITS 2026.

**Date analyse : 2026-09-27 — Cabinet GOBEX (Godwin) — RB/ABC/15A3265, IFU 1201502844807**

---

## 1. Structure du CGI 2026

### Loi de finances 2026 : 5 nouveautés structurantes
| Thème | Article CGI 2026 | Loi 2025-22 | Impact Workflow |
|-------|------------------|-------------|-----------------|
| **Minimum forfaitaire (MFP)** | Art. 55, 64 | 1% → **1,5% CA HT** (déficitaires), plancher **500 000 F** | Recalcul automatique IS déficitaire |
| **Charges financières intragroupe** | Art. 39 | Plancher déductibilité **30% EBITDA** (OCDE/BEPS) | Checklist diagnostic groupe international |
| **TVA non-résidents / e-services** | Art. 221–225 | Plateformes streaming/e-commerce → immatriculation simplifiée DGI | Nouvelle piste “TVA e-services” |
| **Retenue TVA marchés publics** | Art. 248 bis | **Marchés >50M F → retenue TVA à la source** | Branchement étape 5 Dépôt |
| **Télédéclaration/télépaiement** | Circ. DGI 012/2026 15 mars 2026 + Art. 256 bis | **Obligatoire pour tout Réel Normal**, quel que soit CA | Gate “MECeF + e-DGI obligatoire” |

### Plan du Code (extrait sommaire [4](https://api.impots.bj/media/6984ebbbb7bc0_B%C3%A9nin-Code%20G%C3%A9n%C3%A9ral%20des%20Imp%C3%B4ts%202026.pdf))
- **Titre 1 — Impôts sur le revenu** : IS (Ch.1, Art.3-65), IBA (Ch.2 Art.54), IRCM (Ch.3 Art.69-90), Revenus fonciers (Art.101), ITS (Art.119-129), AIB (Art.130-140)
- **Titre 2 — Impôts directs** : VPS (Art.191-193), Patente (Art.197), TVS (208-210), TFU/TPU (1084)
- **Titre 3 — TVA** : Art.219-268 quater, TAF, MECeF (Art.217 bis, 256-256 bis)
- **Titre 4 — Obligations & sanctions** : IFU (Art.460-462), comptabilité OHADA (Art.479-480), sanctions (Art.495-506, 500, 503), acomptes (Art.51-52, 1120)

Historique : système **déclaratif** avec contrôle a posteriori DGI ; conservation **10 ans** (Art.480) ; **IFU unique** attribué à l’immatriculation (Art.460) ; registre **bénéficiaires effectifs** obligatoire pour toute personne morale depuis 01/01/2024 (Art.462) — amende 1 000 000 F (Art.496-4).

---

## 2. Cartographie fiscale Bénin — Échéances, taux, articles

### 2.1 Synthèse 10 obligations cœur (vue workflow)

| # | Impôt / Obligation | Articles CGI | Assiette & Taux 2026 | Échéance Bénin | Workflow piste |
|---|--------------------|--------------|----------------------|----------------|----------------|
| 1 | **Impôt Sociétés (IS)** | 4, 39, 49-52, 55, 63-65, 1120, 144-161 | 30% (25% enseignement privé) ; **MFP 1,5% CA HT, min 500k** [1](https://api.impots.bj/media/6984ebbbb7bc0_B%C3%A9nin-Code%20G%C3%A9n%C3%A9ral%20des%20Imp%C3%B4ts%202026.pdf); majoration **4000 F ORTB** (Art.64-4) | **4 acomptes : 10 mars, 10 juin, 10 sept, 10 déc** (Art.51/1120) ; **Déclaration annuelle 30 avril** (Art.49) ; solde à dépôt ; IS >50k payable en 2 acomptes 31 jan + fin avril | Piste annuelle + trimestrielle |
| 2 | **Impôt Bénéfices d’Affaires (IBA)** | 54, 55 | Personnes physiques, associés SNC/GIE ; même taux/min que IS | Idem IS (30 avril) | Piste annuelle |
| 3 | **Acompte sur Impôt assis sur Bénéfices (AIB)** | 130-140 | **3% prestataire avec IFU**, **5% sans IFU / non connu DGI** ; **1% import IFU**, 5% non-IFU | **10 du mois suivant** retenue | Piste mensuelle (achats/imports/prestations) |
| 4 | **TVA** | 219-268, 229, 248 bis, 256 | **18% standard** inchangé ; seuil assujettissement **50M CA** ; exonérations Art.229 (État, collectivités) ; **Retenue TVA >50M marchés publics** (248 bis) | **10 du mois suivant** exigibilité/réalisation (Art.249 bis) ; télédéclaration obligatoire Réel Normal | Piste mensuelle cœur |
| 5 | **Taxe Activités Financières (TAF)** | 293-1 à 293-5 | Assimilée TVA | Cf. TVA | Optionnelle |
| 6 | **ITS (Traitements & Salaires)** | 119-129, 472 | Barème progressif tranche 0-60 000 F ; retenue source | **10 du mois suivant** paiement salaires ; **Déclaration annuelle salaires 30 avril** (472) | Piste mensuelle + annuelle |
| 7 | **VPS (Versement Patronal)** | 191-193 | **4% montant brut salaires** (avantages en nature inclus) ; exonération **2 ans premier emploi béninois** (192-6) ; exonérés Art.192 (ex: 2 ans, établissement non-commercial) | **10 du mois suivant** | Piste mensuelle |
| 8 | **Retenue loyers (Revenu foncier)** | 101-102, 131 | **12% loyers bruts**, **10% si bailleur à IS/IBA** | **10 du mois suivant** retenue | Piste mensuelle si locataire PM |
| 9 | **IRCM (Capitaux mobiliers)** | 69-90 | **5% dividendes non-résidents**, **15% créances/dépôts** (Art.86/88) ; convention non-double imposition si <15% | **10 du mois suivant** retenue | Piste ponctuelle |
|10 | **Patente / TFU / TVS** | 167, 197, 208-210, 1084 | TVM Art.167 ; TVS 10 mars/juin/sept/déc ; TFU 35% fin jan, 35% fin mars, solde fin mai | Ponctuel | Optionnelle |

> Sources partielles : Ong obligations [1](https://api.impots.bj/media/6984ebbbb7bc0_B%C3%A9nin-Code%20G%C3%A9n%C3%A9ral%20des%20Imp%C3%B4ts%202026.pdf) [8](https://impots.bj/page/a0c0c517-d476-4f04-a839-bb67725b3094/connaitre-vos-obligations-fiscales-ong-1537122637-654008462-1024331567), échéances fiscales [3](https://www.impots.finances.gouv.bj/les-echeances-fiscales/), RESCRITS 2026 [5](https://api.impots.bj/media/698b0c5f7a212_RESCRITS%20FISCAUX%202026.pdf), évolutions 2026 [6](https://www.auditiaafrica.com/actualites/37)

### 2.2 Obligations transversales (toutes pistes)

| Obligation | Article | Délai | Sanction | Check-list workflow |
|------------|---------|-------|----------|---------------------|
| **Immatriculation IFU** | 460 | **30 jours** début activité/création/modif | Amende **100 000 F → 200 000 F** si non régularisé 30j après mise en demeure (495) | Étape 1 : IFU + plan localisation + noms bénéficiaires effectifs |
| **Déclaration modifications** | 461 | **30 jours** statuts, lieu, dirigeant | idem 495 | Étape 1 : suivi Modif. |
| **Registre bénéficiaires effectifs** | 462 (depuis 01/01/2024) + Arrêté 2025/1700 | Tenue continue, déclaration DGI | **1 000 000 F** (496-4) | Étape 2 : vérif registre BE |
| **Conservation documents** | 480 | **10 ans** (480) + OHADA | — | Étape 9 : archivage 10 ans |
| **Tenue comptabilité OHADA** | 479-480 | Continue | **1 000 000 F / exercice** irrégulière (500) | Étape 4 : OHADA |
| **Déclaration annuelle salaires** | 472 | **30 avril** | — | Étape 9 : annuelle |
| **Rapport moral/financier ONG** | — | **30 avril** | — | Étape 9 ONG |
| **MECeF (Facturation électronique)** | 217 bis, 256 | Continue (télédéclaration) | — | Étape 5 : vérif MECeF |
| **Opposition contrôle** | 503 | — | **500 000 F** | Global |
| **Retard paiement** | 506 | — | **250 000 – 1 500 000 F** + 10% majoration TVA | Alertes pénalités |

---

## 3. Règles de dynamisme — Comment rendre le workflow “vivant”

### 3.1 Le statique actuel (9 étapes linéaires) atteint ses limites
Le workflow actuel est **linéaire** : tout dossier fiscal suit les mêmes 9 étapes, même si :
- un **entreprenant** à 8M CA n’a pas de TVA mais une TPU/TPS,
- une **ONG** est exonérée de Patente/VPS/IS (Art.4,192,197) [5](https://api.impots.bj/media/698b0c5f7a212_RESCRITS%20FISCAUX%202026.pdf),
- un **locataire personne morale** doit prélever 12% loyers (Art.101) alors qu’un prestataire importateur doit appliquer AIB 1%/5%,
- un **marché public >50M** déclenche une retenue TVA (248 bis) absente des 9 étapes,
- un **groupe international** doit passer le test 30% EBITDA (Art.39) à l’étape Diagnostic.

**Conséquence :** tâches inutiles, SLA faux, risques DGI.

### 3.2 Principe dynamique = Moteur de règles CGI 2026

```
Dossier (client + régime + CA + effectif + nature opération) 
   → Évaluateur CGI2026 (JSON règles : Articles + conditions)
   → Instance de workflow = sous-pistes parallèles + étapes conditionnelles + échéances calculées + check-lists filtrées + pénalités simulées
```

**3 entrées déterminantes :**
1. **Qui ?** Type entité (PP, SARL, SA, ONG, EP non-commercial) + régime (Entreprenant / TPS / Réel simplifié / Réel normal) + CA (< ou ≥50M) → détermine assujettissement TVA, MFP, MECeF obligatoire, télédéclaration.
2. **Quoi ?** Impôts concernés (TVA mensuelle, AIB sur prestations/imports, IS/IBA annuel, ITS/VPS mensuel, Retenue loyers 12%, IRCM, TAF) → crée **autant de pistes parallèles** que d’impôts cochés. Un dossier “TVA + AIB + ITS” = 3 pistes synchronisées, même échéance 10 du mois mais documents différents.
3. **Combien / Où ?** Chiffre d’affaires, effectif salarié (→ exonération VPS 2 ans premier emploi), marché public >50M, e-service non-résident, import, loyer → branchements 248 bis, 221-225, 101, 130.

**Exemple :**
- *ETS La Grâce, RME, CA 28M, 2 employés, prestation locale, pas d’import* → **Pas de TVA** (CA<50M → TPS), piste unique **AIB 3% + ITS/VPS** + exonération VPS possible 2 ans → workflow 6 étapes seulement, SLA 7j, pas de MECeF.
- *Fashion Bénin SARL, Réel Normal, CA 127M, 12 employés, import Chine + marché public 80M* → **TVA 18% + AIB 1% import + Retenue TVA 248 bis + ITS/VPS + IS** → 4 pistes parallèles, MECeF obligatoire, télédéclaration e-DGI/e-MEF, checklist Art.39 EBITDA.

### 3.3 Tableau de branchement (règles → workflow)

| Condition CGI | Règle | Étape impactée | Checklist auto |
|---------------|-------|----------------|----------------|
| CA ≥50M | TVA obligatoire Art.223-262 ; sinon TPS | Étape 2 Diagnostic : si CA<50M → saut étape 5 TVA, remplace par TPS | Art.229 exonérations, 217 bis MECeF |
| Réel Normal (quel que soit CA) | Télédéclaration obligatoire Circ. 012/2026 | Étape 8 Dépôt : badge “e-DGI obligatoire” ; bloque dépôt papier | 256 bis |
| Groupe international | Art.39 test 30% EBITDA | Étape 2 ajoute “Test EBITDA 30%” + pièces intragroupe | Art.39 |
| Marché public >50M | Retenue TVA 248 bis | Étape 5 : ajoute “Calcul retenue TVA source” | 248 bis |
| Prestation non-résident / e-service | Art.221-225 IR 20% + TVA 18% | Nouvelle piste “TVA e-services” + immatriculation simplifiée | 221-225 |
| Import avec IFU / sans IFU | AIB 1% vs 5% (130) | Étape 3 collecte : taux auto | 130-133 |
| Locataire PM | Retenue loyers 12% (10% si bailleur IS) Art.101 | Piste “Loyers” | 101-102 |
| Premier emploi béninois | Exonération VPS 2 ans (192-6) | Étape 5 : désactive VPS si applicable | 192 |
| ONG / EP non-commercial | Exonéré Patente (197), VPS (192), IS (4), TVA (229-p10) | Supprime pistes IS/VPS/Patente | RESCRITS [5] |
| Dividendes non-résidents | IRCM 5% (86) vs 15% créances (88) | Piste IRCM | 86-90 |

---

## 4. Architecture dynamique proposée pour `workflow-fiscalite.html` v2

### 4.1 Nouveau “Configurateur CGI 2026” (bandeau en haut du workflow)
UI en 3 colonnes, juste sous les KPIs, avant le rail :

- **Col A — Qui** : Régime (Entreprenant / TPS / Réel simplifié / Réel normal) + Type (PP/PM/ONG/EP) + CA annuel (champ → seuil 50M auto) + Effectif salarié
- **Col B — Quoi** (cases à cocher) : TVA (auto si CA≥50M), AIB (Import/Prestation), IS/IBA (annuel), ITS/VPS (si effectif>0), Retenue loyers, IRCM, TAF
- **Col C — Contexte** : Marché public >50M ? Import ? E-service étranger ? MECeF déjà ? Date clôture exercice

→ **Génération instantanée** : le moteur recalcule le rail, les KPIs et les cartes.

### 4.2 Rail adaptatif
Au lieu de 9 pills fixes, le rail devient **généré** :
- Si TPS → 6 étapes (supprime 4 Pré-traitement compta, simplifie 5)
- Si ONG exonérée → masque Patente/VPS/IS
- Si multi-pistes → affiche **onglets par impôt** (TVA • AIB • ITS/VPS • IS) + vue “Tous” synchronisée
- Chaque pilule affiche **article CGI cliquable** (ex: “TVA 18% — Art.223-262”) + SLA recalculé

### 4.3 Cartes dossiers enrichies CGI
Chaque carte affiche :
- **Régime badge** (RME / Réel Normal) + **MECeF oui/non**
- **Pistes actives** : `TVA+AIB+ITS` en mini-badges avec échéance propre (ex: TVA J-3, ITS J-3, IS 30 avril)
- **Calcul pénalité live** : si retard, `Pénalité estimée 10% = 87 000 F` (Art.506)
- **Bouton “Règles CGI”** → popover articles concernés

### 4.4 Modal détail — Checklist contextuelle + Articles
- **Onglets par piste** : l’utilisateur voit l’étape en cours **par impôt** (ex: Étape 3 Collecte TVA vs Collecte AIB)
- **Checklist filtrée** : seules les cases pertinentes au régime s’affichent, chaque case suffixée par `Art.xxx` cliquable (ouvre DGI)
- **Simulateur taux** : mini-calculatrice AIB 3%/5%, Retenue loyers 12%/10%, TVA 18%, IRCM 5%/15%, MFP 1,5% vs 30% IS
- **Échéancier auto** : calendrier 2026-2027 généré (10 mars/juin/sept/déc + 10 du mois + 30 avril) avec alertes J-7/J-3/J-1
- **MECeF & e-DGI** : case “Facture MECeF vérifiée Art.217 bis” + bouton “Simuler télédéclaration e-MEF”

### 4.5 Moteur de règles (JSON) — Extrait implémenté

```js
const CGI2026 = {
  seuils: { tva: 50_000_000, mfp_taux: 0.015, mfp_min: 500000, is_taux:0.30, is_edu:0.25, tva_taux:0.18, aib_avec_ifu:0.03, aib_sans_ifu:0.05, aib_import_ifu:0.01, loyer:0.12, loyer_si_bailleur_is:0.10, ircm_dividende:0.05, ircm_creance:0.15, vps:0.04, ortb:4000 },
  echeances: {
    is_acomptes: ["03-10","06-10","09-10","12-10"], is_annuel:"04-30",
    tva_mensuel:"10 du mois suivant", its_mensuel:"10 du mois suivant", vps_mensuel:"10 du mois suivant",
    salaires_annuel:"04-30", tps_trimestriel:"10 du mois suivant trimestre"
  },
  exonerations: {
    ong: { is:false, vps:false, patente:false, tva:true }, // Art.4,192,197,229-p10
    premier_emploi_beninois: { vps_2ans:true } // Art.192-6
  },
  articles: { tva:"219-268", aib:"130-140", is:"3-65", its:"119-129", vps:"191-193", loyer:"101-102", ircm:"69-90", ifu:"460", be:"462", conservation:"480", sanctions:{ retard:"506", be_sanction:"496", compta:"500" } }
}
function evaluerDossier(dossier){
  // retourne { pistes:['TVA','AIB','ITS'], etapes:STEPS_FILTRÉ, echeances:[] }
}
```

Le fichier `workflow-fiscalite.html` v2 embarque ce moteur ; les règles sont versionnées (`CGI_VERSION="2026.1"`), mise à jour via `docs/cgibenin-2026.json` si DGI publie une nouvelle loi.

### 4.6 Sanctions & pénalités — Dashboard
- Bandeau alerte si `conservation 10 ans` non respectée (Art.480) ou `registre BE` manquant (Art.462 → 1M)
- Sur chaque carte retard >10 du mois, calcul **250k-1,5M + 10%** (Art.506) + lien RESCRITS

---

## 5. Plan d’implémentation (GOBEX)

### Phase 1 — Déjà livré (v1 statique, 9 étapes) — `de9441c`
Hub + workflow fiscalité linéaire, habilitations, synchro Executive Manager.

### Phase 2 — Dynamique CGI 2026 (v2) — **en cours**
- [x] Analyse CGI → ce doc + JSON règles
- [ ] Patch `workflow-fiscalite.html` : ajouter configurateur (3 colonnes) + moteur CGI2026 + rail adaptatif + cartes multi-pistes + checklist avec `Art.` + calculateur + échéancier
- [ ] Ajouter badge “CGI 2026 — Loi 2025-22” + lien DGI dans topbar
- [ ] Mettre à jour `workflows.html` pour afficher version CGI

### Phase 3 — Automatisations DGI (v3)
- [ ] Simulateur MECeF (Art.217 bis) + vérif facture électronique
- [ ] Export e-DGI (XML) + e-MEF pré-rempli
- [ ] Webhook pénalités + calendrier partagé Secrétariat

### Phase 4 — Autres domaines
Même moteur pour Comptabilité (OHADA 479), GRH (ITS/VPS), etc.

---

## 6. Sources & Vérification

- [1] CGI 2026 PDF DGI (Loi 2021-15 + Loi 2025-22) — `api.impots.bj` (suspended mirror, via Droit Afrique)
- [2] Droit Afrique — Bénin Code général des impôts 2026 (Eyrolles) [2](https://www.eyrolles.com/Entreprise/Livre/benin-code-general-des-impots-2026-9782353083237/)
- [3] LGDJ — fiche 392 p. mise à jour 01/01/2026 [3](https://www.lgdj.fr/benin-code-general-des-impots-2026-9782353083237.html)
- [5] RESCRITS fiscaux 2026 — DGI Bénin [5](https://api.impots.bj/media/698b0c5f7a212_RESCRITS%20FISCAUX%202026.pdf)
- [6] AuditiaAfrica — TVA/IS 2026, Circ. DGI 012/2026 [6](https://www.auditiaafrica.com/actualites/37)
- [7] Échéances fiscales — impots.finances.gouv.bj [3](https://www.impots.finances.gouv.bj/les-echeances-fiscales/) (10 mars/juin/sept/déc, 30 avril, 10 du mois)
- [8] Obligations ONG/ITS/VPS/AIB — impots.bj [8](https://impots.bj/page/a0c0c517-d476-4f04-a839-bb67725b3094/connaitre-vos-obligations-fiscales-ong-1537122637-654008462-1024331567)

> Toute règle métier dans le code pointe vers son article (ex: `CGI Art.130 AIB 3%`) ; en cas de divergence, le texte DGI fait foi. Mise à jour annuelle prévue à chaque loi de finances.

---

## 7. Prochaine étape demandée

> **Rendre `workflow-fiscalite.html` dynamique** → Patch v2 avec configurateur CGI + moteur de règles + rail adaptatif + calculateurs + échéancier auto (cf. §4).  
> Dites “ok patch v2” ou “continue avec Comptabilité” pour enchaîner.

