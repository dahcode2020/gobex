# GOBEX - Godwin Business Expertise
Cabinet professionnel à Abomey-Calavi, Bénin

## 🎨 Charte Graphique Officielle (extraite du logo fourni)

D'après votre logo officiel uploadé :

- **Primary (Bleu nuit)** : `#0A2F5E` - Confiance, expertise, sérieux
- **Accent (Jaune Or)** : `#FFB81C` - Énergie, croissance, optimisme
- **Light** : `#f4f7fb` - Fond clair (Novena)
- **Text** : `#6f8ba4`

Logo officiel : 
- Icone : `assets/img/logo.png` (stylisé G / 9 avec point gauche, jaune haut + bleu bas, triangles droite)
- Version avec texte : `assets/img/logo-text.png` (GOBEX + Godwin Business Expertise)
- Favicon : `assets/img/favicon.png`

## 🏢 Informations Cabinet

- **Nom** : GOBEX (Godwin Business Expertise)
- **Adresse** : Carrefour 02 Manguiers, Rue de Tankpê, Abomey-Calavi, Bénin
- **Agrément** : RB/ABC/15A3265
- **IFU** : 1201502844807
- **Tel** : +229 97 739 046
- **WhatsApp** : https://wa.me/22997739046
- **Email** : contact@gobex.bj

## 📂 Structure du site (inspiré Novena)

```
index.html (accueil - hero + features + about + services + RDV + témoignages + contact)
assets/
  css/style.css (design Novena adapté)
  js/main.js (animations + WhatsApp)
  img/
    logo.png (logo officiel nettoyé)
    logo-text.png (logo + texte GOBEX)
    hero-west-africa.jpg (équipe béninoise)
    about-west-africa-*.jpg (contexte ouest-africain)
    service-*.jpg (6 services avec photos béninoises)
services/
  consultation-fiscale.html
  comptabilite-gestion.html
  solutions-it-web.html
  formations-rh.html
  business-entrepreneuriat.html
  gestion-entreprise.html
```

## ✨ Fonctionnalités

- Design inspiré de Novena (themewagon.github.io/novena)
- Responsive Bootstrap 5
- Images contexte Afrique de l'Ouest / Bénin
- Formulaire RDV avec intégration WhatsApp direct
- Bouton WhatsApp flottant
- Google Maps précis Carrefour 02 Manguiers
- 6 pages services dédiées
- Témoignages locaux (Cotonou, Godomey, Calavi)

## 🚀 Lancer le site

```bash
python3 -m http.server 8000
# Ouvrir http://localhost:8000
```

## 📱 WhatsApp Integration

Le formulaire envoie automatiquement un message pré-rempli sur WhatsApp :
`https://wa.me/22997739046?text=...`

Bouton flottant + boutons dans chaque section.

## 🔄 Remplacer le logo (si nouveau)

1. Remplacez `assets/img/logo.png` par votre fichier
2. Remplacez `assets/img/logo-text.png` si vous avez version avec texte
3. Les couleurs s'adapteront automatiquement (CSS variables --primary et --accent)

---
Design inspiré de Novena • Développé pour GOBEX • 100% Béninois
