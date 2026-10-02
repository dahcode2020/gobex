# Audit des 34 Moteurs — CGI Bénin 2026 (Loi 2021-15 + Loi Finances 2025-22)
## Traçabilité, cheminement et méthodes de calcul — Pour convaincre chaque client de notre travail

**Version : 2026.1-calcul-P3 — 29/09/2026 — Cabinet GOBEX (RB/ABC/15A3265)**
**Sources primaires :** Code Général des Impôts 2026 (Droit Afrique 392p, mise à jour Loi 2025-22 du 08/12/2025) + circulaire DGI 012/2026 + echeances fiscales impots.bj + projet plaquette TPS + Recherche web 28-29/09/2026.  
**Principe :** Chaque moteur = `Base extraite (FEC ou alternatif) × Taux RuleBase CGI ± plancher/déduction` → **traçable article par article** — affichage du cheminement en 5 étapes pour audit client.

**Niveau de fiabilité :** A = FEC OHADA + Balance (certifié) · B = Livre recettes-dépenses + banque + MECeF · C = Relevés/MoMo + déclarations antérieures (reconstitution, alerte).

**État d'avancement :** Ce document est l'audit vivant. 11 moteurs P1 détaillés à l'épreuve du texte (cheminement complet). 23 moteurs P2 pré-audités (formules + points de vigilance) → à valider **un par un avec le Cabinet** en séance (1 impôt = 1 vignette validée).

---

## Méthodologie — Comment nous convainquons le client

Pour **chaque** impôt nous montrons dans `workflow/calcul-impots.html` :

1. **Qualification** — L'impôt s'applique-t-il ? (régime, seuil CA, forme juridique, secteur) — repris de `fiscalite.html` (RuleBase).
2. **Assiette** — D'où vient la base ? Mapping comptable exact (ex: `Σ Credit 70* - Débit 709` pour CA HT) + fallback B/C si pas de FEC.
3. **Taux/Barème** — `RuleBase` article par article (taux, tranches, planchers MFP, exonérations).
4. **Formule** — équation littérale affichée + calcul intermédiaire (ex: `MFP = CA×1,5%` vs `IS = bénéfice×30%` → `max`).
5. **Preuve** — JSON export + fiche PDF avec sources, articles, fiabilité A/B/C, total. Vérifiable par l'administration.

> Exemple phrase client : « Votre IS de 3 000 000 F provient de : bénéfice fiscal 10 000 000 F ×30% = 3 000 000 F, supérieur au plancher MFP 80 000 000 ×1,5% = 1 200 000 F → IS retenu 3 000 000 F (Art.46 + Art.64, fiabilité A FEC 82 écritures). »

---

## P1 — 11 Impôts majeurs (détail intégral — à valider en premier)

### 1. IS — Impôt sur les Sociétés — Art.2-3 + Art.46 + Art.64 (MFP) + Art.51 (acomptes)

**Qui ?** Art.3 : SA/SAS/SARL/SCS/SCA, sociétés coopératives, personnes morales lucratives, et sur option : SNC/GIE/sociétés civiles. Exclus : TPS de droit si CA ≤50M et non opté IS (Art.179).

**Base :** Bénéfice fiscal = Résultat comptable OHADA + réintégrations (charges non déductibles : amendes, provisions non déductibles, dépassement intérêts intragroupe >30% EBITDA Art.39 2026) − déductions (dividendes exonérés, plus-values réinvesties...). + CA HT (produits encaissables) pour plancher.

- FEC : `Σ Credit 7* − Σ Débit 6*` = résultat comptable. `Σ Credit 70* − Débit 709` = CA HT. Charges = `Σ Débit 60-68`.
- Sans FEC (B/C) : `CA = Σ Recettes (Livre + relevés bancaires + MoMo)` ; `Résultat = CA − Σ Dépenses (Livre)` → alerte fiabilité B/C.

**Taux :** Art.46 : **25%** si (a) société industrielle hors extractive OU (b) école privée (scolaire/univ./technique/pro). **30%** autres cas. Convention minière/pétrolière : taux conventionnel.

**Plancher MFP Art.64 (mod. LF 2024 & 2026) :** `MFP = CA_HT × 1,5% (général) ; 3% BTP ; 10% société à prépondérance immobilière (Art.101 §2)` — minimum **500 000 F** dans tous les cas. Par produits encaissables : Art.47 §2 = flux financiers effectifs ou susceptibles (exploitation + financier + HAO), hors production immobilisée/stockée, transferts de charges, reprises.

