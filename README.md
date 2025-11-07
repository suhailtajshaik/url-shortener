# URL Shortener - Production-Ready Service

A complete, production-ready URL shortening service built with Node.js, Express, and PostgreSQL. Features multiple code generation strategies (Base62, MD5, SHA-256), QR code generation, comprehensive analytics, and a modern web interface.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

## 🌟 Features

### Core Functionality
- **🔗 URL Shortening**: Convert long URLs into short, shareable links
- **🎨 Multiple Code Generation Strategies**: Base62, MD5, SHA-256, Cryptographic Random, Timestamp-based
- **📱 QR Code Generation**: Automatic QR code creation for each shortened URL
- **📊 Analytics Dashboard**: Track clicks with detailed metrics
- **📍 Location Tracking**: Optional geolocation with user permission
- **⏰ URL Expiration**: Set custom expiration times (1 hour to 1 year)
- **✏️ Custom Short Codes**: Use your own memorable codes
- **🔄 URL Editing**: Update destination URLs without changing short codes

### Technical Features
- **🔒 Security**: Helmet.js, CORS, rate limiting, input validation
- **📝 Logging**: Winston (file) and Morgan (HTTP) logging
- **🚀 Performance**: Sub-100ms response times, stateless design
- **📖 API Documentation**: Complete Swagger/OpenAPI documentation
- **🐳 Docker Support**: Production-ready containerization
- **☁️ Serverless Ready**: Vercel deployment support
- **🎯 Rate Limiting**: Protects against abuse (100 req/15min global, 20 req/15min for URL creation)

---

## 📚 Documentation

- **[System Design](docs/SYSTEM_DESIGN.md)** - Complete system architecture and design decisions
- **[Architecture Diagrams](docs/ARCHITECTURE.md)** - Visual system components and data flow
- **[API Documentation](docs/API.md)** - Comprehensive API endpoint reference
- **[Swagger UI](http://localhost:3000/api-docs)** - Interactive API documentation (when running)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **PostgreSQL** 15.x or higher (via Supabase)
- **npm** or **yarn**

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/suhailtajshaik/url-shortener.git
cd url-shortener
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**

Create a `.env` file in the root directory:

```env
# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Server Configuration
NODE_ENV=development
NODE_PORT=3000
NODE_HOSTNAME=localhost
NODE_PROTOCOL=http

# URL Shortener Configuration
CODE_GENERATION_STRATEGY=sha256  # Options: sha256, md5, random, timestamp, base62
CODE_LENGTH=7                     # 6-10 characters recommended
DEFAULT_URL_EXPIRATION_HOURS=720  # 30 days (optional)
```

4. **Set up the database:**

Run the SQL schema in your Supabase project:

```sql
-- URLs table
CREATE TABLE urls (
  id SERIAL PRIMARY KEY,
  url_code VARCHAR(30) UNIQUE NOT NULL,
  long_url TEXT NOT NULL,
  short_url VARCHAR(255) NOT NULL,
  clicks INTEGER DEFAULT 0,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  last_clicked_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Click details table
CREATE TABLE click_details (
  id SERIAL PRIMARY KEY,
  url_id INTEGER REFERENCES urls(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT NOW(),
  user_agent TEXT,
  referer TEXT,
  ip VARCHAR(45),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy INTEGER,
  location_permission_granted BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX idx_urls_url_code ON urls(url_code);
CREATE INDEX idx_urls_long_url ON urls(long_url);
CREATE INDEX idx_urls_created_at ON urls(created_at);
CREATE INDEX idx_click_details_url_id ON click_details(url_id);
CREATE INDEX idx_click_details_timestamp ON click_details(timestamp);

-- Trigger to auto-update clicks
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

5. **Start the application:**

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

6. **Access the application:**
- **Web Interface**: http://localhost:3000
- **API**: http://localhost:3000/api/url/shorten
- **Swagger Docs**: http://localhost:3000/api-docs

---

## 🎯 Usage Examples

### Web Interface

Visit http://localhost:3000 and use the simple, professional UI to:
1. Enter a long URL
2. (Optional) Specify a custom short code
3. Click "Shorten URL"
4. Copy the short URL or download its QR code

### API Usage

#### Create a Shortened URL

```bash
curl -X POST http://localhost:3000/api/url/shorten \
  -H "Content-Type: application/json" \
  -d '{
    "longUrl": "https://www.example.com/very/long/url/path",
    "customCode": "example",
    "expiresIn": 720
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "URL shortened successfully",
  "data": {
    "urlCode": "example",
    "shortUrl": "http://localhost:3000/example",
    "longUrl": "https://www.example.com/very/long/url/path",
    "clicks": 0,
    "isCustom": true,
    "expiresAt": "2024-02-14T12:00:00.000Z"
  }
}
```

#### Get QR Code

```bash
curl http://localhost:3000/api/url/qrcode/example
```

#### Get Analytics

```bash
curl http://localhost:3000/api/url/stats/example
```

---

## 🔐 Code Generation Strategies

The system supports multiple strategies for generating short codes. Configure via `CODE_GENERATION_STRATEGY` environment variable.

### Available Strategies

| Strategy | Description | Use Case | Security | Collision Risk |
|----------|-------------|----------|----------|----------------|
| **sha256** (Default) | SHA-256 hash-based | Production systems | High | Extremely Low |
| **md5** | MD5 hash-based | High-throughput | Medium | Very Low |
| **random** | Cryptographic random | Maximum security | Highest | Low |
| **timestamp** | Timestamp + random suffix | Debugging | Low | Low |
| **base62** | Base62 encoding of numeric ID | Single server | Medium | None |

### How It Works

#### SHA-256 Strategy (Recommended)

```
Input: https://example.com + timestamp + random
  ↓
