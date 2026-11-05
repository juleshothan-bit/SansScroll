# Sans Scroll

Instagram avec ton vrai compte, mais sans pubs et sans Reels.

- **Fil d'actualité normal**, publicités masquées
- **Reels bloqués** : onglet Reels, pages Reels et (en option) Reels reçus en message
- **Notifications** : likes, commentaires, abonnés, mentions (vérifiés toutes les 30 s, même écran verrouillé) ; messages privés signalés quand l'appli est ouverte
- **Couleurs Instagram** : icône, bouton Réglages, écran de blocage
- DM, stories, profils, publication : tout le reste marche normalement
- Les liens externes s'ouvrent dans Safari

Réglages : bouton rond en dégradé, en bas à droite de l'accueil.

## Installer ou mettre à jour sur l'iPhone (Windows, gratuit)

1. Récupère `SansScroll.ipa` : onglet **Actions** de ce dépôt → dernier build vert → **Artifacts** → **SansScroll-ipa** (un .zip à extraire).
2. Branche l'iPhone en USB, ouvre **Sideloadly**, choisis `SansScroll.ipa`, clique sur **Start**.
3. Première installation seulement :
   - Réglages → Confidentialité et sécurité → **Mode développeur** → activer
   - Réglages → Général → **VPN et gestion de l'appareil** → ton identifiant Apple → **Faire confiance**
4. À la première ouverture, autorise les **notifications**.

**Tous les 7 jours**, l'appli expire (compte Apple gratuit) : rebranche l'iPhone et relance Sideloadly avec le même fichier. Ta connexion Instagram reste.

Pour que les notifications continuent, ne ferme pas Sans Scroll depuis le sélecteur d'applis.

## Modifier l'appli

Chaque modification envoyée sur GitHub recompile l'appli automatiquement (onglet Actions). Mets `[skip ci]` dans le message pour ne pas recompiler.

| Fichier | Rôle |
|---|---|
| `scripts/inject.js` | Script injecté dans Instagram : pubs, Reels, couleurs, bouton Réglages |
| `Sources/SansScroll/Notifier.swift` | Notifications en arrière-plan |
| `Sources/SansScroll/InstagramWebView.swift` | Navigateur Instagram, filtre des liens |
| `Sources/SansScroll/BrowserModel.swift` | Réglages et règles de blocage |
| `Sources/SansScroll/SettingsView.swift` | Écran Réglages |
| `scripts/embed.py`, `scripts/make_icon.py` | Lancés au build : intègrent le script et génèrent l'icône |
| `Info.plist`, `xtool.yml` | Permissions, nom et identifiant de l'appli |
| `.github/workflows/build.yml` | Compilation gratuite sur un Mac de GitHub |

Si Instagram change son site et qu'une pub ou un Reel repasse, c'est `scripts/inject.js` qu'il faut ajuster.
