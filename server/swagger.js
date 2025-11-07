const swaggerJsdoc = require("swagger-jsdoc");
const config = require("./config");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "URL Shortener API",
      version: "1.0.0",
      description: `
# URL Shortener API Documentation

A comprehensive URL shortening service with advanced features including:
- Custom short codes
- URL expiration and renewal
- Click tracking and analytics
- Location-based analytics
- QR code generation
- Rate limiting and security

## Features

- **Custom Short Codes**: Create memorable, branded short URLs
- **Expiration Management**: Set expiration times and renew URLs
- **Analytics**: Track clicks with detailed metrics including location data
- **QR Codes**: Generate QR codes for any shortened URL
- **Security**: Rate limiting, input validation, and secure data handling

## Base URL

\`${config.baseUrl}\`

## Rate Limiting

- General endpoints: 100 requests per 15 minutes per IP
- URL creation: 20 requests per 15 minutes per IP

## Error Handling

All endpoints return errors in the following format:
\`\`\`json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
\`\`\`
      `,
      contact: {
        name: "API Support",
        url: config.baseUrl,
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: config.baseUrl,
        description: `${config.env.charAt(0).toUpperCase() + config.env.slice(1)} server`,
      },
    ],
    tags: [
      {
        name: "URL Shortening",
        description: "Endpoints for creating and managing shortened URLs",
      },
      {
        name: "Analytics",
        description: "Endpoints for viewing URL statistics and analytics",
      },
      {
        name: "URL Management",
        description: "Endpoints for editing and deleting URLs",
      },
      {
        name: "QR Codes",
        description: "Endpoints for generating QR codes",
      },
      {
        name: "Redirects",
        description: "Endpoints for URL redirection with tracking",
      },
      {
        name: "System",
        description: "System information and health check endpoints",
      },
    ],
    components: {
      schemas: {
        URL: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Unique identifier for the URL",
              example: 1,
            },
            urlCode: {
              type: "string",
              description: "Unique short code for the URL",
              example: "abc123",
            },
            longUrl: {
              type: "string",
              format: "uri",
              description: "Original long URL",
              example: "https://www.example.com/very/long/url/path",
            },
            shortUrl: {
              type: "string",
              format: "uri",
              description: "Complete shortened URL",
              example: "http://localhost:3000/abc123",
            },
            clicks: {
              type: "integer",
              description: "Total number of clicks",
              example: 42,
            },
            isCustom: {
              type: "boolean",
              description: "Whether the URL code is custom or auto-generated",
              example: false,
            },
            date: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
              example: "2024-01-01T12:00:00.000Z",
            },
            lastClickedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Timestamp of last click",
              example: "2024-01-15T14:30:00.000Z",
            },
            expiresAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              description: "Expiration timestamp",
              example: "2024-02-01T12:00:00.000Z",
            },
          },
        },
        Location: {
          type: "object",
          properties: {
            latitude: {
              type: "number",
              format: "double",
              description: "Latitude coordinate",
              example: 37.7749,
            },
            longitude: {
              type: "number",
              format: "double",
              description: "Longitude coordinate",
              example: -122.4194,
            },
            accuracy: {
              type: "number",
              format: "double",
              description: "Location accuracy in meters",
              example: 10.5,
            },
            permissionGranted: {
              type: "boolean",
              description: "Whether user granted location permission",
              example: true,
            },
          },
        },
        ClickDetail: {
          type: "object",
          properties: {
            timestamp: {
              type: "string",
              format: "date-time",
              description: "Click timestamp",
              example: "2024-01-15T14:30:00.000Z",
            },
            userAgent: {
              type: "string",
              description: "Browser user agent string",
              example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
            },
            referer: {
              type: "string",
              description: "HTTP referer",
              example: "https://google.com",
            },
            ip: {
              type: "string",
              description: "Client IP address",
              example: "192.168.1.1",
            },
            location: {
              $ref: "#/components/schemas/Location",
            },
          },
        },
        ExpirationInfo: {
          type: "object",
          nullable: true,
          properties: {
            expiresAt: {
              type: "string",
              format: "date-time",
              description: "Expiration timestamp",
              example: "2024-02-01T12:00:00.000Z",
            },
            isExpired: {
              type: "boolean",
              description: "Whether URL is currently expired",
              example: false,
            },
            remainingMs: {
              type: "integer",
              description: "Milliseconds until expiration",
              example: 2592000000,
            },
            remainingHours: {
              type: "integer",
              description: "Hours until expiration",
              example: 720,
            },
            remainingDays: {
              type: "integer",
              description: "Days until expiration",
              example: 30,
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            data: {
              type: "object",
            },
            message: {
              type: "string",
              example: "Operation completed successfully",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error description",
            },
            errors: {
              type: "array",
              items: {
                type: "string",
              },
              example: ["Validation error 1", "Validation error 2"],
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Bad request - validation errors",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Validation failed",
                errors: ["URL is required", "Invalid URL format"],
              },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Short URL not found",
              },
            },
          },
        },
        Conflict: {
          description: "Conflict - resource already exists",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Custom code is already taken. Please choose another one.",
              },
            },
          },
        },
        Gone: {
          description: "Resource expired",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/ErrorResponse" },
                  {
                    type: "object",
                    properties: {
                      expiresAt: {
                        type: "string",
                        format: "date-time",
                      },
                    },
                  },
                ],
              },
              example: {
                success: false,
                message: "This short URL has expired",
                expiresAt: "2024-01-01T00:00:00.000Z",
              },
            },
          },
        },
        InternalServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Internal server error",
              },
            },
          },
        },
      },
    },
  },
  apis: ["./server/apis/**/*.js", "./server/routes.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
