# URL Shortener API Documentation

## Base URL

```
Development: http://localhost:3000
Production:  https://your-domain.vercel.app
```

## Authentication

This API currently does not require authentication. Rate limiting is applied based on IP address.

## Rate Limits

- **Global**: 100 requests per 15 minutes per IP
- **URL Creation**: 20 requests per 15 minutes per IP

---

## Endpoints

### 1. Create Shortened URL

Creates a new shortened URL with optional custom code and expiration.

**Endpoint:** `POST /api/url/shorten`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "longUrl": "https://example.com/very/long/url",  // Required
  "customCode": "my-custom-link",                    // Optional (3-30 chars)
  "expiresIn": 720                                   // Optional (hours, 1-8760)
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "URL shortened successfully",
  "data": {
    "id": 1,
    "urlCode": "aB3xY7z",
    "longUrl": "https://example.com/very/long/url",
    "shortUrl": "http://localhost:3000/aB3xY7z",
    "clicks": 0,
    "isCustom": false,
    "date": "2024-01-15T12:00:00.000Z",
    "lastClickedAt": null,
    "expiresAt": "2024-02-14T12:00:00.000Z"
  }
}
```

**Error Responses:**

400 Bad Request - Invalid Input:
```json
{
  "success": false,
  "errors": [
    "Please provide a valid URL with http or https protocol",
    "URL is too long (maximum 2048 characters)"
  ]
}
```

409 Conflict - Custom Code Taken:
```json
{
  "success": false,
  "message": "Custom code is already taken. Please choose another one."
}
```

429 Too Many Requests:
```
Too many URLs created from this IP, please try again later.
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/url/shorten \
  -H "Content-Type: application/json" \
  -d '{
    "longUrl": "https://www.example.com/very/long/url/path",
    "customCode": "example",
    "expiresIn": 720
  }'
```

---

### 2. Redirect to Original URL

Redirects the short URL to its original destination and tracks analytics.

**Endpoint:** `GET /:urlCode`

**Success Response (302 Found):**
```
HTTP/1.1 302 Found
Location: https://example.com/very/long/url
```

**Error Responses:**

404 Not Found:
```json
{
  "success": false,
  "message": "Short URL not found"
}
```

410 Gone - Expired URL:
```json
{
  "success": false,
  "message": "This short URL has expired",
  "expiresAt": "2024-01-15T12:00:00.000Z"
}
```

**Example:**
```bash
curl -L http://localhost:3000/aB3xY7z
```

**Analytics Tracked:**
- Timestamp
- User Agent
- Referer
- IP Address
- Geographic Location (if permitted)

---

### 3. Get QR Code

Generates a QR code for a shortened URL.

**Endpoint:** `GET /api/url/qrcode/:urlCode`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "urlCode": "aB3xY7z",
    "shortUrl": "http://localhost:3000/aB3xY7z",
    "longUrl": "https://example.com/very/long/url",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

**QR Code Specifications:**
- Format: PNG
- Size: 300x300 pixels
- Error Correction: Medium (M)
- Encoding: Base64 data URL

**Error Responses:**

404 Not Found:
```json
{
  "success": false,
  "message": "Short URL not found"
}
```

410 Gone - Expired URL:
```json
{
  "success": false,
  "message": "This short URL has expired",
  "expiresAt": "2024-01-15T12:00:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3000/api/url/qrcode/aB3xY7z
```

---

### 4. Get URL Statistics

Retrieves analytics and statistics for a shortened URL.

**Endpoint:** `GET /api/url/stats/:urlCode`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "urlCode": "aB3xY7z",
    "longUrl": "https://example.com/very/long/url",
    "shortUrl": "http://localhost:3000/aB3xY7z",
    "createdAt": "2024-01-15T12:00:00.000Z",
    "totalClicks": 42,
    "lastClickedAt": "2024-01-20T14:30:00.000Z",
    "clicksWithLocation": 25,
    "locationPermissionRate": "59.52%",
    "recentClicks": [
      {
        "timestamp": "2024-01-20T14:30:00.000Z",
        "userAgent": "Mozilla/5.0...",
        "referer": "https://google.com",
        "ip": "192.168.1.1",
        "location": {
          "latitude": 37.7749,
          "longitude": -122.4194,
          "accuracy": 100,
          "permissionGranted": true
        }
      }
      // ... up to 10 most recent clicks
    ]
  }
}
```

**Error Responses:**

404 Not Found:
```json
{
  "success": false,
  "message": "Short URL not found"
}
```

**Example:**
```bash
curl http://localhost:3000/api/url/stats/aB3xY7z
```

---

### 5. Get URL Details

Retrieves detailed information about a URL including expiration status.

**Endpoint:** `GET /api/url/details/:urlCode`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "urlCode": "aB3xY7z",
    "longUrl": "https://example.com/very/long/url",
    "shortUrl": "http://localhost:3000/aB3xY7z",
    "isCustom": false,
    "createdAt": "2024-01-15T12:00:00.000Z",
    "expirationInfo": {
      "expiresAt": "2024-02-14T12:00:00.000Z",
      "isExpired": false,
      "remainingMs": 2592000000,
      "remainingHours": 720,
      "remainingDays": 30
    },
    "totalClicks": 42,
    "lastClickedAt": "2024-01-20T14:30:00.000Z"
  }
}
```

**If URL never expires:**
```json
{
  "success": true,
  "data": {
    "urlCode": "aB3xY7z",
    "longUrl": "https://example.com/very/long/url",
    "shortUrl": "http://localhost:3000/aB3xY7z",
    "isCustom": true,
    "createdAt": "2024-01-15T12:00:00.000Z",
    "expirationInfo": null,
    "totalClicks": 42,
    "lastClickedAt": "2024-01-20T14:30:00.000Z"
  }
}
```

**Error Responses:**

404 Not Found:
```json
{
  "success": false,
  "message": "Short URL not found"
}
```

**Example:**
```bash
curl http://localhost:3000/api/url/details/aB3xY7z
```

---

### 6. Update URL Destination

Updates the destination URL of an existing short link.

**Endpoint:** `PUT /api/url/edit/:urlCode`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "longUrl": "https://example.com/new/destination",  // Required
  "resetExpiration": true                             // Optional (default: true)
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "URL updated successfully",
  "data": {
    "id": 1,
    "urlCode": "aB3xY7z",
    "longUrl": "https://example.com/new/destination",
    "shortUrl": "http://localhost:3000/aB3xY7z",
    "clicks": 42,
    "isCustom": false,
    "date": "2024-01-15T12:00:00.000Z",
    "lastClickedAt": "2024-01-20T14:30:00.000Z",
    "expiresAt": "2024-02-20T10:00:00.000Z"
  }
}
```

