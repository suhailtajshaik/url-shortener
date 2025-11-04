# URL Shortener

A production-ready URL shortening service built with Node.js, Express, and MongoDB. Features include analytics, rate limiting, input validation, and a modern web interface.

## Features

- **URL Shortening**: Convert long URLs into short, shareable links
- **Click Analytics**: Track clicks with detailed metrics (timestamp, user agent, referrer, IP)
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
    "recentClicks": [
      {
        "timestamp": "2025-11-04T14:30:00.000Z",
        "userAgent": "Mozilla/5.0...",
        "referer": "https://twitter.com",
        "ip": "192.168.1.1"
      }
    ]
  }
}
```

---

### Redirect to Original URL

**Endpoint**: `GET /:urlCode`

**Response**: 301 Redirect to the original URL

**Example**: Visiting `http://localhost:3000/abc123` redirects to the original URL

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

## Project Structure

```
url-shortener/
├── client/               # Frontend files
│   └── index.html       # Web interface
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
