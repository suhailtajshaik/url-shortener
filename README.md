# URL Shortener

A production-ready URL shortening service built with Node.js, Express, and MongoDB. Features include analytics, rate limiting, input validation, and a modern web interface.

## Features

- **URL Shortening**: Convert long URLs into short, shareable links
- **Click Analytics**: Track clicks with detailed metrics (timestamp, user agent, referrer, IP)
- **Location Tracking**: Optional geolocation with user permission for geographic insights
- **Privacy-First**: Location sharing is opt-in with clear user consent
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Logging**: Structured logging with Winston and Morgan
- **Modern UI**: Responsive web interface with real-time feedback
- **Docker Support**: Multi-stage builds with health checks
- **Production Ready**: Error handling, validation, and monitoring

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: express-validator
- **Logging**: Winston, Morgan
- **Containerization**: Docker, Docker Compose

## Prerequisites

- Node.js 20.x or higher
- MongoDB 7.x or higher
- npm or yarn
- Docker & Docker Compose (optional)

## Installation

### Using npm

1. Clone the repository:
```bash
git clone https://github.com/suhailtajshaik/url-shortener.git
cd url-shortener
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (see Configuration section below)

4. Start the application:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Using Docker Compose (Recommended)

The easiest way to run the application with MongoDB:

```bash
docker-compose up -d
```

This will start both the application and MongoDB with all required configuration.

## Configuration

Create a `.env` file in the root directory:

```env
# MongoDB connection string (required)
MONGO_URI=mongodb://localhost:27017/url-shortener

# Server configuration (optional - defaults provided)
NODE_PROTOCOL=http
NODE_HOSTNAME=localhost
NODE_PORT=3000
NODE_ENV=development
```

See `.env.example` for all available options.

## API Documentation

### Shorten URL

**Endpoint**: `POST /api/url/shorten`

**Request Body**:
```json
{
  "longUrl": "https://example.com/very/long/url"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "urlCode": "abc123",
    "longUrl": "https://example.com/very/long/url",
    "shortUrl": "http://localhost:3000/abc123",
    "date": "2025-11-04T12:00:00.000Z",
    "clicks": 0
  },
  "message": "URL shortened successfully"
}
```

**Rate Limit**: 20 requests per 15 minutes per IP

---

### Get URL Analytics

**Endpoint**: `GET /api/url/stats/:urlCode`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "urlCode": "abc123",
    "longUrl": "https://example.com/very/long/url",
    "shortUrl": "http://localhost:3000/abc123",
    "createdAt": "2025-11-04T12:00:00.000Z",
    "totalClicks": 42,
    "lastClickedAt": "2025-11-04T14:30:00.000Z",
    "clicksWithLocation": 25,
    "locationPermissionRate": "59.52%",
    "recentClicks": [
      {
        "timestamp": "2025-11-04T14:30:00.000Z",
        "userAgent": "Mozilla/5.0...",
        "referer": "https://twitter.com",
        "ip": "192.168.1.1",
        "location": {
          "latitude": 37.7749,
          "longitude": -122.4194,
          "accuracy": 50,
          "permissionGranted": true
        }
      }
    ]
  }
}
```

**Note**: Location data is only included when users grant permission

---

### Redirect to Original URL

**Endpoint**: `GET /:urlCode`

**Behavior**: Shows an intermediate page requesting location permission, then redirects

**How it works**:
1. User visits the short URL
2. An intermediate page is displayed with location permission request
3. User can choose to:
   - Allow location and redirect
   - Skip and redirect immediately
4. Click is tracked with or without location data
5. User is redirected to the original URL

**Privacy**: Location sharing is completely optional and requires explicit user consent

**Example**: Visiting `http://localhost:3000/abc123` shows the permission page before redirecting

---

### Health Check

**Endpoint**: `GET /version`

**Response**:
```json
{
  "name": "url-shortener",
  "version": "1.0.0",
  "port": "3000",
  "hostname": "localhost",
  "mode": "development"
}
```

## Location Tracking & Privacy

### How Location Tracking Works

When users visit a shortened URL, they see an intermediate page with two options:

1. **Allow Location & Redirect**: Requests browser geolocation permission
   - Uses HTML5 Geolocation API
   - Captures latitude, longitude, and accuracy
   - Requires explicit user consent

2. **Skip & Redirect Now**: Bypasses location tracking
   - Redirects immediately
   - Still tracks other analytics (timestamp, user agent, referrer)

### Privacy Guarantees

- **Opt-In Only**: Location is never tracked without permission
- **Transparent**: Clear explanation of why location is requested
- **Anonymous**: Location data is stored with analytics, not linked to personal identity
- **Limited Storage**: Only last 100 clicks per URL are stored
- **User Control**: Users can always deny permission
- **No Third-Party Sharing**: Location data never leaves your database

### Location Data Structure

```json
{
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 50,
    "permissionGranted": true
  }
}
```

### Use Cases for Location Analytics

- **Geographic Reach**: Understand where your audience is located
- **Regional Campaigns**: Track effectiveness by location
- **Market Research**: Identify potential markets
- **Content Localization**: Tailor content to regions
- **Performance Analysis**: Compare engagement across locations

### GDPR & Privacy Compliance

This implementation follows privacy best practices:
- Clear consent mechanism (GDPR Article 7)
- Purpose explanation (GDPR Article 13)
- User control over data collection
- No tracking without explicit permission
- Data minimization (only coordinates stored)

## Project Structure

```
url-shortener/
├── client/               # Frontend files
│   ├── index.html       # Web interface
│   └── redirect.html    # Intermediate redirect page with location permission
├── server/              # Backend files
│   ├── apis/           # API routes
│   │   ├── home/       # Redirect endpoint
│   │   └── url/        # URL shortening endpoints
│   ├── db/             # Database configuration
│   │   ├── index.js    # MongoDB connection
│   │   └── models/     # Mongoose models
│   ├── utils/          # Utility modules
│   │   └── logger.js   # Winston logger
│   ├── config.js       # App configuration
│   ├── routes.js       # Route definitions
│   └── index.js        # App entry point
├── logs/               # Application logs
├── .env                # Environment variables
├── .env.example        # Environment template
├── Dockerfile          # Docker image definition
├── docker-compose.yml  # Docker Compose setup
└── package.json        # Dependencies

```

## Security Features

- **Helmet**: Secures HTTP headers
- **CORS**: Cross-Origin Resource Sharing
- **Rate Limiting**:
  - Global: 100 requests per 15 minutes
  - URL Creation: 20 requests per 15 minutes
- **Input Validation**: Request sanitization and validation
- **MongoDB Injection Prevention**: Parameterized queries
- **Non-root Docker User**: Enhanced container security

## Logging

Logs are stored in the `logs/` directory:

- `combined.log`: All application logs
- `error.log`: Error logs only
- `exceptions.log`: Unhandled exceptions
- `rejections.log`: Unhandled promise rejections

Logs rotate automatically when they reach 5MB (keeps last 5 files).

## Docker Commands

Build the image:
```bash
docker build -t url-shortener .
```

Run the container:
```bash
docker run -p 3000:3000 -e MONGO_URI=your_mongo_uri url-shortener
```

Using Docker Compose:
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Development

Run in development mode with auto-reload:
```bash
npm run dev
```

## Testing

Test the API with curl:

```bash
# Shorten a URL
curl -X POST http://localhost:3000/api/url/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://www.example.com"}'

# Get analytics
curl http://localhost:3000/api/url/stats/abc123

# Test redirect
curl -L http://localhost:3000/abc123
```

## License

ISC

## Author

Suhail Taj Shaik

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