**Error Responses:**

404 Not Found:
```json
{
  "success": false,
  "message": "Short URL not found"
}
```

410 Gone - Expired URL:
```json
{
  "success": false,
  "message": "This short URL has expired and cannot be edited"
}
```

**Example:**
```bash
curl -X PUT http://localhost:3000/api/url/edit/aB3xY7z \
  -H "Content-Type: application/json" \
  -d '{
    "longUrl": "https://example.com/new/destination",
    "resetExpiration": true
  }'
```

**Note:** The short code itself cannot be changed. Only the destination URL can be updated.

---

### 7. Delete URL

Permanently deletes a shortened URL and all associated analytics data.

**Endpoint:** `DELETE /api/url/:urlCode`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "URL deleted successfully",
  "data": {
    "urlCode": "aB3xY7z",
    "longUrl": "https://example.com/very/long/url"
  }
}
```

**Error Responses:**

404 Not Found:
```json
{
  "success": false,
  "message": "Short URL not found"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/url/aB3xY7z
```

**Warning:** This action is permanent and cannot be undone. All click tracking data will also be deleted.

---

### 8. Get URL Info (Without Tracking)

Retrieves URL information without recording a click. Used internally by the redirect page.

**Endpoint:** `GET /api/url/info/:urlCode`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "urlCode": "aB3xY7z",
    "longUrl": "https://example.com/very/long/url",
    "shortUrl": "http://localhost:3000/aB3xY7z"
  }
}
```

**Error Responses:**

404 Not Found:
```json
{
  "success": false,
  "message": "Short URL not found"
}
```

410 Gone - Expired URL:
```json
{
  "success": false,
  "message": "This short URL has expired",
  "expiresAt": "2024-01-15T12:00:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:3000/api/url/info/aB3xY7z
```

---

### 9. Track Click with Analytics

Records a click event with detailed analytics data. Called after user grants/denies location permission.

**Endpoint:** `POST /api/url/track-redirect`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "urlCode": "aB3xY7z",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 100,
    "permissionGranted": true
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Click tracked successfully"
}
```

**Error Responses:**

404 Not Found:
```json
{
  "success": false,
  "message": "Short URL not found"
}
```

410 Gone - Expired URL:
```json
{
  "success": false,
  "message": "This short URL has expired",
  "expiresAt": "2024-01-15T12:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/url/track-redirect \
  -H "Content-Type: application/json" \
  -d '{
    "urlCode": "aB3xY7z",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "accuracy": 100,
      "permissionGranted": true
    }
  }'