**Formule :**
```
IS dû = max( Bénéfice fiscal × taux_IS[25%|30%] , MFP )
MFP = max( 500 000 , CA_HT × taux_MFP[1,5%|3%|10%] )
```

**Cheminement (5 étapes affichées) :**
1. Détecter forme → IS dû ? (si SARL/SA... oui ; si EI ≤50M → TPS, pas IS)
2. Extraire CA HT + résultat (FEC 70*/6*/7* ou Livre)
3. Calculer IS théorique = Bénéfice×30% (ou 25%)
4. Calculer MFP = CA× taux secteur ; prendre max avec 500k
5. Prendre `max(IS théorique, MFP)` → IS dû. Échéancier : 4 acomptes 10/03,10/06,10/09,10/12 + solde 30/04 (Art.51). Imputation AIB.

**Exemple opposable :**
- CA 80M, bénéfice 10M, BTP, taux IS 30% → IS th = 3M ; MFP = 80M×3% = 2,4M → IS dû **3M** (>MFP).
- CA 80M, déficit −2M, BTP → IS th = 0 ; MFP 2,4M → IS dû **2,4M** (plancher déficitaire).
- CA 80M, bénéfice 3M, général 1,5% → IS th 0,9M ; MFP 1,2M → **1,2M** retenu.

**Échéances/pénalités :** Défaut déclaration IS : Art.503-506 (250k+10%). Intérêts de retard 10% + astreinte.

**Vigilance client :** Justifier le taux 25% (justif industriel/école) ou minier ; sinon 30% par défaut. Tracer la définition produits encaissables (risque redressement si CA sous-évalué). **Statut moteur : ✓ formule conforme LF2026 (1,5% général) — à confirmer texte Art.46-47-64 exact.**

---

### 2. IBA — Impôt sur les Bénéfices d'Affaires — Art.54-59 + Art.63 (barème)

**Qui ?** Art.54 : personne physique exerçant activité lucrative (EI, SNC non optée, profession libérale BIC/BNC). Si CA >50M ou option IS → IS, pas IBA.

**Base :** Bénéfice BIC/BNC = `CA HT − charges déductibles` (achats, loyers, salaires, amortissements OHADA).

**Barème Art.58-63 (progressif — source impots.bj 2021) :**
- 30% de 0 à 10M
- 35% de 10M à 20M
- 40% >20M
*Note : cgibenin-2026.json simplifie à 30% flat ; le barème historique reste référencé. LF2026 n'a pas modifié ce barème — à trancher avec DGI.*

**Formule actuelle moteur :** `IBA = Bénéfice ×30% (simplifié, alerte si Bénéfice >10M → barème à appliquer)`  
**Formule cible après validation :** `IBA = 10M×30% + (min(benef,20M)-10M)×35% + max(0,benef-20M)×40%`

**Cheminement :** 1) CA et charges (FEC 70*/60*) 2) Bénéfice 3) Tranches 30/35/40 4) Comparer à TPS si CA ≤50M (Art.179) → bascule 5) AIB imputable.

**Exemple :** Bénéfice 15M → 10M×30%=3M +5M×35%=1,75M = **4,75M**

**Échéance :** 30/04 annuel (Art.49) + acomptes si >.

**Vigilance :** Si CA ≤50M, ne pas calculer IBA (remplacé par TPS libératoire). **Statut : ⚠️ barème à confirmer Art.58 exact CGI2026 (vérifier quotas progressifs).**

---

### 3. TPS — Taxe Professionnelle Synthétique — Art.178-182 + Art.1084-33 (LF2026)

**Qui ?** CA HT 0-50M, personne physique/morale non soumise IS de droit (Art.179 : IS de droit/option exclus TPS). Exo 12 mois création (Art.180), artistes/agricoles exonérés.

**Base :** CA HT encaissable (Art.47 déf. produits encaissables).

**Taux LF2026 :** Micro ≤20M : **2%** ; Petite 20M-50M : **5%** (remplace ancien forfait). Libératoire IBA/patente/VPS (Art.178 §3).

**Formule :** `TPS = CA × 0,02 si ≤20M sinon CA ×0,05` — affichage micro/petite + libératoire.

