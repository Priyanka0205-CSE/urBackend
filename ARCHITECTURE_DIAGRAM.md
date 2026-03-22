# urBackend — Architecture Diagram

## 1. System Overview

```mermaid
graph TB
    subgraph Clients["👤 Clients"]
        DEV["Developer\n(Dashboard User)"]
        EXTAPP["External App\n(API Consumer)"]
    end

    subgraph Frontend["🖥️ Frontend — Vite + React\nurbackend.bitbros.in"]
        PAGES["Pages\nLogin / Register / Dashboard\nProject Detail / Storage / Analytics"]
        CTX["AuthContext"]
        COMPS["Components\nNavbar / Modals / Tables / Charts"]
    end

    subgraph DashboardAPI["🔐 Dashboard API — Express.js\nadmin.urbackend.com\nPort: 1234"]
        DASH_APP["app.js\nDashboard Entry Point"]

        subgraph DashMiddleware["🛡️ Dashboard Middleware"]
            RL_DASH["dashboardLimiter\n1000 req / 15 min"]
            CORS_ADMIN["Strict CORS\nWhitelist: Frontend URL only"]
            AUTH_MW["authMiddleware\nJWT (Developer)"]
            VERIFY_EMAIL["verifyEmail\nOwner isVerified check"]
        end

        subgraph DashRoutes["📡 Dashboard Routes"]
            R_AUTH["/api/auth"]
            R_PROJ["/api/projects"]
            R_RELEASES["/api/releases"]
        end

        subgraph DashControllers["🧩 Dashboard Controllers"]
            C_AUTH["auth.controller\nregister / login\nchange-password / delete\nsendOtp / verifyOtp"]
            C_PROJ["project.controller\ncreateProject / updateProject\ncreateCollection / deleteCollection\ngetData / insertData / editRow\ndeleteRow / uploadFile / listFiles\ndeleteFile / analytics\nupdateExternalConfig"]
        end
    end

    subgraph PublicAPI["🌍 Public API — Express.js\napi.urbackend.com\nPort: 1235"]
        PUBLIC_APP["app.js\nPublic Entry Point"]

        subgraph PublicMiddleware["🛡️ Public API Middleware"]
            RL_API["apiLimiter\n(limiter)"]
            CORS_PUBLIC["Open CORS\nProject-based validation"]
            API_MW["verifyApiKey\nHashed API Key + Redis Cache"]
            LOGGER["logger\nAPI usage logger"]
        end

        subgraph PublicRoutes["📡 Public Routes"]
            R_DATA["/api/data"]
            R_UAUTH["/api/userAuth"]
            R_STORE["/api/storage"]
            R_SCHEMA["/api/schemas"]
        end

        subgraph PublicControllers["🧩 Public Controllers"]
            C_DATA["data.controller\ninsertData / getAllData\ngetSingleDoc / updateSingleData\ndeleteSingleDoc"]
            C_UAUTH["userAuth.controller\nsignup / login / me"]
            C_STORE["storage.controller\nuploadFile / deleteFile\ndeleteAllFiles"]
            C_SCHEMA["schema.controller\ncheckSchema / createSchema"]
        end
    end

    subgraph SharedCommon["📦 @urbackend/common\nShared Package"]
        subgraph Utils["🔧 Shared Utils / Services"]
            CONN_MGR["connection.manager\nBYOD DB connections\n(registry cache)"]
            INJECT["injectModel\nDynamic Mongoose Model"]
            QUERY["queryEngine\nDynamic Query Builder"]
            STORE_MGR["storage.manager\nSupabase / External Storage"]
            EMAIL["emailService\nNodemailer / SMTP"]
            ENCRYPT["encryption\nAES-256-GCM"]
            GC["GC.js\nGarbage Collector\n(stale connections + storage)"]
            REDIS["redisCaching.js\nProject-by-APIKey Cache"]
            VALID["input.validation\nSchema-based Validator"]
        end
    end

    subgraph Data["🗄️ Data Layer"]
        MONGO_MAIN["MongoDB Atlas\n(urBackend Internal DB)"]
        MONGO_EXT["External MongoDB\n(BYOD — User's own DB)"]
        SUPABASE["Supabase Storage\n(urBackend Internal)"]
        SUPABASE_EXT["External Storage\n(BYOD — User's own)"]
        REDIS_DB["Redis\n(Upstash)"]
    end

    DEV -->|"Browser"| Frontend
    EXTAPP -->|"x-api-key header"| PublicAPI

    Frontend -->|"JWT Bearer Token"| DashboardAPI
    
    DASH_APP --> DashRoutes
    R_AUTH --> CORS_ADMIN --> AUTH_MW --> C_AUTH
    R_PROJ --> CORS_ADMIN --> RL_DASH --> AUTH_MW --> VERIFY_EMAIL --> C_PROJ
    R_RELEASES --> CORS_ADMIN --> C_PROJ
    
    PUBLIC_APP --> PublicRoutes
    R_DATA --> CORS_PUBLIC --> API_MW --> LOGGER --> C_DATA
    R_UAUTH --> CORS_PUBLIC --> API_MW --> LOGGER --> C_UAUTH
    R_STORE --> CORS_PUBLIC --> API_MW --> LOGGER --> C_STORE
    R_SCHEMA --> CORS_PUBLIC --> API_MW --> LOGGER --> C_SCHEMA

    C_AUTH --> MONGO_MAIN
    C_PROJ --> CONN_MGR
    C_DATA --> CONN_MGR
    C_UAUTH --> CONN_MGR
    C_STORE --> STORE_MGR
    C_SCHEMA --> CONN_MGR

    DashboardAPI -.->|"Uses"| SharedCommon
    PublicAPI -.->|"Uses"| SharedCommon

    CONN_MGR -->|"isExternal: false"| MONGO_MAIN
    CONN_MGR -->|"isExternal: true\n(decrypt config)"| MONGO_EXT
    STORE_MGR -->|"isExternal: false"| SUPABASE
    STORE_MGR -->|"isExternal: true"| SUPABASE_EXT

    API_MW -->|"Cache lookup"| REDIS_DB

    C_AUTH --> EMAIL
```

