# Security & Keys 🛡️

urBackend is built with a "Security-First" philosophy. We provide multiple layers of protection to keep your data safe.

## Dual-Key System

We use two distinct types of API keys to prevent accidental data leaks:

| Key Type | Prefix | Shared Environment | Access Level |
| :--- | :--- | :--- | :--- |
| **Publishable** | `pk_live_` | Frontend / Client | Read-Only (Safe if leaked) |
| **Secret** | `sk_live_` | Backend / Server | Full Access (CRUD) |

> [!CAUTION]
> **NEVER** commit your Secret Key to version control (GitHub/GitLab) or use it in frontend code.

## Protection Mechanisms

### 1. NoSQL Injection Prevention
Our API automatically sanitizes all incoming JSON to remove NoSQL operators (keys starting with `$`). This prevents attackers from bypassing checks using techniques like `{"$gt": ""}`.

### 2. Rate Limiting
To prevent DDoS attacks and brute-force attempts:
- **Global API**: Limited to **100 requests per 15 minutes** per IP.
- **Auth Endpoints**: Strictly monitored for repeated failed login attempts.

### 3. Domain Whitelisting
In your dashboard, you can restrict API access to specific domains. When enabled, urBackend will reject any request that doesn't originate from your allowed list.

### 4. Schema Enforcement
When you define a schema, urBackend uses **Mongoose Model Validation** to ensure no "dirty" or unexpected data is saved to your database.