```

---

### 10. Get Application Version

Returns application metadata including version and environment.

**Endpoint:** `GET /version`

**Success Response (200 OK):**
```json
{
  "name": "url-shortener",
  "version": "1.0.0",
  "port": 3000,
  "hostname": "localhost",
  "mode": "development",
  "mock": false
}
```

**Example:**
```bash
curl http://localhost:3000/version
```

---

### 11. Health Check

Simple health check endpoint to verify server status.

**Endpoint:** `GET /health`

**Success Response (200 OK):**
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "env": "development"
}
```

**Example:**
```bash
curl http://localhost:3000/health
```

---

## Common Error Codes

| Status Code | Meaning |
|-------------|---------|
| 200 OK | Request successful |
| 201 Created | Resource created successfully |
| 302 Found | Redirect to original URL |
| 400 Bad Request | Invalid input or validation error |
| 404 Not Found | Resource not found |
| 409 Conflict | Resource already exists (e.g., custom code taken) |
| 410 Gone | URL has expired |
| 429 Too Many Requests | Rate limit exceeded |
| 500 Internal Server Error | Server error |

---

## Code Generation Strategies

The API supports multiple strategies for generating short codes. Configure via environment variables:

```bash
CODE_GENERATION_STRATEGY=sha256  # Default
CODE_LENGTH=7                     # Default
```

### Available Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `sha256` | SHA-256 hash-based (default) | Production - secure and collision-resistant |
| `md5` | MD5 hash-based | High-throughput systems |
| `random` | Cryptographic random | Maximum security |
| `timestamp` | Timestamp + random | Debugging and chronological ordering |
| `base62` | Base62 encoding of numeric ID | Single-server deployments |

---

## Swagger Documentation

Interactive API documentation is available at:

```
http://localhost:3000/api-docs
```

The Swagger UI provides:
- Complete API endpoint documentation
- Request/response schemas
- Interactive "Try it out" functionality
- Example requests and responses

---

## SDKs and Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Create shortened URL
async function shortenUrl(longUrl) {
  const response = await axios.post('http://localhost:3000/api/url/shorten', {
    longUrl: longUrl
  });
  return response.data.data.shortUrl;
}

// Usage
shortenUrl('https://example.com/very/long/url')
  .then(shortUrl => console.log('Short URL:', shortUrl))
  .catch(error => console.error('Error:', error));
```

### Python

```python
import requests

def shorten_url(long_url):
    response = requests.post(
        'http://localhost:3000/api/url/shorten',
        json={'longUrl': long_url}
    )
    data = response.json()
    return data['data']['shortUrl']

# Usage
short_url = shorten_url('https://example.com/very/long/url')
print(f'Short URL: {short_url}')
```

### cURL

```bash
# Shorten URL
curl -X POST http://localhost:3000/api/url/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com/very/long/url"}'

# Get QR Code
curl http://localhost:3000/api/url/qrcode/aB3xY7z

# Get Statistics
curl http://localhost:3000/api/url/stats/aB3xY7z

# Delete URL
curl -X DELETE http://localhost:3000/api/url/aB3xY7z
```

---

## WebSocket Support

Currently not implemented. The API uses REST HTTP endpoints only.

---

## Webhooks

Currently not implemented. Consider implementing webhooks for:
- URL creation notifications
- Click threshold alerts
- Expiration warnings

---

## Best Practices

1. **Use Custom Codes Wisely**
   - Keep them short and memorable
   - Avoid special characters (only alphanumeric, hyphens, underscores)
   - Check availability before committing to marketing materials

2. **Set Appropriate Expirations**
   - Use expiration for temporary campaigns
   - Default (720 hours = 30 days) is suitable for most use cases
   - Never expires (omit `expiresIn`) for permanent links

3. **Handle Rate Limits**
   - Implement exponential backoff for 429 responses
   - Cache shortened URLs to avoid redundant requests
   - Use authentication (when available) for higher limits

4. **Error Handling**
   - Always check `success` field in responses
   - Handle 404, 410, and 429 errors gracefully
   - Display user-friendly error messages

5. **Analytics Privacy**
   - Respect user location permissions
   - Comply with GDPR/privacy regulations
   - Consider anonymizing IP addresses

---

## Rate Limiting Details

### Current Limits

- **Global Rate Limit**: 100 requests per 15 minutes per IP
- **URL Creation**: 20 URLs per 15 minutes per IP

### Headers

Rate limit information is included in response headers:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1642262400
```

### Exceeded Rate Limit Response

```
HTTP/1.1 429 Too Many Requests
Retry-After: 900

Too many requests from this IP, please try again later.
```

---

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/suhailtajshaik/url-shortener/issues
- Documentation: https://docs.claude.com

---

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial release
- Multiple code generation strategies
- QR code generation
- Analytics tracking
- URL expiration support
- Comprehensive error handling
- Swagger documentation
