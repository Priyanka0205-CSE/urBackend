# Getting Started 🛠️

**Go from an empty project to a production-ready backend in under 60 seconds.** 

urBackend is built for speed and developer freedom. Whether you're using our managed infrastructure or **Bringing Your Own MongoDB**, the setup experience is designed to be seamless.

## 1. Create a Project

Head over to the [urBackend Dashboard](https://urbackend.bitbros.in) and create a new project. You'll instantly receive two keys:

- **Publishable Key (`pk_live_...`)**: Used for frontend requests (Read-Only).
- **Secret Key (`sk_live_...`)**: Used for server-side or administrative actions (Full Access).

## 2. Your First Request

Before pushing data, your **Collections must be pre-configured** in the dashboard. While urBackend offers flexible schema-less options, the collection itself must be registered so your API keys know where to route the data.

To get started, navigate to the **Database** tab in your dashboard and click **"Create Collection"**. Specify a name (e.g., `products`) to initialize your endpoint. 

> **💡 Pro Tip**: You can define a detailed schema during creation, or simply create the collection and start POSTing arbitrary JSON right away—urBackend will handle the rest.

> **⚠️ Note**: Write operations (POST, PUT, DELETE) require your **Secret Key** and should only be performed from a secure backend environment, never from client-side code.


### Example: Storing a Product
```javascript
fetch('https://api.urbackend.bitbros.in/api/data/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_SECRET_KEY' // Use secret key for write operations
  },
  body: JSON.stringify({
    name: "Cyber Node Logo",
    category: "Graphics",
    premium: true
  })
})
.then(res => res.json())
.then(data => console.log("Product saved:", data));
```

## 3. Define Your Models (Recommended)

While urBackend is flexible, we recommend defining **Schemas** in the dashboard. This ensures data integrity and enables features like:
- **Type Checking**: (e.g., ensuring `price` is always a Number).
- **Required Fields**: Preventing incomplete documents from being saved.
- **Complex Types**: Using Objects, Arrays, and References properly.

## 4. Environment Setup

Store your keys in an `.env` file for safety:

```env
VITE_URBACKEND_KEY=pk_live_xxxxxx
URBACKEND_SECRET=sk_live_yyyyyy
```

Now you're ready to dive into [Authentication](authentication.md) or [Database Management](database.md)!