---

## 2. API Request Flow — External App (API Key)

**Public API Server Flow**

```mermaid
sequenceDiagram
    participant App as External App
    participant PublicAPI as Public API Server
    participant MW as verifyApiKey Middleware
    participant Redis as Redis Cache
    participant DB as MongoDB (Projects)
    participant Ctrl as Controller
    participant DataDB as Data DB (Internal / External)

    App->>PublicAPI: Request with x-api-key header
    PublicAPI->>MW: Route to middleware
    MW->>Redis: Lookup hashed API key
    alt Cache hit
        Redis-->>MW: Return cached project
    else Cache miss
        MW->>DB: findOne({ apiKey: hashedKey })
        DB-->>MW: Project doc (with owner, resources)
        MW->>Redis: Store in cache
    end
    MW->>MW: Check owner.isVerified
    MW->>Ctrl: req.project attached → next()
    Ctrl->>DataDB: Query (internal or external via connection.manager)
    DataDB-->>Ctrl: Results
    Ctrl-->>PublicAPI: JSON Response
    PublicAPI-->>App: JSON Response
```

---

## 3. BYOD (Bring Your Own Database/Storage) Flow

```mermaid
flowchart TD
    A["API Request arrives"] --> B["verifyApiKey middleware\nattaches req.project"]
    B --> C{"project.resources.db\n.isExternal?"}
    C -->|No| D["Use urBackend shared\nMongoDB connection"]
    C -->|Yes| E["connection.manager.js\nCheck registry cache"]
    E --> F{"Active connection\nin registry?"}
    F -->|Yes| G["Reuse cached connection"]
    F -->|No| H["Decrypt AES-256-GCM\ncredentials from Project doc"]
    H --> I["mongoose.createConnection(dbUri)"]
    I --> J["Store in registry\nwith lastAccessed timestamp"]
    J --> G
    G --> K["injectModel.js\nCreate dynamic Mongoose model\nfor collection + schema"]
    D --> K
    K --> L["queryEngine.js\nBuild + execute query"]
    L --> M["Return result to controller"]
```

---

## 4. MongoDB Data Models

```mermaid
erDiagram
    Developer {
        ObjectId _id
        string email
        string password
        boolean isVerified
        date createdAt
        date updatedAt
    }

    Project {
        ObjectId _id
        string name
        string description
        ObjectId owner
        string apiKey
        string jwtSecret
        number storageUsed
        number storageLimit
        number databaseUsed
        number databaseLimit
        object resources
        date createdAt
        date updatedAt
    }

    Collection {
        string name
        FieldSchema[] model
    }

    FieldSchema {
        string key
        string type
        boolean required
    }

    OTP {
        ObjectId userId
        string otp
        date createdAt
    }

    Log {
        ObjectId project
        string method
        string route
        number status
        number responseTime
        date createdAt
    }

    Developer ||--o{ Project : "owns"
    Project ||--o{ Collection : "has"
    Collection ||--o{ FieldSchema : "has fields"
    Project ||--o{ Log : "generates"
    Developer ||--o{ OTP : "receives"
```

---

## 5. Frontend Structure (Vite + React)