SHA-256 Hash
  ↓
Take first 16 hex characters
  ↓
Convert to decimal
  ↓
Modulo 62^7 (for 7-character code)
  ↓
Base62 Encode (0-9, a-z, A-Z)
  ↓
Result: "aB3xY7z"
```

**Why SHA-256?**
- Cryptographically secure
- Excellent distribution
- Collision probability: ~1 in 3.5 trillion for 7 characters
- Unpredictable (security benefit)
- Distributed-system friendly

### Collision Handling

Even with the best strategies, collisions are theoretically possible. The system handles this by:

1. **Detection**: Check if generated code exists in database
2. **Regeneration**: If collision detected, regenerate up to 5 times using random strategy
3. **Failure**: If still colliding after 5 attempts, return error (extremely rare)

With 7-character Base62 codes:
- **Total possibilities**: 62^7 = 3,521,614,606,208 (~3.5 trillion)
- **At 1000 URLs/second**: Would take 111 years to exhaust
- **Birthday paradox 50% collision**: After ~2.2 million URLs

---

## 📊 API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/url/shorten` | POST | Create shortened URL |
| `/:urlCode` | GET | Redirect to original URL |
| `/api/url/qrcode/:urlCode` | GET | Get QR code |
| `/api/url/stats/:urlCode` | GET | Get analytics |
| `/api/url/details/:urlCode` | GET | Get URL details |
| `/api/url/edit/:urlCode` | PUT | Update URL destination |
| `/api/url/:urlCode` | DELETE | Delete URL |

### System Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/version` | GET | App version info |
| `/api-docs` | GET | Swagger UI |

See [API Documentation](docs/API.md) for complete details.

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────┐
│   Client    │ (Browser, Mobile App, API Consumer)
└──────┬──────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌─────────────┐                   ┌─────────────┐
│  Web UI     │                   │   REST API  │
│ (HTML/JS)   │                   │  (Express)  │
└──────┬──────┘                   └──────┬──────┘
       │                                 │
       └─────────────┬───────────────────┘
                     │
              ┌──────▼──────┐
              │   Express   │
              │ Application │
              └──────┬──────┘
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│  Code     │ │ Validator │ │  QR Code  │
│ Generator │ │  Engine   │ │ Generator │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │             │             │
      └─────────────┼─────────────┘
                    │
            ┌───────▼────────┐
            │   URL Model    │
            │ (Data Access)  │
            └───────┬────────┘
                    │
            ┌───────▼────────┐
            │   PostgreSQL   │
            │   (Supabase)   │
            └────────────────┘
```

See [Architecture Documentation](docs/ARCHITECTURE.md) for detailed diagrams.

---

## 🔒 Security

### Implemented Security Measures

1. **Helmet.js**
   - Sets secure HTTP headers
   - XSS protection
   - MIME type sniffing prevention

2. **CORS**
   - Configurable origin whitelist
   - Credentials handling

3. **Rate Limiting**
   - Global: 100 requests per 15 minutes per IP
   - URL Creation: 20 requests per 15 minutes per IP
   - Customizable limits

4. **Input Validation**
   - URL format validation
   - Custom code validation (alphanumeric, 3-30 chars)
   - SQL injection prevention
   - XSS prevention

5. **Database Security**
   - Parameterized queries
   - Connection pooling
   - Row-level security (Supabase)

---

## 📈 Analytics & Privacy

### Tracked Metrics

For each click, the system tracks:
- Timestamp
- User Agent (browser/device info)
- Referer (where the click came from)
- IP Address
- Geographic Location (with user permission)

### Location Tracking

Location tracking is **opt-in only**:
1. User visits short URL
2. Browser shows native permission dialog
3. User can Allow, Deny, or Ignore
4. Redirect happens regardless of choice
5. Location only recorded if permitted

### Privacy Compliance

- ✅ GDPR compliant (explicit consent)
- ✅ Native browser permissions (trusted by users)
- ✅ No dark patterns
- ✅ No third-party sharing
- ✅ Data minimization (only coordinates)
- ✅ Limited storage (last 100 clicks per URL)

---

## 🚀 Deployment

### Vercel (Serverless)

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Deploy:**
```bash
vercel --prod
```

3. **Configure environment variables:**
- Add `SUPABASE_URL` and `SUPABASE_KEY` in Vercel dashboard
- Set `CODE_GENERATION_STRATEGY` and `CODE_LENGTH`

### Docker

```bash
# Build image
docker build -t url-shortener .