**Échéance (réforme 2026) :** 2 acomptes **10/02 et 10/06** + solde **30/04** (Art.1084-33 révisé LF2026 — confirme faq.impots.bj : 10/02 +10/06 remplace 31/01). If acomptes >50k ? Ancienne règle 31/01 caduque → retenir **10/02-10/06**.

**Exemple :** CA 18M micro → 360 000 F/an (180k+180k acomptes). CA 35M petite → 1 750 000 F.

**Sources :** FEC 70* ou Livre+banque+MoMo (pas besoin résultat) — fiable même en C.

**Vigilance :** Vérifier seuil par **établissement/commune** (LF2026 : TPS par commune si multi-sites). **Statut : ✓ taux + échéances réformés confirmés — référence à citer LF2026.**

---

### 4. TVA — Taxe sur la Valeur Ajoutée — Art.219-268 + Art.223 (seuil) + Art.248 bis (2026) + Art.249 bis

**Assujetti :** CA >50M (Art.223) — seuil 2026 inchangé 50M (TVA). Opérations imposables : livraisons, prestations, importations. E-services non-résidents Art.221-225 : immatriculation simplifiée + TVA 18% (LF2026 UEMOA).

**Taux :** **18%** standard unique (2026 inchangé). Exportation taux 0 (exonéré). Banques/assurances : TAFA, pas TVA.

**Formule :** `TVA due = TVA collectée − TVA déductible`
- Collectée = `Σ Ventes HT ×18%` (FEC 443 / MECeF TVA_18)
- Déductible = `Σ Achats HT ×18%` si fournisseur TVA + facture conforme (FEC 4456) — coefficient déduction 60% si mixte (moteur utilise 60% par défaut).

**Nouveauté 2026 Art.248 bis :** Retenue à la source TVA pour **marchés publics >50M** — collectée par l'État, déductible pour le prestataire.

**Base FEC :** `CA Σ Credit 70*` ; `443 TVA collectée` ; `4456 TVA déductible` ; `601-608 achats HT`.

**Échéance :** **10 du mois suivant** (Art.249 bis). Mensuel obligatoire Réel Normal (Circ. DGI 012/2026).

**Exemple :** CA 100M HT → collectée 18M ; achats 60M HT → déductible 10,8M×60%=6,48M → TVA due **11,52M**

**Vigilance :** Conditions déductibilité : facture normalisée MECeF, paiement tracé, pas de forclusion. **Statut : ✓ complet (seuil 50M + retenue 248bis intégrés).**

---

### 5. AIB — Acompte sur Impôt assis sur les Bénéfices — Art.130-140 + Art.64 (Cas C)

**Assujetti :** À chaque achat/vente/importation — retenu à la source par l'acheteur/importateur.

**Taux (Art.130) :** `1% import avec IFU ; 3% achat/vente avec IFU (hors import) ; 5% sans IFU` — Cas C (non connue/non identifiée) = **5% définitif** (non imputable).

**Formule :** `AIB = Montant HT × taux[1%|3%|5%]` — imputable sur IS/IBA sauf Cas C.

**Exemple :** Import 10M IFU → 100k (1%) ; Vente locale 10M IFU → 300k (3%) ; Sans IFU → 500k (5% définitif).

**Échéance :** 10 du mois suivant.

**Vigilance :** Justifier IFU fournisseur (facture + base registre). **Statut : ✓ taux + Cas C conformes.**

---

### 6. IRCM — Impôt Revenu Capitaux Mobiliers — Art.69-90

**Base :** Dividendes, intérêts de créances, produits de parts sociales.

**Taux :** `15% dividendes résident ; 5% dividendes non-résident ; 15% intérêts/créances` (Art.69-90, harmonisé 2026).

**Formule :** `IRCM = Dividendes ×15% (ou 5% non-rés) ; Intérêts ×15%`

**Exemple :** Dividende 20M résident → 3M

**Échéance :** 10 du mois suivant retenue.

**Statut : ✓**

---

### 7. IRF / Retenue loyer — Art.101-102 + 131

**Base :** Loyers bruts versés (baux habitation/professionnel).

**Taux :** **12%** si bailleur personne physique / retenue par locataire ; **10%** si bailleur société IS (10% précompte).

**Formule :** `IRF = Loyer brut ×12% (ou 10%)` — retenu par locataire personne morale.

**Exemple :** Loyer 2M → 240k (ou 200k si bailleur IS)

**Statut : ✓**

---

