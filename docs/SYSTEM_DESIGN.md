# URL Shortener - System Design Document

## Table of Contents
1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Core Components](#core-components)
4. [Code Generation Strategies](#code-generation-strategies)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Technical Flow](#technical-flow)
8. [Error Handling](#error-handling)
9. [Scalability Considerations](#scalability-considerations)

---

## Overview

This URL shortener is a production-ready service that converts long URLs into short, manageable links. It supports custom aliases, QR code generation, analytics tracking, and URL expiration.

### Key Features
- **Multiple Code Generation Strategies**: Base62, MD5, SHA-256, Cryptographic Random
- **Custom URL Codes**: Users can specify their own short codes
- **QR Code Generation**: Automatic QR code creation for each shortened URL
- **Analytics**: Track clicks, locations, user agents, and referers
- **Expiration Support**: URLs can have automatic expiration dates
- **Rate Limiting**: Protection against abuse
- **Comprehensive API**: RESTful API with Swagger documentation

---

## System Requirements

### Functional Requirements
1. **URL Shortening**
   - Accept a long URL and generate a unique short code
   - Support custom short codes (3-30 characters)
   - Return the complete shortened URL
   - Validate input URLs (HTTP/HTTPS only, max 2048 characters)

2. **URL Redirection**
   - Redirect short URLs to their original destinations
   - Track analytics data (clicks, location, user agent, referer)
   - Handle expired URLs gracefully

3. **Analytics**
   - Store click details (last 100 clicks per URL)
   - Provide statistics (total clicks, location data, timestamps)
   - Track location with user permission

4. **QR Code Generation**
   - Generate QR codes for shortened URLs
   - Return as base64-encoded PNG images
   - 300x300 pixels with medium error correction

### Non-Functional Requirements
1. **Performance**
   - Sub-100ms response time for URL shortening
   - Sub-50ms response time for redirection
   - Handle 1000+ requests per second

2. **Scalability**
   - Horizontal scaling support
   - Stateless application design
   - Database connection pooling

3. **Reliability**
   - 99.9% uptime
   - Graceful error handling
   - Data persistence and backup

4. **Security**
   - Rate limiting (100 requests per 15 minutes)
   - Input validation and sanitization
   - Helmet.js security headers
   - CORS protection

---

## Core Components

### 1. API Layer (Express.js)
The API layer handles all HTTP requests and responses.

**Responsibilities:**
- Route management
- Request validation
- Response formatting
- Error handling
- Rate limiting

**Key Middleware:**
- `helmet`: Security headers
- `cors`: Cross-origin resource sharing
- `morgan`: HTTP request logging
- `express-rate-limit`: Rate limiting
- `express-validator`: Input validation

### 2. Business Logic Layer
Contains the core URL shortening logic.

**Key Modules:**
- **URL Code Generator** (`server/utils/urlCodeGenerator.js`)
  - Multiple generation strategies
  - Collision detection
  - Base62 encoding/decoding

- **URL Controller** (`server/apis/url/index.js`)
  - URL shortening logic
  - Analytics processing
  - QR code generation

### 3. Data Access Layer
Manages database operations.

**Key Components:**
- **URL Model** (`server/db/models/Url.js`)
  - CRUD operations
  - Query methods
  - Data formatting

- **Database Client** (`server/db/supabase.js`)
  - Connection management
  - Error handling
  - Query execution

### 4. Database (PostgreSQL via Supabase)
Stores all URL mappings and analytics data.

**Tables:**
- `urls`: URL mappings
- `click_details`: Analytics data

---

## Code Generation Strategies

### Strategy 1: Base62 Encoding
**Description:** Converts numeric IDs to Base62 strings (0-9, a-z, A-Z).

**Algorithm:**
```
Base62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

function encodeBase62(num):
    if num == 0: return "0"
    result = ""
    while num > 0:
        remainder = num mod 62
        result = Base62[remainder] + result
        num = num / 62
    return result
```

**Pros:**
- Predictable length
- Sequential generation
- Easy to decode

**Cons:**
- Requires central counter
- Not suitable for distributed systems
- Predictable (security concern)

**Use Case:** Single-server deployments with auto-incrementing IDs

---

### Strategy 2: MD5 Hash
**Description:** Generates codes from MD5 hash of URL + timestamp.

**Algorithm:**
```
function generateFromMD5(url, length=7):
    input = url + timestamp + random
    hash = MD5(input)  // 32 hex characters
    decimal = hex_to_decimal(hash[0:16])
    code = encodeBase62(decimal mod 62^length)
    return pad_to_length(code, length)
```

**Pros:**
- Collision-resistant
- Fast computation
- Distributed-system friendly

**Cons:**
- Not cryptographically secure
- Potential for collisions (handled by regeneration)

**Use Case:** High-throughput systems with collision handling

---

### Strategy 3: SHA-256 Hash (Default)
**Description:** Generates codes from SHA-256 hash of URL + timestamp.

**Algorithm:**
```
function generateFromSHA256(url, length=7):
    input = url + timestamp + random
    hash = SHA256(input)  // 64 hex characters
    decimal = hex_to_decimal(hash[0:16])
    code = encodeBase62(decimal mod 62^length)
    return pad_to_length(code, length)
```

**Pros:**
- Cryptographically secure
- Extremely low collision probability
- Distributed-system friendly
- Unpredictable codes

**Cons:**
- Slightly slower than MD5 (negligible)

**Use Case:** Production systems requiring security and scalability (Recommended)

---

### Strategy 4: Cryptographic Random
**Description:** Generates purely random codes using `crypto.randomBytes()`.

**Algorithm:**
```
function generateRandom(length=7):
    bytes = crypto.randomBytes(length)
    code = ""
    for i in 0 to length-1:
        index = bytes[i] mod 62
        code += Base62[index]
    return code
```

**Pros:**
- Highest randomness
- Cryptographically secure
- No dependencies on URL content

**Cons:**
- Slightly higher collision probability than hash-based
- No deterministic properties

**Use Case:** Maximum security requirements

---

### Strategy 5: Timestamp-Based
**Description:** Combines current timestamp with random suffix.

**Algorithm:**
```
function generateTimestampBased(length=7):
    timestamp = current_time_milliseconds()
    code = encodeBase62(timestamp)
    while code.length < length:
        code += random_base62_char()
    return code.substring(code.length - length)
```

**Pros:**
- Sortable by creation time
- Good uniqueness
- Fast generation

**Cons:**
- Predictable patterns
- Limited by timestamp resolution

**Use Case:** Debugging and chronological ordering needs

---

## Database Schema

### Table: `urls`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Auto-incrementing unique identifier |
| `url_code` | VARCHAR(30) UNIQUE NOT NULL | Short code for the URL |
| `long_url` | TEXT NOT NULL | Original long URL |
| `short_url` | VARCHAR(255) NOT NULL | Complete shortened URL |
| `clicks` | INTEGER DEFAULT 0 | Total click count |
| `is_custom` | BOOLEAN DEFAULT false | Whether code is user-defined |
| `created_at` | TIMESTAMP DEFAULT NOW() | Creation timestamp |
| `last_clicked_at` | TIMESTAMP NULL | Last click timestamp |
| `expires_at` | TIMESTAMP NULL | Expiration timestamp (NULL = never expires) |

**Indexes:**
- Primary key on `id`
- Unique index on `url_code`
- Index on `long_url` for duplicate detection
- Index on `created_at` for analytics queries

---

### Table: `click_details`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Unique identifier |
| `url_id` | INTEGER REFERENCES urls(id) | Foreign key to urls table |
| `timestamp` | TIMESTAMP DEFAULT NOW() | Click timestamp |
| `user_agent` | TEXT | Browser/client user agent |
| `referer` | TEXT | Referring URL |
| `ip` | VARCHAR(45) | Client IP address |
| `latitude` | DECIMAL(10, 8) NULL | Location latitude |
| `longitude` | DECIMAL(11, 8) NULL | Location longitude |
| `accuracy` | INTEGER NULL | Location accuracy in meters |
| `location_permission_granted` | BOOLEAN DEFAULT false | Location permission status |

**Indexes:**
- Primary key on `id`
- Foreign key index on `url_id`
- Index on `timestamp` for time-based queries

**Trigger:**
```sql
CREATE OR REPLACE FUNCTION update_url_clicks()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE urls
    SET clicks = clicks + 1,
        last_clicked_at = NEW.timestamp
    WHERE id = NEW.url_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clicks
AFTER INSERT ON click_details
FOR EACH ROW
EXECUTE FUNCTION update_url_clicks();
```

---

## API Endpoints

### 1. POST /api/url/shorten
**Purpose:** Create a shortened URL

**Request Body:**
```json
{
  "longUrl": "https://example.com/very/long/url",
  "customCode": "my-link",  // optional
  "expiresIn": 720          // optional, hours
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "URL shortened successfully",
  "data": {
    "id": 1,
    "urlCode": "abc123",
    "longUrl": "https://example.com/very/long/url",
    "shortUrl": "http://localhost:3000/abc123",
    "clicks": 0,
    "isCustom": false,
    "date": "2024-01-01T12:00:00.000Z",
    "expiresAt": "2024-02-01T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid URL or validation error
- `409 Conflict`: Custom code already taken
- `500 Internal Server Error`: Server error

---

### 2. GET /:urlCode
**Purpose:** Redirect to original URL and track analytics

**Response:**
- `302 Found`: Redirects to long URL
- `404 Not Found`: URL code doesn't exist
- `410 Gone`: URL has expired

---

### 3. GET /api/url/qrcode/:urlCode
**Purpose:** Generate QR code for shortened URL

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "urlCode": "abc123",
    "shortUrl": "http://localhost:3000/abc123",
    "longUrl": "https://example.com",
    "qrCode": "data:image/png;base64,iVBORw0KG..."
  }
}
```

---

### 4. GET /api/url/stats/:urlCode
**Purpose:** Get analytics for a shortened URL

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "urlCode": "abc123",
    "longUrl": "https://example.com",
    "shortUrl": "http://localhost:3000/abc123",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "totalClicks": 42,
    "lastClickedAt": "2024-01-15T14:30:00.000Z",
    "clicksWithLocation": 25,
    "locationPermissionRate": "59.52%",
    "recentClicks": [...]
  }
}
```

---

## Technical Flow

### URL Shortening Flow

```
1. Client Request
   │
   ├─→ [POST /api/url/shorten]
   │   └─→ Body: { longUrl, customCode?, expiresIn? }
   │
2. API Layer (Express)
   │
   ├─→ Rate Limiting Check
   │   └─→ Reject if > 20 URLs/15min per IP
   │
   ├─→ Input Validation
   │   ├─→ Validate URL format (HTTP/HTTPS)
   │   ├─→ Check URL length (max 2048 chars)
   │   ├─→ Validate custom code (3-30 chars, alphanumeric)
   │   └─→ Validate expiration (1-8760 hours)
   │
3. Business Logic Layer
   │
   ├─→ Check for Duplicate URL (if no custom code)
   │   ├─→ Query database for existing longUrl
   │   └─→ Return existing if found
   │
   ├─→ Handle Custom Code
   │   ├─→ If customCode provided:
   │   │   ├─→ Check if code already exists
   │   │   └─→ Return 409 Conflict if taken
   │   │
   │   └─→ If no customCode:
   │       ├─→ Generate code using strategy (SHA-256 default)
   │       ├─→ Check for collisions
   │       └─→ Regenerate up to 5 times if collision
   │
   ├─→ Construct Short URL
   │   └─→ shortUrl = baseUrl + "/" + urlCode
   │
   ├─→ Calculate Expiration (if specified)
   │   └─→ expiresAt = now + expiresIn hours
   │
4. Data Access Layer
   │
   ├─→ Insert URL Record
   │   └─→ INSERT INTO urls (url_code, long_url, short_url, ...)
   │
5. Response
   │
   └─→ Return JSON
       └─→ { success, data: { urlCode, shortUrl, ... } }
```

---

### URL Redirection Flow

```
1. Client Request
   │
   ├─→ [GET /:urlCode]
   │
2. API Layer
   │
   ├─→ Extract urlCode from path
   │
3. Business Logic Layer
   │
   ├─→ Query Database
   │   └─→ SELECT * FROM urls WHERE url_code = ?
   │
   ├─→ Check if URL Exists
   │   └─→ If not found: Return 404
   │
   ├─→ Check if Expired
   │   └─→ If expires_at < now: Return 410 Gone
   │
   ├─→ Redirect to Original URL
   │   └─→ HTTP 302 Found, Location: longUrl
   │
4. Analytics Tracking (Async)
   │
   ├─→ Capture Click Data
   │   ├─→ Timestamp
   │   ├─→ User Agent
   │   ├─→ Referer
   │   ├─→ IP Address
   │   └─→ Location (if permitted)
   │
   ├─→ Store Click Detail
   │   └─→ INSERT INTO click_details
   │
   └─→ Update URL Clicks (via trigger)
       ├─→ Increment clicks count
       └─→ Update last_clicked_at
```

---

## Error Handling

### Input Validation Errors (400 Bad Request)
```javascript
{
  "success": false,
  "errors": [
    "Please provide a valid URL with http or https protocol",
    "URL is too long (maximum 2048 characters)"
  ]
}
```

### Custom Code Conflict (409 Conflict)
```javascript
{
  "success": false,
  "message": "Custom code is already taken. Please choose another one."
}
```

### URL Not Found (404 Not Found)
```javascript
{
  "success": false,
  "message": "Short URL not found"
}
```

### Expired URL (410 Gone)
```javascript
{
  "success": false,
  "message": "This short URL has expired",
  "expiresAt": "2024-01-15T12:00:00.000Z"
}
```

### Rate Limit Exceeded (429 Too Many Requests)
```
Too many URLs created from this IP, please try again later.
```

### Internal Server Error (500)
```javascript
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Scalability Considerations

### 1. Horizontal Scaling
- Stateless application design
- Load balancer distribution
- Multiple server instances
- Shared database connection

### 2. Database Optimization
- Connection pooling (Supabase)
- Indexed queries
- Read replicas for analytics
- Periodic cleanup of old click_details

### 3. Caching Strategy
- Redis cache for frequently accessed URLs
- Cache expiration aligned with URL expiration
- Cache invalidation on URL updates/deletes

### 4. Rate Limiting
- Distributed rate limiting with Redis
- IP-based and user-based limits
- Different limits for authenticated vs anonymous users

### 5. Code Generation Collision Handling
With 7-character Base62 codes:
- Total possible codes: 62^7 = 3.5 trillion
- At 1000 URLs/second: Would take 111 years to exhaust
- Collision probability: Extremely low with SHA-256
- Regeneration strategy handles rare collisions

### 6. Database Partitioning
- Partition `click_details` by timestamp
- Archive old data to cold storage
- Maintain only recent data (e.g., last 90 days) in hot storage

---

## Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=production
NODE_PORT=3000
NODE_HOSTNAME=localhost
NODE_PROTOCOL=http

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key

# URL Shortener Configuration
CODE_GENERATION_STRATEGY=sha256  # Options: sha256, md5, random, timestamp, base62
CODE_LENGTH=7                     # Length of generated codes (6-10 recommended)
DEFAULT_URL_EXPIRATION_HOURS=720  # 30 days default

# Deployment (Vercel)
VERCEL_URL=your-app.vercel.app
```

### Strategy Selection Guide

| Strategy | Use Case | Pros | Cons |
|----------|----------|------|------|
| **sha256** (Default) | Production systems | Secure, collision-resistant | Slightly slower |
| **md5** | High-throughput | Fast, good distribution | Not cryptographically secure |
| **random** | Maximum security | Unpredictable | Higher collision probability |
| **timestamp** | Debugging | Sortable, unique | Predictable |
| **base62** | Single server | Predictable length | Requires central counter |

---

## Conclusion

This URL shortener implements a production-ready system with:
- ✅ Multiple code generation strategies (Base62, MD5, SHA-256)
- ✅ Collision-resistant unique code generation
- ✅ Comprehensive error handling
- ✅ Analytics and tracking
- ✅ QR code generation
- ✅ Security best practices
- ✅ Scalability considerations
- ✅ Complete API documentation

The system is designed for high availability, scalability, and maintainability, suitable for handling millions of URL shortenings with sub-100ms latency.
