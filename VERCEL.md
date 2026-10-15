# Déploiement Vercel — Branche `arena/01a09d6d-gobex`

> Tout est prêt côté code. La connexion à Vercel se fait en **1 clic depuis le dashboard** — le sandbox Arena ne peut pas contacter `vercel.com` directement (accès réseau limité à `github.com` / `npm`), c'est normal.

## 1) Préparation (déjà faite sur cette branche)

- **Framework** : Vite 5 — `npm run build` → `dist/` (testé, `✓ built in ~300ms`)
- **Config** : `vercel.json` à la racine
  ```json
  { "framework":"vite", "buildCommand":"npm run build", "outputDirectory":"dist", "cleanUrls": true }
  ```
- **Multi-pages** : `vite.config.js` inclut `index.html` + `boutique.html` + `services/*.html` + `workflow/index|fiscalite|declarations-mensuelles.html` en entrée Rollup, et copie en statique `docs/`, `assets/`, `workflow/` (dont `calcul-impots.html` 1.5M heavy parse5), `admin/` — évite l'erreur `unexpected-solidus-in-tag` du debug.
- `.gitignore` : ignore `.vercel/`, `dist/`, `node_modules/`

**Vérification locale :**
```bash
npm install
npm run build && ls -R dist | head -n 50
# dist/index.html  dist/workflow/declarations-mensuelles.html  dist/docs/declarations-mensuelles-2026.json  dist/admin/ ...
```

## 2) Connecter le dépôt à Vercel (2 min)

### Option A — Dashboard (recommandé)

1. Aller sur **https://vercel.com/new**
2. **Add New → Project → Import Git Repository**
3. Chercher `dahcode2020/gobex` → **Import**
4. Dans **Configure Project** :
   - **Framework Preset** : `Vite` (auto-détecté via `vercel.json`)
   - **Root Directory** : `./` (laisser vide)
   - **Build Command** : `npm run build` (pré-rempli)
   - **Output Directory** : `dist` (pré-rempli)
   - **Install Command** : `npm install`
   - **Node Version** : `18.x` ou `22.x` (via `engines`)
5. **Git Settings** → **Production Branch** : `arena/01a09d6d-gobex`  
   *(par défaut `main`, clique pour choisir cette branche — tous les pushes sur cette branche déclencheront un déploiement Preview/Production)*
6. **Environment Variables** : aucune requise (site 100% statique offline).
7. **Deploy** → attendre `✓ Build Completed` → URL fournie `https://gobex-xxx.vercel.app`

> Chaque `git push origin arena/01a09d6d-gobex` redeploie automatiquement. Les autres branches ne déploient pas sauf si activé.

### Option B — CLI (depuis ta machine locale, pas depuis Arena)

```bash
npm i -g vercel
vercel login          # navigateur → autoriser
vercel link           # choisir dahcode2020/gobex → Yes link to existing? No → Create
# Project name: gobex  | Framework: Vite | Build: npm run build | Output: dist
vercel --prod --yes   # déploie cette branche en production
vercel env pull       # optionnel
```

*Depuis Arena, `npx vercel build` échoue avec `Client network socket disconnected` — c'est attendu (pare-feu sortant). Utilise ton poste local ou le Dashboard.*

## 3) Vérifier le déploiement

- **Accueil** : `https://<ton-projet>.vercel.app/`
- **Moteurs mensuels** : `https://<ton-projet>.vercel.app/workflow/declarations-mensuelles.html` ← nouveau tableau isolé non courant
- **Hub workflows** : `https://<ton-projet>.vercel.app/workflow/` → bandeau violet NEW
- **Docs RuleBase** : `https://<ton-projet>.vercel.app/docs/declarations-mensuelles-2026.json` (v2026.30.0-Mensuel + 10 non courantes)

En cas de 404 sur `/workflow/declarations-mensuelles` sans `.html`, `vercel.json` → `rewrites` gère `cleanUrls`.

## 4) Branche & Previews

- **Production** : `arena/01a09d6d-gobex` (à définir dans Vercel → Settings → Git → Production Branch)
- **Preview** : toute autre branche `arena/*` → URL preview `https://gobex-git-arena-xxxx.vercel.app`
- Pour redeployer sans push : Vercel → Deployments → **Redeploy**

## 5) Domaine personnalisé (optionnel)

Vercel → Settings → Domains → Add `gobex.bj` → suivre DNS (CNAME `cname.vercel-dns.com`).

## 6) Support

- Build logs : Vercel Dashboard → Deployments → View Build Logs
- Si `vite` not found → vérifier `package.json` → `vite@^5.4.0` bien dans `devDependencies` (oui)
- Si parse5 error → `vite.config.js` exclut `workflow/debug-moteurs.html` et `calcul-impots.html` du Rollup (copiés en statique)

---

**Commit prêt à déployer :** `vercel.json` + `vite.config.js` (multi-pages + static-copy) + `package.json` engines + `.gitignore` .vercel
