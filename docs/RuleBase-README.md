# RuleBase — Architecture évolutive CGI Bénin
### Comment les mises à jour du Code ne cassent plus les moteurs

**Principe : AUCUN taux en dur dans le code. Tout vient du JSON versionné.**

---

## 1 fichier = 1 version du CGI

| Fichier | Année | Loi finances | État |
|---|---|---|---|
| `docs/cgibenin-2026.json` | 2026 | 2025-22 du 08/12/2025 | **LIVE** |
| `docs/moteurs-calcul-2026.json` | 2026 | 2025-22 | **LIVE** `v2026.1-audit-P1` |
| `docs/cgibenin-2027.json` | 2027 | (à créer) | futur |

> Ne JAMAIS écraser `2026`. Créer `2027` → le code détecte la plus récente ou lit `?v=2027`.

## Structure d'une version

```json
{
  "version": "2026.1-audit-P1",
  "annee": 2026,
  "loiFinances": "2025-22",
  "datePublication": "2025-12-08",
  "source": "Droit Afrique 392p",
  "seuils": {
    "is_taux": 0.30,
    "is_taux_enseignement": 0.25,
    "is_taux_industriel": 0.25,
    "mfp_taux": 0.015,
    "mfp_taux_btp": 0.03,
    "mfp_taux_immobilier": 0.10,
    "mfp_min": 500000,
    "tva_taux": 0.18,
    "tva_assujettissement": 50000000
  },
  "moteurs_P1": [{
    "id": "is",
    "article": "Art.46 + Art.64",
    "taux": {"normal": 0.30, "industriel": 0.25, "enseignement": 0.25},
    "mfp": {"taux": 0.015, "taux_btp": 0.03, "taux_immo": 0.10, "min": 500000},
    "changelog": "LF2026 : 1,5% général inchangé"
  }]
}
```

**Règle d'or :** `workflow/calcul-impots.html` ne contient PLUS `0.30` ou `0.015` en dur. Il lit :
```js
const rb = ruleBase; // JSON
const tauxIS = rb.moteurs_P1.find(m=>m.id==='is').taux.normal; // 0.30
const mfpTaux = rb.moteurs_P1.find(m=>m.id==='is').mfp.taux; // 0.015
```

## Procédure mise à jour (ex: CGI 2027)

1. **Dupliquer** `moteurs-calcul-2026.json` → `moteurs-calcul-2027.json`
2. Changer `version`, `annee`, `loiFinances`, `datePublication`
3. Éditer SEULEMENT les `seuils`/`taux` modifiés + ajouter entrée `changelog` par moteur :
   ```json
   "changelog": "LF2027 : MFP général 1,5%→2% (Art.64 modifié)"
   ```
4. **Aucune ligne JS à toucher.** Pousser → `workflow/calcul-impots.html` propose le sélecteur de version (2026 / 2027) en haut.
5. Tester : `?v=2027` affiche les nouveaux taux + alerte « Version 2027 — vérifier avec fiche »

## Traçabilité et verrouillage

- Chaque calcul exporte `ruleBase.version` + `loiFinances` dans son JSON/PDF : prouvable à l'administration.
- `docs/audit-moteurs-2026-verification.md` liste moteur par moteur l'article et le point à confirmer. Un moteur **verrouillé** = `statut: "verrouille"` dans le JSON → badge vert.
- Historique Git = preuve temporelle. Ex: `git show v2026.1` vs `v2027.1`

## Check-list avant de verrouiller un moteur (ex: IS)

- [ ] Article du Code recopié (PDF p.XX)
- [ ] `taux`/`mfp`/`min` conformes au JSON
- [ ] Cheminement en 5 étapes affiché et testé sur FEC exemple
- [ ] 3 exemples chiffrés opposables validés
- [ ] Fallback B/C (sans FEC) testé
- [ ] `changelog` renseigné

## Où éditer sans développeur

- **Taux courants** : `docs/cgibenin-2026.json` → `seuils` (simple)
- **Formules complètes** : `docs/moteurs-calcul-2026.json` → `moteurs_P1/P2`
- **Via interface** (à venir) : `workflow/admin-rulebase.html` → formulaire qui réécrit le JSON et propose le diff Git.

---

## Étape 1 — IS : preuve que ça marche

L'IS est le premier moteur **update-proof** :

| Ancien code (dur) | Nouveau code (RuleBase) |
|---|---|
| `benefice*0.30` | `benefice * rb.taux.normal` |
| `ca*0.015` | `ca * rb.mfp.taux` |
| `Math.max(500000, ...)` | `Math.max(rb.mfp.min, ...)` |

Si la LF2027 passe le MFP à 2%, il suffit d'éditer le JSON : le moteur recalcule instantanément, le PDF affiche « v2027.1 — Art.64 modifié » — **zéro code**.

Le détail complet IS est dans `docs/IS-cheminement-etape1.md`.
