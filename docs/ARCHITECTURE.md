# URL Shortener - Architecture Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Component Diagram](#component-diagram)
3. [Sequence Diagrams](#sequence-diagrams)
4. [Data Flow](#data-flow)
5. [Deployment Architecture](#deployment-architecture)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  Web Browser │  │ Mobile App   │  │  External APIs      │  │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬───────────┘  │
│         │                  │                    │               │
└─────────┼──────────────────┼────────────────────┼───────────────┘
          │                  │                    │
          └──────────────────┴────────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │    Load Balancer           │
              │   (Optional - Vercel)      │
              └─────────────┬──────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                      Application Layer                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Express.js Application                      │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │   Security   │  │ Rate Limiter │  │    CORS      │ │   │
│  │  │   (Helmet)   │  │              │  │              │ │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │   │
│  │         └──────────────────┴──────────────────┘         │   │
│  │                       │                                  │   │
│  │         ┌─────────────▼───────────────┐                │   │
│  │         │      Request Router          │                │   │
│  │         └─────────────┬───────────────┘                │   │
│  │                       │                                  │   │
│  │    ┌──────────────────┼──────────────────┐            │   │
│  │    │                  │                  │            │   │
│  │    ▼                  ▼                  ▼            │   │
│  │ ┌────────┐      ┌────────┐       ┌──────────┐       │   │
│  │ │  URL   │      │  Home  │       │ Redirect │       │   │
│  │ │  API   │      │  API   │       │   API    │       │   │
│  │ └───┬────┘      └───┬────┘       └────┬─────┘       │   │
│  └─────┼───────────────┼─────────────────┼─────────────┘   │
│        │               │                  │                  │
│  ┌─────▼───────────────▼──────────────────▼─────────────┐  │
│  │           Business Logic Layer                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│  │
│  │  │  URL Code    │  │  Validation  │  │  QR Code     ││  │
│  │  │  Generator   │  │   Engine     │  │  Generator   ││  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘│  │
│  └─────────────────────────┬──────────────────────────────┘  │
│                            │                                  │
│  ┌─────────────────────────▼──────────────────────────────┐  │
│  │          Data Access Layer (URL Model)                  │  │
│  └─────────────────────────┬──────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                   Data Layer                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         PostgreSQL Database (Supabase)                 │  │
│  │  ┌──────────────┐             ┌──────────────┐       │  │
│  │  │     urls     │──────────┐  │click_details│       │  │
│  │  │   (Table)    │          │  │   (Table)   │       │  │
│  │  └──────────────┘          │  └──────────────┘       │  │
│  │         │                  │         │                │  │
│  │         │  Foreign Key     │         │                │  │
│  │         └──────────────────┘         │                │  │
│  │                                      │                │  │
│  │  ┌───────────────────────────────────▼──────────┐    │  │
│  │  │         Database Triggers                     │    │  │
│  │  │  (Auto-update clicks and timestamps)          │    │  │
│  │  └───────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## Component Diagram

### Detailed Component Breakdown

```
┌──────────────────────────────────────────────────────────────────┐
│                     Express.js Application                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Middleware Stack                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. helmet()          - Security headers                     │ │
│  │ 2. cors()            - CORS configuration                   │ │
│  │ 3. morgan()          - HTTP request logging                 │ │
│  │ 4. rateLimit()       - Rate limiting (100/15min)           │ │
│  │ 5. express.json()    - JSON body parsing                    │ │
│  │ 6. express.urlencoded() - URL-encoded body parsing         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Routes & Controllers                                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  /api/url/shorten (POST)                                  │ │
│  │  ├─→ Validation (express-validator)                       │ │
│  │  ├─→ Duplicate check                                      │ │
│  │  ├─→ Code generation (urlCodeGenerator)                   │ │
│  │  ├─→ Database insertion (Url.create)                      │ │
│  │  └─→ Response with shortened URL                          │ │
│  │                                                             │ │
│  │  /:urlCode (GET)                                          │ │
│  │  ├─→ Database lookup (Url.findOne)                        │ │
│  │  ├─→ Expiration check                                     │ │
│  │  ├─→ Redirect (302)                                       │ │
│  │  └─→ Analytics tracking (async)                           │ │
│  │                                                             │ │
│  │  /api/url/qrcode/:urlCode (GET)                          │ │
│  │  ├─→ Database lookup                                      │ │
│  │  ├─→ QR code generation (qrcode library)                  │ │
│  │  └─→ Return base64 image                                  │ │
│  │                                                             │ │
│  │  /api/url/stats/:urlCode (GET)                           │ │
│  │  ├─→ URL lookup                                           │ │
│  │  ├─→ Click details query                                  │ │
│  │  └─→ Analytics aggregation                                │ │
│  │                                                             │ │
│  │  /api/url/details/:urlCode (GET)                         │ │
│  │  ├─→ URL lookup with expiration info                      │ │
│  │  └─→ Detailed URL information                             │ │
│  │                                                             │ │
│  │  /api/url/edit/:urlCode (PUT)                            │ │
│  │  ├─→ URL update with validation                           │ │
│  │  └─→ Optional expiration reset                            │ │
│  │                                                             │ │
│  │  /api/url/:urlCode (DELETE)                              │ │
│  │  └─→ URL and click details deletion                       │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Utilities                                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  urlCodeGenerator.js                                       │ │
│  │  ├─→ generate(strategy, url, length)                      │ │
│  │  ├─→ encodeBase62(num)                                    │ │
│  │  ├─→ generateFromMD5(url, length)                         │ │
│  │  ├─→ generateFromSHA256(url, length)                      │ │
│  │  ├─→ generateRandom(length)                               │ │
│  │  └─→ generateTimestampBased(length)                       │ │
│  │                                                             │ │
│  │  logger.js                                                 │ │
│  │  ├─→ Winston logger configuration                         │ │
│  │  ├─→ File logging (local)                                 │ │
│  │  └─→ Console logging (serverless)                         │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Models                                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  Url.js (Data Access Layer)                               │ │
│  │  ├─→ create(data)                                         │ │
│  │  ├─→ findOne(query)                                       │ │
│  │  ├─→ findById(id)                                         │ │
│  │  ├─→ update(urlCode, updates)                             │ │
│  │  ├─→ delete(urlCode)                                      │ │
│  │  ├─→ recordClick(urlCode, clickData)                      │ │
│  │  └─→ getClickDetails(urlCode, limit)                      │ │
│  │                                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagrams

### 1. URL Shortening Flow

```
Client          API Server      Validator    CodeGen     Database
  │                 │              │            │            │
  │  POST /shorten  │              │            │            │
  ├────────────────>│              │            │            │
  │                 │              │            │            │
  │                 │  Validate    │            │            │
  │                 ├─────────────>│            │            │
  │                 │              │            │            │
  │                 │   Valid      │            │            │
  │                 │<─────────────┤            │            │
  │                 │              │            │            │
  │                 │              │  Generate  │            │
  │                 │              │   Code     │            │
  │                 ├──────────────┼───────────>│            │
  │                 │              │            │            │
  │                 │              │  urlCode   │            │
  │                 │<─────────────┼────────────┤            │
  │                 │              │            │            │
  │                 │              │            │  Check     │
  │                 │              │            │ Duplicate  │
  │                 ├──────────────┼────────────┼──────────>│
  │                 │              │            │            │
  │                 │              │            │   Unique   │
  │                 │<─────────────┼────────────┼───────────┤
  │                 │              │            │            │
  │                 │              │            │  INSERT    │
  │                 ├──────────────┼────────────┼──────────>│
  │                 │              │            │            │
  │                 │              │            │    OK      │
  │                 │<─────────────┼────────────┼───────────┤
  │                 │              │            │            │
  │   Response      │              │            │            │
  │<────────────────┤              │            │            │
  │  (shortUrl)     │              │            │            │
  │                 │              │            │            │
```

### 2. URL Redirection Flow

```
Client          API Server      Database      Analytics
  │                 │               │              │
  │  GET /:code     │               │              │
  ├────────────────>│               │              │
  │                 │               │              │
  │                 │  SELECT url   │              │
  │                 ├──────────────>│              │
  │                 │               │              │
  │                 │   URL data    │              │
  │                 │<──────────────┤              │
  │                 │               │              │
  │                 │  Check expiry │              │
  │                 ├───────────┐   │              │
  │                 │           │   │              │
  │                 │<──────────┘   │              │
  │                 │  Not expired  │              │
  │                 │               │              │
  │  302 Redirect   │               │              │
  │<────────────────┤               │              │
  │ Location:longUrl│               │              │
  │                 │               │              │
  │                 │               │  Record click│
  │                 │               │ (async)      │
  │                 ├───────────────┼─────────────>│
  │                 │               │              │
  │                 │               │ INSERT click │
  │                 │               │<─────────────┤
  │                 │               │              │
  │                 │               │ UPDATE clicks│
  │                 │               │ (trigger)    │
  │                 │               │<─────────────┤
  │                 │               │              │
```

### 3. QR Code Generation Flow

```
Client          API Server      Database      QRCode Library
  │                 │               │                │
  │ GET /qrcode/:id │               │                │
  ├────────────────>│               │                │
  │                 │               │                │
  │                 │  SELECT url   │                │
  │                 ├──────────────>│                │
  │                 │               │                │
  │                 │   URL data    │                │
  │                 │<──────────────┤                │
  │                 │               │                │
  │                 │               │  Generate QR   │
  │                 ├───────────────┼───────────────>│
  │                 │               │                │
  │                 │               │  Base64 Image  │
  │                 │<──────────────┼────────────────┤
  │                 │               │                │
  │   Response      │               │                │
  │<────────────────┤               │                │
  │  (QR code PNG)  │               │                │
  │                 │               │                │
```

---

## Data Flow

### Code Generation Strategies Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Code Generation Request                     │
│         { strategy, url, id, length }                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  Strategy Selector   │
        └─────────┬───────────┘
                  │
         ┌────────┴────────┬────────────┬────────────┬─────────┐
         │                 │            │            │         │
         ▼                 ▼            ▼            ▼         ▼
    ┌────────┐      ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐
    │ Base62 │      │   MD5    │ │  SHA256  │ │ Random  │ │Timestamp│
    └───┬────┘      └────┬─────┘ └────┬─────┘ └────┬────┘ └───┬────┘
        │                │            │            │           │
        │                │            │            │           │
        ▼                ▼            ▼            ▼           ▼
    num → ID      url+time+rand  url+time+rand  random    timestamp
        │                │            │          bytes         +random
        ▼                ▼            ▼            │           │
   Base62        MD5 Hash      SHA256 Hash       │           │
   Encode        (32 hex)      (64 hex)          │           │
        │                │            │            │           │
        ▼                ▼            ▼            ▼           ▼
   Extract        Take 16 hex    Take 16 hex   Mod 62      Base62
   digits         → BigInt       → BigInt       for each    Encode
        │                │            │          byte          │
        ▼                ▼            ▼            │           │
        │         Mod 62^length  Mod 62^length    │           │
        │                │            │            │           │
        ▼                ▼            ▼            ▼           ▼
    ┌───────────────────────────────────────────────────────────┐
    │              Base62 Encode Result                          │
    │                (0-9, a-z, A-Z)                            │
    └───────────────────┬───────────────────────────────────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  Pad/Truncate│
                 │  to Length    │
                 └──────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │  Final Code   │
                │  (7 chars)    │
                └───────────────┘
```

---

## Deployment Architecture

### Vercel Serverless Deployment

```
┌────────────────────────────────────────────────────────────────┐
│                      Vercel Edge Network                        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Global CDN (Static Assets)                   │ │
│  │         (HTML, CSS, JS, Images)                           │ │
│  └──────────────────┬───────────────────────────────────────┘ │
└─────────────────────┼──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│                  Vercel Serverless Functions                    │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  /api/index.js (Serverless Function)                     │ │
│  │  ├─→ Express app export (module.exports = app)          │ │
│  │  ├─→ No app.listen() in serverless                      │ │
│  │  └─→ Handles all /api/* routes                          │ │
│  │                                                           │ │
│  │  Environment:                                             │ │
│  │  ├─→ Read-only filesystem                               │ │
│  │  ├─→ No persistent state                                │ │
│  │  ├─→ Console logging only (no file writes)              │ │
│  │  └─→ Cold start optimization                            │ │
│  │                                                           │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│                    External Services                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                Supabase (Database)                        │ │
│  │  ├─→ PostgreSQL database                                │ │
│  │  ├─→ Connection pooling                                 │ │
│  │  ├─→ Automatic backups                                  │ │
│  │  └─→ Row-level security                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### Local Development Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Local Development                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Node.js Server (localhost:3000)              │ │
│  │                                                           │ │
│  │  server/index.js                                         │ │
│  │  ├─→ app.listen(3000)                                   │ │
│  │  ├─→ Morgan HTTP logging                                │ │
│  │  ├─→ Winston file logging (logs/)                       │ │
│  │  └─→ Hot reload with nodemon                            │ │
│  │                                                           │ │
│  └──────────────────┬───────────────────────────────────────┘ │
│                     │                                          │
│  ┌──────────────────▼───────────────────────────────────────┐ │
│  │              Static File Serving                          │ │
│  │         (client/index.html, CSS, JS)                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────────────┐
│                    Supabase Cloud                               │
│  (Same as production)                                          │
└────────────────────────────────────────────────────────────────┘
```

---

## Request Flow Examples

### Example 1: Creating a Short URL

```
1. HTTP Request:
   POST https://short.ly/api/url/shorten
   Content-Type: application/json

   {
     "longUrl": "https://example.com/very/long/url/path"
   }

2. Middleware Processing:
   ├─→ helmet()        : Adds security headers
   ├─→ cors()          : Validates origin
   ├─→ morgan()        : Logs request
   ├─→ rateLimit()     : Checks 20/15min limit
   └─→ express.json()  : Parses JSON body

3. Route Handler:
   ├─→ Validates URL format
   ├─→ Checks for existing URL (duplicate)
   ├─→ Generates code: SHA256("https://example.com/very/long/url/path" + timestamp + random)
   │   └─→ Result: "aB3xY7z"
   ├─→ Constructs: https://short.ly/aB3xY7z
   └─→ Inserts into database

4. Database Operation:
   INSERT INTO urls (url_code, long_url, short_url, created_at)
   VALUES ('aB3xY7z', 'https://example.com/...', 'https://short.ly/aB3xY7z', NOW())

5. HTTP Response:
   201 Created
   {
     "success": true,
     "data": {
       "urlCode": "aB3xY7z",
       "shortUrl": "https://short.ly/aB3xY7z",
       "longUrl": "https://example.com/very/long/url/path",
       "clicks": 0
     }
   }
```

### Example 2: Redirecting a Short URL

```
1. HTTP Request:
   GET https://short.ly/aB3xY7z

2. Route Handler:
   ├─→ Extracts code: "aB3xY7z"
   └─→ Queries database

3. Database Query:
   SELECT * FROM urls WHERE url_code = 'aB3xY7z'

   Result: {
     long_url: "https://example.com/very/long/url/path",
     expires_at: null,
     ...
   }

4. Expiration Check:
   IF expires_at IS NOT NULL AND expires_at < NOW():
      RETURN 410 Gone
   ELSE:
      PROCEED

5. HTTP Response:
   302 Found
   Location: https://example.com/very/long/url/path

6. Async Analytics (Background):
   INSERT INTO click_details (url_id, timestamp, user_agent, referer, ip)
   VALUES (1, NOW(), 'Mozilla/5.0...', 'https://google.com', '192.168.1.1')

   Trigger auto-executes:
   UPDATE urls SET clicks = clicks + 1, last_clicked_at = NOW()
   WHERE id = 1
```

---

## Conclusion

This architecture provides:

✅ **Scalability**: Stateless design, horizontal scaling ready
✅ **Reliability**: Error handling, graceful degradation
✅ **Performance**: Async operations, database indexing
✅ **Security**: Rate limiting, input validation, helmet.js
✅ **Maintainability**: Modular design, clear separation of concerns
✅ **Flexibility**: Multiple code generation strategies, configurable

The system handles the complete lifecycle of URL shortening from creation to redirection with comprehensive analytics tracking.
