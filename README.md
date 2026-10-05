# 📱 Social Media App

Application de réseau social complète inspirée d'Instagram : une **app mobile React Native (Expo)** connectée à une **API REST + temps réel NestJS / PostgreSQL**.

![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

---

## ✨ Fonctionnalités

**Comptes & profils**
- Inscription / connexion avec **JWT** (Passport local + JWT, mots de passe hachés avec bcrypt)
- Édition du profil, abonnements (follow / unfollow), pages de profil des autres utilisateurs

**Contenu**
- Publications avec photos, **likes**, **commentaires** (et likes de commentaires), **enregistrement** et **partage** de posts
- **Reels** (vidéos courtes) et **Stories** avec visionneuse plein écran
- Page **Explore** pour découvrir de nouveaux contenus
- **Caméra** intégrée et accès à la galerie (expo-camera, expo-media-library)
- Upload et hébergement des médias via **Cloudinary**

**Temps réel**
- **Messagerie privée** (DM) en temps réel via WebSocket / Socket.IO
- **Notifications** en direct (likes, commentaires, nouveaux abonnés…)

**Divers**
- Publicités sponsorisées dans le fil (module `ads`)
- Thème clair / sombre
- Script de `seed` pour remplir la base avec des données de démonstration

---

## 🏗️ Architecture

```
┌───────────────────────────┐     REST (HTTP/JSON)     ┌──────────────────────────────┐
│  frontend/ (Expo)         │ ───────────────────────▶ │  backend/ (NestJS)           │
│  React Native + Expo      │                          │  /api  ─ Auth, Users, Posts, │
│  Router, Context API      │ ◀──── WebSocket ───────▶ │  Stories, Chat, Media, Ads,  │
│  (Auth, Theme)            │      (Socket.IO)         │  Notifications               │
└───────────────────────────┘                          └──────────────┬───────────────┘
                                                                      │ TypeORM
                                                       ┌──────────────▼───────────────┐
                                                       │ PostgreSQL     Cloudinary    │
                                                       └──────────────────────────────┘
```

### Backend (`backend/src`)

| Module | Rôle |
|---|---|
| `auth` | Inscription, connexion, stratégies Passport (local + JWT), guards, décorateur `@CurrentUser` |
| `users` | Profils, mise à jour, système de follow |
| `posts` | Posts, reels, likes, commentaires, posts enregistrés, partage |
| `stories` | Création et lecture des stories |
| `chat` | Conversations et messages + gateway WebSocket |
| `notifications` | Stockage et diffusion en temps réel des notifications |
| `media` | Upload des fichiers vers Cloudinary |
| `ads` | Gestion des publicités dans le fil |

Validation des entrées avec `class-validator` (DTO) et `ValidationPipe` global.

### Frontend (`frontend/`)

Navigation basée sur les fichiers avec **Expo Router** : `index` (fil d'actualité), `explore`, `Reels`, `Camera`, `DirectMessages`, `conversation/[id]`, `story/[userId]`, `user/[username]`, `Profile`, `Auth`.

---

## 🚀 Lancer le projet

### Prérequis
- Node.js 18+
- PostgreSQL
- Un compte [Cloudinary](https://cloudinary.com) (gratuit)
- L'application **Expo Go** sur votre téléphone, ou un émulateur Android / iOS

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # puis remplissez les valeurs (base de données, JWT_SECRET, Cloudinary)
npm run start:dev         # API disponible sur http://localhost:3000/api
```

Optionnel : remplir la base avec des données de démo via le script `src/seed.ts`.

### 2. Frontend

```bash
cd frontend
npm install
```

Dans `frontend/config/env.ts`, indiquez l'adresse de l'API :
- émulateur Android : `http://10.0.2.2:3000/api`
- simulateur iOS / web : `http://localhost:3000/api`
- téléphone physique : `http://<IP-locale-de-votre-PC>:3000/api`

```bash
npx expo start
```

Scannez le QR code avec Expo Go.

---

## 🛠️ Stack technique

**Mobile :** React Native · Expo · Expo Router · TypeScript · AsyncStorage · Reanimated
**API :** NestJS · TypeORM · PostgreSQL · Passport (JWT) · bcrypt · Socket.IO · Multer · Cloudinary · class-validator

---

## 👩‍💻 Auteure

**Farahe El-Montaser** — [@farahe-elmontaser](https://github.com/farahe-elmontaser)
