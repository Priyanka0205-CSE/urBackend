<p align="center">
  <img src="banner.png" alt="urBackend Banner" width="100%" />
</p>
<p align="center">
  <b>The Instant "Backend-as-a-Service" for Frontend Developers.</b><br/>
  Get a managed NoSQL database, JWT Auth, and Cloud Storage in 60 seconds.
</p>

<p align="center">
  <a href="https://urbackend.bitbros.in"><strong>Dashboard</strong></a> ·
  <a href="docs/introduction.md"><strong>Docs</strong></a> ·
  <a href="https://discord.gg/CXJjvJkNWn"><strong>Discord</strong></a>
</p>

<div align="center">

![Build Status](https://img.shields.io/github/actions/workflow/status/yash-pouranik/urbackend/ci.yml?branch=main)
![License](https://img.shields.io/github/license/yash-pouranik/urbackend)
![Issues](https://img.shields.io/github/issues/yash-pouranik/urbackend)
![Stars](https://img.shields.io/github/stars/yash-pouranik/urbackend)

</div>

---

urBackend is an **Open-Source BaaS** built to eliminate the complexity of backend management. It provides everything you need to power your next big idea—accessible via a unified REST API.

## 🟢 Powerful Features

- `>_` **Instant NoSQL Database**: Create collections and push JSON data instantly.
- `>_` **Managed Authentication**: Sign Up, Login, and Profile management with JWT.
- `>_` **Cloud Storage**: Managed file/image uploads with public CDN links.
- `>_` **Bring Your Own Database**: Connect your own MongoDB or Supabase instance.
- `>_` **Real-time Analytics**: Monitor traffic and resource usage from a premium dashboard.
- `>_` **Secure Architecture**: Dual-key separation (`pk_live` & `sk_live`) for total safety.

---

## 🚀 Experience the Pulse

Go from zero to a live backend in **under 60 seconds**.

1.  **Initialize**: Create a project on the [Dashboard](https://urbackend.bitbros.in).
2.  **Model**: Visually define your collections and schemas.
3.  **Execute**: Push and pull data immediately using your Instant API Key.

```javascript
// Power your UI with zero backend boilerplate
const res = await fetch('https://api.urbackend.bitbros.in/api/data/products', {
  headers: { 'x-api-key': 'your_pk_live_key' }
});
```

---

## 🛠️ Infrastructure

<div align="center">

| **Core System** | **Developer UI** | **Data Layer** |
| :--- | :--- | :--- |
| Node.js & Express | React.js (Vite) | MongoDB (Mongoose) |
| JWT Authentication | Lucide React | Redis & BullMQ |
| Storage Manager | Recharts | Supabase (BYOD) |

</div>

---

## 🤝 Community

- [GitHub Issues](https://github.com/yash-pouranik/urbackend/issues): Report bugs & request features.
- [Discord Channel](https://discord.gg/CXJjvJkNWn): Join the conversation.
- [Contributing](CONTRIBUTING.md): Help us grow the ecosystem.

---

## Contributors

<a href="https://github.com/yash-pouranik/urbackend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=yash-pouranik/urbackend" />
</a>

Built with ❤️ by the **urBackend** community.