### 8. ITS — Impôt sur Traitements et Salaires — Art.119-129 + Art.121 (barème)

**Barème mensuel Art.121 (reconstitué LF2026, à coinfermer extrait PDF p.28) :**

| Tranche mensuelle | Taux |
|---|---|
| 0 – 60 000 F | 0% |
| 60 001 – 150 000 | 10% |
| 150 001 – 250 000 | 15% |
| 250 001 – 500 000 | 19% |
| >500 000 | 30% |

Abattement forfaitaire : 0% (supprimé LF2023).

**Formule :** `ITS = Σ par employé tranches ci-dessus` — VPS distinct 4% (Art.191, pas ITS).

**Exemple (méthode tranche par tranche affichée) :**
- Salaire 85k → 0 sur 60k + 25k×10%=2 500 → **2 500F**
- 180k → 60k 0% +90k×10%=9k +30k×15%=4,5k = **13 500F**
- 420k → 60k0 +90k×10%9k +100k×15%15k +170k×19%32,3k = **56,3k**

**Cheminement UI :** si champ `Salaires détaillés` rempli → somme tranche par tranche visible ; sinon `Masse×15% moyen` (alerte).

**Échéance :** 10 du mois suivant (+ déclaration annuelle salaires 30/04 Art.472).

**Statut : ✓ barème fidèle ; à valider tranche max >500k =30% (page 28 PDF).**

---

### 9. VPS — Versement Patronal sur Salaires — Art.191-193 + Art.192-6

**Taux :** **4%** masse brute (Art.191) — libératoire si TPS (TPS libère VPS).

**Formule :** `VPS = Masse brute ×4%`

**Exonération 2026 :** Art.192-6 : **2 ans si premier emploi salarié de nationalité béninoise** (embauche déclarée). Moteur : case `Premier emploi ? oui → 0`.

**Exemple :** Masse 12M → 480k (ou 0 si exo 24 mois)

**Statut : ✓**

---

### 10. TFU — Taxe Foncière Unique — Art.73 + Art.98 (TEOM liée)

**Base :** Valeur locative cadastrale (bâti 15-30% RFU, non bâti 4-6% hors RFU — conseil communal).

**Taux :** **15-30% bâti** (communes RFU), **4-6% non bâti** (barème communal voté chaque année — variable). Moteur actuel : forfait 500k → **à enrichir** : saisir valeur locative + commune.

**Formule :** `TFU = Valeur locative × taux communal`

**Échéance :** 31/03 annuel (3 tranches 31/01,31/03,31/05 si RFU).

**Vigilance :** Ne pas confondre TFU et TEOM (TEOM adossée). **Statut : ⚠️ forfait provisoire — nécessite commune + valeur locative réelle.**

---

### 11. Patente et Licence — Art.197 + 1084 (TPS libératoire)

**Base :** CA + valeur locative du local pro.

**Formule :** `Patente = Droit fixe (classe 1-8 selon activité) + Droit proportionnel (valeur locative × taux classe)` — barème par arrêté communal.

**Libératoire :** TPS libère patente (Art.178) ; sinon `10/02 annuel` (2 acomptes si droits >50k).

**Moteur actuel :** `CA×1% + droit fixe` → estimation provisoire — **à affiner** par classe exacte.

**Statut : ⚠️ formule simplifiée (attente barème communal).**

---

## P2 — 23 Taxes et contributions (pré-audit — validation par lot)

> Chaque fiche ci-dessous : formule implantée dans `calcul-impots.html:calculer()` + article + base vérifiée rapidement. **Objectif séance : valider les taux et assiettes un par un ; le moteur affiche déjà l'article pour traçabilité.**

