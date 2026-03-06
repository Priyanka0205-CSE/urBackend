# Getting Started 🛠️

Follow these steps to integrate urBackend into your application in less than a minute.

## 1. Create a Project

Head over to the [urBackend Dashboard](https://urbackend.bitbros.in) and create a new project. You'll instantly receive two keys:

- **Publishable Key (`pk_live_...`)**: Used for frontend requests (Read-Only).
- **Secret Key (`sk_live_...`)**: Used for server-side or administrative actions (Full Access).

## 2. Your First Request

You can start pushing data immediately to any collection. You don't even need to pre-define a schema—urBackend will create the collection on the fly when you first POST data to it.

### Example: Storing a Product
```javascript
fetch('https://api.urbackend.bitbros.in/api/data/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_PUBLISHABLE_KEY'
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
