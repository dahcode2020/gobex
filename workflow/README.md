# GOBEX Workflow — Portail Indépendant

**Objectif :** Ne pas surcharger le site principal. Le workflow vit à part, accessible uniquement via bouton **Workflow** (admin / personnes désignées).

## Accès

- **URL Hub :** `/workflow/` → `workflow/index.html`
- **URL Fiscalité :** `/workflow/fiscalite.html` (9 étapes, moteur CGI 2026)
- **Bouton Workflow :** visible dans `admin/executive-manager.html`, `admin/crm.html`, `admin/dashboard.html` **uniquement si** `gobex_admin_auth==="true"` et `hasWorkflowAccess()` (admin implicite ou `gobex_workflow_access.fiscalite`).
- Les anciennes URLs `/admin/workflows.html` et `/admin/workflow-fiscalite.html` restent fonctionnelles mais affichent un bandeau “Portail déplacé vers /workflow/”.

## Indépendance

- **Code séparé** : `workflow/` ne dépend pas de `admin/` — peut être déployé seul.
- **Données** : même origine → `localStorage` partagé (`gobex_exec_dossiers`, `gobex_crm_clients`) si le workflow est sur le même domaine. Pour une isolation totale, utiliser `gobex_workflow_*` + import/export JSON.
- **Mises à jour** : modifier `workflow/` ne touche pas `admin/` ni le site vitrine.

## Implémentation Fiscalité

- Moteur CGI 2026 v2026.1 (`docs/cgibenin-2026.json` + `docs/analyse-cgi-2026-workflow-fiscalite.md`)
- Configurateur dynamique : Régime / CA / Pistes (TVA/AIB/IS/ITS/VPS) / Déclencheurs (marché >50M Art.248 bis, import Art.130, groupe Art.39, premier emploi Art.192-6)
- Spec 5 étapes : `docs/spec-workflow-fiscal-intelligent-v1.md`

## Prochaine étape

Continuer avec **Workflow Fiscalité** (affinage Cas A/B/C, AIB 5%, échéanciers TPS 10/02-10/06-30/04, etc.) puis dupliquer le modèle pour Comptabilité, GRH, etc. dans `workflow/`.