| # | Id | Libellé | Art. | Formule implantée | Assiette / Taux réel | Échéance | Vigilance |
|---|---|---|---|---|---|---|---|
|12|tpvi|Plus-Values Immo|Art.56|PV×15% (500k-5M PV param.)|PV = cession − acquisition − frais ; **15%** (2026 inchangé)|15j mutation|Exo résidence ppale si réinvestie ? Vérifier|
|13|tvm|Véhicules à Moteur|Art.208-210|Forfait CV : 2-7CV 20k / 8-12CV 40k / >12CV 80k|CV fiscaux carte grise|31/03|Majoration usage pro ?|
|14|taxe_armes|Armes à Feu|Art.80|10 000F/arme|Permis arme|31/03|Par arme déclarée|
|15|taxe_pirogues|Pirogues|Art.82|15 000F/pirogue|Barque motorisée immat.|annuel|—|
|16|taxe_taxis|Taxis ville|Art.83|12k/moto/trim, 24k/auto/trim|Plaque taxi|trim.|—|
|17|taxe_sport|Dévt Sport|Art.97|CA tabac/alcool ×1%|CA HT tabac/alcool|**annuel**|Confondue avec accise ? Vérifier assiette|
|18|teom|Ordures|Art.98|5-20k /habitation (10k défaut)|Valeur locative/habitation|avec TFU|Fixée par commune|
|19|tafa|TAFA|Art.293|Produits financiers ×10% (moteur 5% CA approx.)|**10%** commissions/intérêts/primes banques/assurances|10/m+1|Hors champ TVA — banques/assur.|
|20|taxe_jeux|Jeux hasard|Art.128|Produit brut jeux ×15%|Mises−gains ; **15%**|10/m+1|Loteries vs casinos — vérifier|
|21|taxe_com|Télécoms|Art.129|CA télécoms ×5%|**5%** CA communications HT|10/m+1|Opérateurs + revendeurs|
|22|taxe_accise|Accise|Art.131|Tabac 40% / alcool 30% / cosm 10% (moteur 10% CA)|Tabac **40%**, alcool **30%**, cosmétiques **10%**|10/m+1|Barème par produit — détailler|
|23|tsu_petrolier|TSU pétrole|Art.133|Essence 85F/L, gasoil 35F/L|**85F/L essence, 35F/L gasoil**|import/mise conso|Douane|
|24|taxe_tourisme|Véhicules tourisme|Art.134|50 000F/véhicule/an|Forfait tourisme|annuel|—|
|25|taxe_sejour|Séjour|Art.135|1 000-5 000F/nuitée (déf. 1k)|Nuitées × barème hôtel (1k éco ..5k 5★)|10/m+1|Catégorie hôtel|
|26|contrib_locale|Dév. Local|Art.136|CA HT ×1%|**1%** CA HT|10/m+1|Vérifier assujettis|
|27|prelev_occasion|Véhicules occasion|Art.139|Valeur argus ×5%|**5%** à l'import|import|Argus douane|
|28|taxe_pacage|Pacage|Art.140|2 000F/tête|**2 000F**/tête bétail|annuel|Registre élevage|
|29|taxe_spectacles|Spectacles|Art.141|Recettes ×5%|**5%** recettes HT|10/m+1|—|
|30|taxe_boissons|Boissons fermentées|Art.142|CA boissons ×5%|**5%**|10/m+1|Brasseries|
|31|taxe_pub|Publicité|Art.143|CA pub ×3%|**3%**|10/m+1|Affichage|
|32|taxe_energie|Élec/Eau|Art.145|Facture ×5%|**5%** SBEE/SONEB HT|10/m+1|Sur facture|
|33|droits_enreg|Enregistrement|Art.147-171|Mutations 5%, baux 1%, actes 1-5%|**5%** immo/fonds, **1%** bail|30j acte|Notaire|
|34|timbre|Timbre|Art.176-193|1 000F/feuille|**1 000F**/feuille|à l'acte|Quittance|

**Taux TAFA/accise/com/énergie : croisés avec Droit Afrique + finances.bj — plausibles 2026, à confirmer ligne par ligne avec PDF p.131-145.**

---

## Plan d'action convenu

1. **Séance 1 (aujourd'hui) : valider P1 (IS→Patente)** — tu coches impôt par impôt, je corrige `moteurs-calcul-2026.json` + `calcul-impots.html:calculer()` en direct.
2. **Affiner cheminement UI** — chaque moteur affiche désormais : Article → Base (FEC mapping) → Taux RuleBase → Formule → Exemple → Fiabilité. (Intégration en cours, voir `calcul-impots.html` étape 3 détail.)
3. **Séance 2 : lot P2 par famille** (Accises → TAFA → Télécom → Enregistrement) — 5 impôts / séance.
4. **Livrable final :** `moteurs-calcul-2026.json v2026.1-validé` + fiche PDF traçable par dossier + audit signé Cabinet.

**Prochain pas immédiat :** Dis-moi par quel impôt on démarre (recommandé **IS**) et je t'affiche son cheminement complet avec extrait CGI p.46-64 + simulation FEC 82M. On le verrouille, puis on passe au suivant.