# Run container
docker run -p 3000:3000 \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_KEY=your-key \
  url-shortener
```

### Traditional Server

```bash
# Install dependencies
npm install --production

# Set environment variables
export SUPABASE_URL=your-url
export SUPABASE_KEY=your-key
export NODE_ENV=production

# Start application
npm start
```

---

## 📁 Project Structure

```
url-shortener/
├── client/                   # Frontend files
│   └── index.html           # Web interface
├── server/                  # Backend application
│   ├── apis/               # API routes
│   │   ├── home/          # Redirect endpoint
│   │   └── url/           # URL management endpoints
│   ├── db/                # Database layer
│   │   ├── models/        # Data models
│   │   │   └── Url.js    # URL model (CRUD operations)
│   │   └── supabase.js    # Database client
│   ├── utils/             # Utility modules
│   │   ├── logger.js      # Winston logger
│   │   └── urlCodeGenerator.js  # Code generation strategies
│   ├── config.js          # Configuration management
│   ├── routes.js          # Route definitions
│   ├── swagger.js         # Swagger configuration
│   └── index.js           # Application entry point
├── docs/                  # Documentation
│   ├── SYSTEM_DESIGN.md   # System design document
│   ├── ARCHITECTURE.md    # Architecture diagrams
│   └── API.md             # API documentation
├── api/                   # Vercel serverless functions
│   └── index.js           # Serverless entry point
├── .env                   # Environment variables (not in git)
├── .env.example           # Environment template
├── vercel.json            # Vercel configuration
├── package.json           # Dependencies
└── README.md              # This file
```

---

## 🧪 Testing

### Manual Testing

```bash
# Create shortened URL
curl -X POST http://localhost:3000/api/url/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://example.com"}'

# Test redirect
curl -L http://localhost:3000/aB3xY7z

# Get analytics
curl http://localhost:3000/api/url/stats/aB3xY7z

# Get QR code
curl http://localhost:3000/api/url/qrcode/aB3xY7z

# Delete URL
curl -X DELETE http://localhost:3000/api/url/aB3xY7z
```

### Load Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test URL shortening (100 requests, 10 concurrent)
ab -n 100 -c 10 -p request.json -T application/json \
  http://localhost:3000/api/url/shorten
```

---

## 🛠️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SUPABASE_URL` | Supabase project URL | - | Yes |
| `SUPABASE_KEY` | Supabase anon key | - | Yes |
| `NODE_ENV` | Environment | `development` | No |
| `NODE_PORT` | Server port | `3000` | No |
| `CODE_GENERATION_STRATEGY` | Strategy to use | `sha256` | No |
| `CODE_LENGTH` | Code length | `7` | No |
| `DEFAULT_URL_EXPIRATION_HOURS` | Default expiration | `720` (30 days) | No |

### Strategy Selection Guide

Choose your code generation strategy based on your needs:

- **Production systems**: Use `sha256` (default) for best security and collision resistance
- **High-throughput**: Use `md5` for slightly better performance
- **Maximum security**: Use `random` for unpredictable codes
- **Debugging**: Use `timestamp` for time-sortable codes
- **Single server**: Use `base62` with auto-incrementing IDs

---

## 📝 Logging

### Log Files (Local Development)

- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Unhandled exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Serverless (Vercel)

- Console logging only (no file writes)
- View logs in Vercel dashboard

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

ISC License - see [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Suhail Taj Shaik**

- GitHub: [@suhailtajshaik](https://github.com/suhailtajshaik)

---

## 🙏 Acknowledgments

- Express.js team for the excellent framework
- Supabase for the database platform
- The open-source community for inspiration

---

## 📞 Support

For issues, questions, or feature requests:
- 📧 Email: support@example.com
- 🐛 GitHub Issues: [Create an issue](https://github.com/suhailtajshaik/url-shortener/issues)
- 📖 Documentation: [Full Docs](docs/)

---

## 🗺️ Roadmap

Future enhancements planned:
- [ ] User authentication and accounts
- [ ] API key management
- [ ] Custom domains
- [ ] Advanced analytics dashboard
- [ ] Webhook notifications
- [ ] Bulk URL creation
- [ ] URL categories and tags
- [ ] A/B testing support
- [ ] Link rotation
- [ ] Geographic redirects

---

## ⚡ Performance

Expected performance metrics:
- URL Shortening: < 100ms response time
- URL Redirection: < 50ms response time
- QR Code Generation: < 200ms response time
- Throughput: 1000+ requests/second (single instance)

---

## 🎓 Learn More

- [System Design Deep Dive](docs/SYSTEM_DESIGN.md)
- [Architecture Explained](docs/ARCHITECTURE.md)
- [Complete API Reference](docs/API.md)
- [Swagger Interactive Docs](http://localhost:3000/api-docs)

---

**Built with ❤️ using Node.js and Express**
