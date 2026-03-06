# Database Operations 🗄️

urBackend provides a simplified RESTful interface for MongoDB. There is no need to write SQL or complex aggregation pipelines—just use simple JSON.

## Collection Access

All database endpoints follow the pattern:
`https://api.urbackend.bitbros.in/api/data/:collectionName`

Replace `:collectionName` with the name of your collection (e.g., `posts`, `comments`, `inventory`).

## 1. Create a Document

**Endpoint**: `POST /api/data/:collectionName`

```javascript
await fetch('https://api.urbackend.bitbros.in/api/data/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'YOUR_KEY' },
  body: JSON.stringify({
    title: "Why BaaS is the future",
    body: "Content goes here...",
    tags: ["tech", "development"],
    meta: { views: 0, likes: 0 }
  })
});
```

## 2. Read Documents

### Fetch All
**Endpoint**: `GET /api/data/:collectionName`

### Fetch Single Document
**Endpoint**: `GET /api/data/:collectionName/:id`

## 3. Update a Document

**Endpoint**: `PUT /api/data/:collectionName/:id`

urBackend uses `$set` logic, meaning you only need to send the fields you want to change.

```javascript
await fetch(`https://api.urbackend.bitbros.in/api/data/posts/${postId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'YOUR_KEY' },
  body: JSON.stringify({
    "meta.views": 105 // Nested updates are supported!
  })
});
```

## 4. Delete a Document

**Endpoint**: `DELETE /api/data/:collectionName/:id`

## Validation & Schemas

If you define a schema in the dashboard, urBackend will enforce it for every `POST` and `PUT` request. 

- **Object Support**: You can define a field as an `Object` and send nested JSON.
- **Array Support**: Define a field as an `Array` for lists of data.
- **References (Ref)**: Link documents across collections by storing their `_id`.
