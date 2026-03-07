# API Quick Reference 📑

| Area | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/userAuth/signup` | Register a new user |
| **Auth** | `POST` | `/api/userAuth/login` | Log in and get JWT |
| **Auth** | `GET` | `/api/userAuth/me` | Get current user profile |
| **Data** | `GET` | `/api/data/:collectionName` | Get all documents in collection |
| **Data** | `GET` | `/api/data/:collectionName/:id` | Get document by ID |
| **Data** | `POST` | `/api/data/:collectionName` | Insert new document |
| **Data** | `PUT` | `/api/data/:collectionName/:id` | Update document by ID |
| **Data** | `DELETE` | `/api/data/:collectionName/:id` | Delete document by ID |
| **Storage** | `POST` | `/api/storage/upload` | Upload a file |
| **Storage** | `DELETE` | `/api/storage/file` | Delete a file by path |

## Status Code Reference

- `200 OK`: Request succeeded.
- `201 Created`: Document/User/File created successfully.
- `400 Bad Request`: Validation failure or malformed JSON.
- `401 Unauthorized`: Missing/Invalid API Key or expired JWT.
- `403 Forbidden`: Resource limit (Quota) exceeded.
- `404 Not Found`: Collection, document, or file does not exist.
- `500 Server Error`: Unexpected problem on our end.
