# METFLIX · Digital Factory

- Site / présentation directement : https://digitalfactory-lab.github.io/Metflix/
- Accès historique conservé : https://digitalfactory-lab.github.io/Metflix/presentation/
- Application des groupes : https://digitalfactory-lab.github.io/Metflix/appli/
- Espace formateur : https://digitalfactory-lab.github.io/Metflix/appli/formateur.html

## Transférer les textes des iPad vers le PC

1. Sur le PC du tournage, ouvrir l’espace formateur et créer une session.
2. Afficher son QR. La présentation reprend automatiquement ce QR si elle est ouverte dans le même navigateur et sur le même domaine GitHub Pages.
3. Un iPad par groupe : scanner le QR, puis inscrire les prénoms. Si le groupe est déjà installé, utiliser « Rejoindre la session » et saisir le code à 12 caractères.
4. Chaque participant prépare sa bande-annonce et clique sur « Envoyer mon texte au formateur ». Un message confirme la réception. Après une modification, renvoyer le texte : sa version précédente sera remplacée.
5. Sur le PC, récupérer chaque Word `.docx` ou le ZIP contenant tous les documents. Les Word contiennent uniquement le texte, sans consigne ni titre ajouté au prompteur. Arial 16 pt, interligne 1,5.
6. Après téléchargement, fermer et effacer la session. Exporter les fiches locales avant de réinitialiser les iPad.

Internet est nécessaire pour le transfert, mais aucun compte de messagerie sur les iPad. Les chronomètres restent indépendants sur chaque appareil.

## Conservation et accès

- Maximum 12 textes par session ; session valable 24 heures.
- Le prénom/surnom, le titre et le texte sont transmis uniquement sur clic. Les cartes détaillées et les évaluations du ressenti ne sont pas transmises.
- Les données de transfert sont stockées dans une base Cloudflare D1 à juridiction UE. Aucune donnée de stagiaire n’est déposée dans GitHub.
- L’accès de lecture et de suppression est un jeton aléatoire conservé uniquement dans le navigateur du PC. Le QR et le code permettent de déposer un texte, pas de consulter les textes du groupe. Garder ce navigateur jusqu’au téléchargement ; ne pas vider ses données avant.
- Les transferts expirent après 24 heures ; une tâche toutes les 30 minutes purge les sessions expirées. La fermeture efface immédiatement les lignes actives. Les mécanismes de sauvegarde du fournisseur suivent sa propre rétention.
- Le navigateur des iPad conserve ses données locales jusqu’à « Nouvelle séance ». La fermeture côté PC n’efface pas ces données locales.

## Architecture et maintenance

`presentation/` et `appli/` : fichiers statiques sur GitHub Pages (branche `main`, racine). Les QR sont générés localement avec la bibliothèque MIT de Kazuhiko Arase, sans service d’images externe.

`transfert/worker.mjs` : API Cloudflare Worker. `transfert/schema.sql` : schéma D1. Le Worker n’est PAS déployé automatiquement par GitHub Pages ; le publier séparément avec les métadonnées conservées dans `transfert/deployment.json`, après toute modification serveur. Ne jamais mettre de clé Cloudflare dans ce dépôt.

Validation : `node tests/transfert-live.mjs` crée une session de test temporaire puis la supprime. Ce test vérifie notamment les droits, le remplacement et la limite de 12 dépôts simultanés. Ne pas le lancer pendant une séance sans nécessité (limite de création anti-abus : 8 sessions/heure/IP).

## Tirages des épisodes

Le premier tirage fournit deux propositions. Chaque participant dispose ensuite de deux échanges maximum. Le compteur est personnel, conservé dans la fiche locale lors des changements de héros, des changements d’étape et des rechargements. Après deux échanges, le bouton est désactivé et la fonction de tirage refuse aussi une tentative supplémentaire. Un échange remplace les deux propositions et efface la sélection précédente. Les propositions du tirage immédiatement précédent sont exclues du nouveau tirage.

Validation locale de cette règle : `node --test tests/episodes.test.mjs`.
