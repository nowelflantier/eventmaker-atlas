# Eventmaker Atlas — Extension Chrome

Extension Chrome/Edge en lecture seule pour cartographier la configuration Eventmaker directement dans `app.eventmaker.io`.

Le projet vise à rendre visibles les dépendances entre objets de configuration sans dépendre de l'outil local historique en `index.html`.

## Fonctionnalités actuelles

- injection d'un bouton `Atlas` dans l'interface Eventmaker ;
- panneau latéral avec navigation métier ;
- détection automatique du contexte courant (`event`, page, objet ouvert) ;
- cache local par événement ;
- refresh manuel uniquement, à partir de la session Eventmaker du navigateur ;
- reconstruction d'un Atlas relationnel dans l'extension.

## Domaines couverts

- `Fields`
  - champs custom et natifs
  - dépendances Liquid
  - références inverses
  - graphe de propagation
- `Segments`
  - parsing des requêtes
  - usages website
  - usages emails
  - graphe de dépendances
- `Formulaires`
  - champs collectés
  - conditions
  - rattachements website
- `Catégories`
  - formulaire, website, networking, automations, emails
- `Emails`
  - templates d'événement
  - sections/settings
  - champs, catégories, segments, automations
  - graphe de dépendances
- `Pages`
  - relations website / formulaires / segments / catégories
- `Networking`
  - règles par population
  - segments et catégories associés
- `Automations`
  - steps, champs lus, segments, catégories, emails, endpoints

## Endpoints actuellement lus

Le refresh reconstruit un snapshot event-level en appelant notamment :

- `guest_fields.json`
- `saved_searches.json`
- `guest_categories.json`
- `registration_forms/:id.json`
- `website.json`
- `website/pages.json`
- `website/section_types.json`
- `workflows.json`
- `email_templates.json`
- `email_templates/:id.json`

## Ce que l'extension ne fait pas encore

- édition métier dans Eventmaker ;
- annotations partagées ;
- synchronisation externe / GitHub / backend ;
- packaging de release automatisé.

## Chargement local

1. Ouvrir `chrome://extensions`
2. Activer le mode développeur
3. Cliquer sur `Load unpacked`
4. Sélectionner ce dossier `extension/`
5. Ouvrir une page `https://app.eventmaker.io` déjà authentifiée

## Notes techniques

- Manifest V3
- Auth : cookie de session Eventmaker déjà présent dans le navigateur
- CSRF : lu depuis `<meta name="csrf-token">` quand disponible
- Stockage snapshots : IndexedDB
- Politique réseau : aucun appel automatique, refresh manuel uniquement

## Repo

Ce repo ne versionne que l'extension.

Le dossier `old/` est gardé localement comme archive de secours et n'est pas commité.
