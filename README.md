# Sans Scroll

Instagram avec ton vrai compte, mais **sans rien à scroller** :

- **Pas de fil d'actualité** : l'accueil est remplacé par un panneau Messages / Rechercher / Notifications / Mon profil.
- **Reels bloqués** : onglet Reels masqué, pages Reels bloquées (y compris l'onglet Reels des profils). En option : bloquer aussi les Reels qu'on t'envoie en DM.
- **Option** : masquer la grille Explorer (la loupe ouvre directement la recherche).
- Tout le reste marche : DM, stories, profils, publier, commenter, notifications. Tu restes connecté.
- Les liens externes s'ouvrent dans Safari, et l'appli Instagram officielle ne peut pas se lancer à ta place.

Réglages : bouton **Réglages** en bas de l'accueil.

Tout est gratuit : pas besoin de Mac ni de compte développeur payant. Le compte Apple gratuit a une seule contrainte : **l'appli expire au bout de 7 jours**, il faut la réinstaller (2 minutes, voir plus bas).

---

## Installer sur ton iPhone depuis Windows

Deux méthodes. La **A** est la plus simple : GitHub compile l'appli sur un Mac gratuit à ta place.

### Méthode A — GitHub + Sideloadly (recommandée)

1. **Mets le projet sur GitHub**
   - Crée un dépôt **public** sur github.com (les dépôts publics ont des minutes Mac illimitées).
   - Envoie-y tout le dossier `SansScroll` (bouton *Add file → Upload files*, ou `git push`).

2. **Récupère l'IPA**
   - Onglet **Actions** → le build *Build IPA* se lance tout seul (≈ 5 min).
   - Quand il est vert, ouvre-le et télécharge l'artefact **SansScroll-ipa** (un .zip qui contient `SansScroll.ipa`).

3. **Installe avec Sideloadly**
   - Installe **iTunes** et **iCloud** en version site Apple (pas Microsoft Store), puis **Sideloadly** (sideloadly.io).
   - Branche l'iPhone en USB, accepte « Faire confiance à cet ordinateur ».
   - Glisse `SansScroll.ipa` dans Sideloadly, entre ton identifiant Apple, clique **Start**.

4. **Sur l'iPhone**
   - Réglages → Confidentialité et sécurité → **Mode développeur** → active, redémarre.
   - Réglages → Général → **VPN et gestion de l'appareil** → ton identifiant Apple → **Faire confiance**.
   - Ouvre Sans Scroll et connecte-toi à Instagram.

### Méthode B — xtool dans WSL (tout en local)

1. Installe WSL (Ubuntu), puis dans WSL : Swift 6.4 (swift.org/install/linux) et `sudo apt install usbmuxd`.
2. Télécharge **Xcode** (.xip) sur developer.apple.com/download/all avec ton identifiant Apple gratuit.
3. Installe xtool :
   ```bash
   curl -fL "https://github.com/xtool-org/xtool/releases/latest/download/xtool-$(uname -m).AppImage" -o xtool
   chmod +x xtool && sudo mv xtool /usr/local/bin/
   xtool setup        # choisis 1: Password, puis donne le chemin du Xcode.xip
   ```
4. Connecte l'iPhone à WSL avec **usbipd** (learn.microsoft.com/windows/wsl/connect-usb).
5. Dans le dossier du projet :
   ```bash
   xtool dev run
   ```
   xtool compile, signe et installe directement sur l'iPhone. Puis fais l'étape 4 de la méthode A.

   Sans usbipd, tu peux aussi faire `xtool dev build --ipa` et installer l'IPA avec Sideloadly.

---

## Tous les 7 jours

L'appli s'arrête de s'ouvrir après 7 jours (limite du compte Apple gratuit). Tes réglages et ta connexion Instagram restent.

- **Méthode A** : rebranche l'iPhone et relance Sideloadly avec le même IPA (pas besoin de recompiler).
- **Méthode B** : relance `xtool dev run`.

Pour ne plus y penser, **SideStore** (gratuit) peut renouveler l'appli automatiquement depuis l'iPhone.

---

## Si quelque chose casse

Instagram change souvent son site. Tout ce qui bloque le scroll est dans `scripts/inject.js` (règles en haut du fichier). Après une modif :

```bash
python3 scripts/embed.py     # recopie inject.js dans Sources/SansScroll/Inject.swift
```

puis recompile (push sur GitHub ou `xtool dev run`).

Si Sideloadly ou xtool dit que l'identifiant d'appli est déjà pris, change `bundleID` dans `xtool.yml` (par ex. `fr.jules2.sansscroll`).

## Structure

| Fichier | Rôle |
|---|---|
| `Sources/SansScroll/App.swift` | Point d'entrée de l'appli |
| `Sources/SansScroll/InstagramWebView.swift` | Navigateur Instagram, filtre des liens, caméra, alertes |
| `Sources/SansScroll/BrowserModel.swift` | Réglages et règles de blocage côté iOS |
| `Sources/SansScroll/SettingsView.swift` | Écran Réglages |
| `scripts/inject.js` | Script anti-scroll injecté dans Instagram |
| `Sources/SansScroll/Inject.swift` | Copie générée de `inject.js` |
| `xtool.yml`, `Info.plist`, `Resources/AppIcon.png` | Config, permissions, icône |
| `.github/workflows/build.yml` | Compilation gratuite sur GitHub |
