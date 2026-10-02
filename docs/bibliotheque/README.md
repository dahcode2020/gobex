# Bibliothèque GOBEX — IA Guide Rapide

**Chemin** : `docs/bibliotheque/` + index `docs/bibliotheque/bibliotheque.json` (copie `workflow/bibliotheque.json` pour runtime)

**100% RuleBase** : pas de dur. L'IA consulte à chaque question ce JSON + `moteurs-calcul-2026.json` + les `.md` (RAG mots-clés).

## Mode hybride (choisi)
- **Admin** : dépose PDF/lien via `admin/bibliotheque-admin.html` → hash + indexation
- **Veille auto 1x/mois** : HEAD sur `impots.bj, apibenin.bj, ohada.org, bceao.int, finances.bj, ccib.bj` → notif `Nouveau document détecté → intégrer ?` → badge `MAJ RuleBase ?`

## Structure
- `cgi/` : CGI L1-L3 (2026)
- `ohada/` : AUDCIF + SYSCOHADA
- `lf/` : LF 2023-2025
- `instructions/` : DGI, barèmes
- Référentiels : `docs/moteurs-calcul-2026.json` (38 moteurs)

## Chat
Widget `gobexChatWidget` dans `workflow/calcul-impots.html` et `workflow/fiscalite.html` — offline, cite article + moteur + path.

## Ajout
Via Admin : choisir catégorie, uploader `.pdf/.md` ou coller URL, renseigner titre/articles/moteurs → sauvegarde dans `bibliotheque.json`.