```mermaid
graph TD
    subgraph Entry["Entry"]
        MAIN["main.jsx"]
        APP["App.jsx\nReact Router"]
    end

    subgraph Providers["Providers"]
        AUTHCTX["AuthContext\n(JWT token + developer state)"]
    end

    subgraph Pages["Pages"]
        LP["Landing Page"]
        LOGIN["Login / Register"]
        DASH["Dashboard\n(Projects list)"]
        PROJ["Project Detail\n(Collections, API Key, Settings)"]
        COLL["Collection View\n(Browse & manage data)"]
        STORE_PG["Storage Page\n(File upload / delete)"]
        ANALYTICS["Analytics Page"]
        PROFILE["Profile Page"]
        BYOD_PG["BYOD Config Page"]
    end

    subgraph Components["Shared Components"]
        NAVBAR["Navbar"]
        SIDEBAR["Sidebar"]
        MODALS["Modals\n(Create Project / Collection,\nBulk Mail, Schema, etc.)"]
        TABLES["Data Tables"]
        CHARTS["Usage Charts"]
    end

    MAIN --> APP
    APP --> AUTHCTX
    AUTHCTX --> Pages
    Pages --> Components
    Pages -->|"fetch / axios"| BackendAPI["Backend REST API"]
```

---

## 6. Security & Rate Limiting

| Server | Layer | Mechanism | Limit / Detail |
|---|---|---|---|
| **Dashboard API** | Dashboard routes | `dashboardLimiter` | 1000 req / 15 min |
| **Dashboard API** | Developer auth | JWT (`authMiddleware`) | Bearer token, signed per dev |
| **Dashboard API** | Email verification gate | `verifyEmail` | `owner.isVerified` must be `true` |
| **Dashboard API** | CORS | Strict whitelist | `FRONTEND_URL` only (urbackend.bitbros.in) |
| **Public API** | API consumer routes | `limiter` (custom) | Configurable per project |
| **Public API** | API consumer auth | `verifyApiKey` | SHA-256 hashed key + Redis cache |
| **Public API** | CORS | Open CORS | Project-based, allows any origin |
| **Both** | Credential storage | AES-256-GCM encryption | BYOD DB/Storage configs encrypted in MongoDB |
| **Both** | File uploads | `multer` memory storage | 10 MB per file limit |
| **Both** | Request monitoring | Kiroo SDK | Session replay & error tracking |

---

## 7. Infrastructure Overview

```mermaid
graph TB
    subgraph Hosting["☁️ Hosting"]
        FE["Frontend\nVercel\nurbackend.bitbros.in"]
        DASH_BE["Dashboard API Server\nRender / Railway\nadmin.urbackend.com\nPort: 1234"]
        PUB_BE["Public API Server\nRender / Railway\napi.urbackend.com\nPort: 1235"]
    end

    subgraph External["🔌 External Services"]
        MONGO["MongoDB Atlas\n(Primary DB)"]
        RDS["Upstash Redis\n(API Key Cache)"]
        SUP["Supabase\n(File Storage)"]
        SMTP["SMTP Server\n(OTP / Emails)"]
    end

    subgraph Shared["📦 Shared"]
        COMMON["@urbackend/common\nModels, Utils, Services,\nMiddleware, Queues"]
    end

    subgraph BYOD["🔧 BYOD (User-owned)"]
        USER_MONGO["User's MongoDB Atlas"]
        USER_SUP["User's Supabase"]
    end

    ExternalApp["External App\n(API Consumer)"]
    DevUser["Developer\n(Dashboard User)"]
    
    DevUser -->|"HTTPS REST"| FE
    FE -->|"JWT Auth"| DASH_BE
    ExternalApp -->|"x-api-key"| PUB_BE
    
    DASH_BE --> MONGO
    DASH_BE --> RDS
    DASH_BE --> SMTP
    DASH_BE -.->|"Imports"| COMMON
    
    PUB_BE --> MONGO
    PUB_BE --> RDS
    PUB_BE --> SUP
    PUB_BE -.->|"Imports"| COMMON
    PUB_BE -.->|"Optional BYOD"| USER_MONGO
    PUB_BE -.->|"Optional BYOD"| USER_SUP
```

### Deployment Strategy

- **Dashboard API**: Handles developer/admin operations (auth, project management, releases)
- **Public API**: Handles external app requests (data CRUD, user auth, storage, schemas)
- **Shared Package**: `@urbackend/common` contains all shared code (models, utils, services)
- **Independent Scaling**: Each server can scale independently based on traffic
- **Fault Isolation**: If one server fails, the other continues to operate
- **Different Domains**: Separate domains for clear separation of concerns
