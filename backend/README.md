# Backend — Social Media App (NestJS)

API REST et temps réel de [social-media-app](../README.md).

## Démarrage

```bash
npm install
cp .env.example .env   # renseignez DB_*, JWT_SECRET et CLOUDINARY_*
npm run start:dev      # http://localhost:3000/api
```

## Scripts utiles

| Commande | Description |
|---|---|
| `npm run start:dev` | Lancement en mode développement (rechargement auto) |
| `npm run build` | Compilation TypeScript |
| `npm run start:prod` | Lancement de la version compilée |
| `npm run lint` | Vérification ESLint |
| `npm test` / `npm run test:e2e` | Tests unitaires / end-to-end |

## Variables d'environnement

| Variable | Description |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | Connexion PostgreSQL |
| `JWT_SECRET` | Clé de signature des tokens JWT |
| `PORT` | Port de l'API (3000 par défaut) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Hébergement des médias |

> ⚠️ Ne jamais committer le fichier `.env` (il est déjà ignoré par `.gitignore`).

Voir le [README principal](../README.md) pour l'architecture complète.
