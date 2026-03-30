# 🐦 X.com Clone - Built on urBackend

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.0-38bdf8?style=for-the-badge&logo=tailwind-css" />
  <img src="https://img.shields.io/badge/urBackend-API-1DA1F2?style=for-the-badge" />
</p>

A **full-featured X.com (Twitter) clone** built entirely on the **urBackend** BaaS platform. This project demonstrates how to build complex social features like infinite scroll, multi-image uploads, and social graphs without writing a custom backend.

---

## ✨ Features

- 🔐 **Authentication** - Secure JWT-based login/signup powered by urBackend Auth.
- 📝 **Tweet Composer** - Text + multi-image uploads (up to 4 images) with previews.
- ❤️ **Social Interactions** - Like, comment, and retweet (coming soon) capabilities.
- 👥 **Relationship Graph** - Real-time Follow/Unfollow system.
- 👤 **Rich Profiles** - Custom avatars, banners, bios, and verified badges.
- 📜 **Home Timeline** - Infinite scrolling feed with optimistic UI updates.
- 🔍 **Explore & Search** - Find users and discover new content.
- 🌓 **Theming** - Full support for Light and Dark modes.
- 📱 **Responsive** - Optimized for mobile, tablet, and desktop.

---

## 🚀 Quick Start

### 1. Prerequisites
- **urBackend Account**: [Sign up here](https://urbackend.bitbros.in)
- **Node.js**: v18+ installed locally
- **MongoDB**: A MongoDB connection string linked to your urBackend project

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/yash-pouranik/urBackend.git
cd examples/social-demo

# Install dependencies for both Client and Proxy Server
cd client && npm install
cd ../server && npm install
```

### 3. urBackend Project Configuration

#### **Step A: Enable Authentication**
In your urBackend Dashboard, go to **Settings** and **Enable Authentication**. This automatically creates the `users` collection with secure password hashing.

#### **Step B: Create Collections**
Create the following collections in your dashboard with these exact schemas:

**1. `users` (Extend the auto-created collection)**
Add these extra fields to the `users` schema:
```json
{
  "username": { "type": "String", "required": true, "unique": true },
  "displayName": { "type": "String" },
  "bio": { "type": "String" },
  "avatar": { "type": "String" },
  "banner": { "type": "String" },
  "verified": { "type": "Boolean", "default": false },
  "followersCount": { "type": "Number", "default": 0 },
  "followingCount": { "type": "Number", "default": 0 }
}
```

**2. `posts`**
```json
{
  "authorId": { "type": "String", "required": true },
  "authorUsername": { "type": "String", "required": true },
  "authorDisplayName": { "type": "String" },
  "authorAvatar": { "type": "String" },
  "authorVerified": { "type": "Boolean", "default": false },
  "content": { "type": "String", "required": true },
  "images": { "type": "Array", "default": [] },
  "likesCount": { "type": "Number", "default": 0 },
  "commentsCount": { "type": "Number", "default": 0 },
  "retweetsCount": { "type": "Number", "default": 0 },
  "createdAt": { "type": "Date", "default": "Date.now" }
}
```

**3. `profiles`**, **4. `comments`**, **5. `likes`**, and **6. `follows`** (See [full schema definitions](#-detailed-schema-reference) below).

### 4. Environment Setup

**Client (`client/.env`)**
```env
VITE_PUBLIC_KEY=pk_live_your_key_here
VITE_API_URL=https://api.ub.bitbros.in
# Required for image uploads only
VITE_PROXY_URL=http://localhost:4000/api/proxy
```

**Server (`server/.env`)**
```env
# Used only by upload proxy (/storage/*)
API_KEY=sk_live_your_key_here
PORT=4000
```

### 5. Run the Application
```bash
# Terminal 1: Start Proxy Server (required for uploads)
cd server && npm start

# Terminal 2: Start React App
cd client && npm run dev
```

---

## 📁 Project Structure

```text
social-demo/
├── client/              # React App (Vite)
│   ├── src/
│   │   ├── components/  # Atomic UI, Post, and Layout components
│   │   ├── contexts/    # Auth state management
│   │   ├── lib/         # API clients (Public API + Upload Proxy)
│   │   └── pages/       # Route-level views (Home, Profile, etc.)
└── server/              # Express Proxy Server
    └── index.js         # Secret Key injection for /storage/*
```

---

## 🔐 Security Architecture

This demo is now **PK-first** and aligned with the latest public APIs:
1. **Public API Client**: Uses `pk_live_*` for `/api/userAuth/*` and `/api/data/*`.
2. **RLS-protected writes**: `posts`, `comments`, `likes`, `follows`, and `profiles` require RLS so authenticated users can write with `pk_live`.
3. **Upload Proxy**: A tiny local server keeps `sk_live_*` only for `/api/storage/*` uploads.

### Required RLS configuration

For each writable collection (`posts`, `comments`, `likes`, `follows`, `profiles`):

- `enabled: true`
- `mode: owner-write-only`
- `ownerField: userId`
- `requireAuthForWrite: true`

> Note: `posts` and `comments` still include `authorId` for app rendering. RLS ownership uses `userId`.

---

## 📊 Detailed Schema Reference

### `profiles`
```json
{
  "userId": { "type": "String", "required": true, "unique": true },
  "username": { "type": "String", "required": true, "unique": true },
  "displayName": { "type": "String" },
  "bio": { "type": "String" },
  "avatar": { "type": "String" },
  "banner": { "type": "String" },
  "verified": { "type": "Boolean", "default": false },
  "location": { "type": "String" },
  "website": { "type": "String" },
  "followersCount": { "type": "Number", "default": 0 },
  "followingCount": { "type": "Number", "default": 0 },
  "createdAt": { "type": "Date", "default": "Date.now" },
  "updatedAt": { "type": "Date", "default": "Date.now" }
}
```

---

### `comments`
```json
{
  "postId": { "type": "String", "required": true },
  "userId": { "type": "String", "required": true },
  "authorId": { "type": "String", "required": true },
  "authorUsername": { "type": "String", "required": true },
  "authorDisplayName": { "type": "String" },
  "authorAvatar": { "type": "String" },
  "content": { "type": "String", "required": true },
  "likesCount": { "type": "Number", "default": 0 },
  "createdAt": { "type": "Date", "default": "Date.now" }
}
```

### `likes`
```json
{
  "userId": { "type": "String", "required": true },
  "targetId": { "type": "String", "required": true },
  "targetType": { "type": "String", "enum": ["post", "comment"] },
  "createdAt": { "type": "Date", "default": "Date.now" }
}
```

### `follows`
```json
{
  "userId": { "type": "String", "required": true },
  "followerId": { "type": "String", "required": true },
  "followingId": { "type": "String", "required": true },
  "createdAt": { "type": "Date", "default": "Date.now" }
}
```

---

## 🐛 Troubleshooting

- **Profile/search pages empty?** Ensure `profiles` collection exists and RLS is enabled with `ownerField=userId`.
- **403 on create/update/delete?** Ensure RLS is enabled on that collection for `pk_live` writes.
- **Images not uploading?** Ensure the `server` is running and `API_KEY` is a secret key (`sk_live_...`) for `/storage/*`.
- **403 Forbidden?** Double-check your **Domain Whitelisting** settings in the urBackend dashboard.
- **Data not appearing?** Verify that your collection names and field types match the schemas above exactly.

---

## 📝 Roadmap

- [ ] Real-time Notifications (WebSockets)
- [ ] Retweet/Quote Tweet functionality
- [ ] Direct Messaging (DM)
- [ ] Hashtag & Trending Topics algorithm

---

Built with ❤️ by the **urBackend** Community.
[Discord](https://discord.gg/CXJjvJkNWn) | [Documentation](https://github.com/yash-pouranik/urBackend/tree/main/docs)
