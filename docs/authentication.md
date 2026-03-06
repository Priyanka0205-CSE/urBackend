# Authentication 🔐

urBackend includes a built-in authentication system that manages user registration, login, and profile retrieval using **JSON Web Tokens (JWT)**.

## The `users` Collection Contract

To enable authentication, your project must have a collection named `users`. 

> [!IMPORTANT]
> **Schema Requirements**:
> The `users` collection **MUST** contain at least these two fields:
> 1. `email` (String, Required, Unique)
> 2. `password` (String, Required)
>
> You can add any other fields (e.g., `username`, `avatar`, `preferences`), and urBackend's Mongoose-powered validation will handle them automatically during signup.

## 1. Sign Up User

Creates a new user and returns a 7-day JWT token.

**Endpoint**: `POST /api/userAuth/signup`

```javascript
await fetch('https://api.urbackend.bitbros.in/api/userAuth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'YOUR_KEY' },
  body: JSON.stringify({
    email: "dev@example.com",
    password: "securePassword123",
    username: "dev_pulse",
    preferences: { theme: "dark", notifications: true } // Custom fields are supported!
  })
});
```

## 2. Login User

Authenticates credentials and returns a 7-day JWT token.

**Endpoint**: `POST /api/userAuth/login`

```javascript
const res = await fetch('https://api.urbackend.bitbros.in/api/userAuth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': 'YOUR_KEY' },
  body: JSON.stringify({
    email: "dev@example.com",
    password: "securePassword123"
  })
});
const { token } = await res.json();
```

## 3. Get Profile (Me)

Fetches the details of the currently authenticated user.

**Endpoint**: `GET /api/userAuth/me`

```javascript
await fetch('https://api.urbackend.bitbros.in/api/userAuth/me', {
  headers: {
    'x-api-key': 'YOUR_KEY',
    'Authorization': `Bearer ${USER_TOKEN}`
  }
});
```

## Security Note

- **JWT Expiration**: Tokens expire after **7 days**. Ensure your frontend handles token refresh or re-login logic.
- **Passwords**: Passwords are automatically hashed using **Bcrypt** before being stored. Even project owners cannot see raw user passwords.
