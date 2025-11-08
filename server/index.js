"use strict";

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const app = express();

// Basic health check endpoint - always available
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development"
  });
});

// Load configuration and dependencies with error handling
let config, logger, swaggerUi, swaggerSpec, initSupabase;

try {
  config = require("./config.js");
  logger = require("./utils/logger");
  swaggerUi = require("swagger-ui-express");
  swaggerSpec = require("./swagger");
  const supabaseModule = require("./db/supabase");
  initSupabase = supabaseModule.initSupabase;
} catch (err) {
  console.error("Error loading modules:", err);
  // Create minimal logger if main logger fails
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    stream: { write: (msg) => console.log(msg) }
  };
  config = config || {
    env: "production",
    port: 3000,
    baseUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"
  };
}

// Security middleware
app.use(helmet());
app.use(cors());

// HTTP request logging
app.use(
  morgan(config.env === "production" ? "combined" : "dev", {
    stream: logger.stream,
  })
);

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limiting for URL shortening endpoint
const shortenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 URL creations per 15 minutes
  message: "Too many URLs created from this IP, please try again later.",
});

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Supabase client (non-fatal)
if (initSupabase) {
  try {
    initSupabase();
  } catch (err) {
    logger.warn("Supabase initialization skipped:", err.message);
  }
}

// Export shortenLimiter for use in routes
app.set("shortenLimiter", shortenLimiter);

// Swagger API documentation (if available)
if (swaggerUi && swaggerSpec) {
  // Root path redirects to Swagger UI
  app.get("/", (req, res) => {
    res.redirect("/api-docs");
  });

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 50px 0; }
        .swagger-ui .info .title { font-size: 36px; }
      `,
      customSiteTitle: "URL Shortener API Documentation",
      customfavIcon: "https://swagger.io/favicon.ico",
    })
  );

  // Swagger JSON endpoint
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  logger.info(`Swagger documentation available at ${config.baseUrl}/api-docs`);
  logger.info(`Root path (/) redirects to Swagger UI`);
} else {
  logger.warn("Swagger documentation not available - module failed to load");
  app.get("/", (req, res) => {
    res.status(503).json({
      error: "API documentation temporarily unavailable",
      message: "Swagger modules failed to load"
    });
  });
  app.get("/api-docs", (req, res) => {
    res.status(503).json({
      error: "API documentation temporarily unavailable",
      message: "Swagger modules failed to load"
    });
  });
}

// Load routes with error handling
try {
  require("./routes")(app);
} catch (err) {
  logger.error("Error loading routes:", err);
  app.use((req, res) => {
    res.status(503).json({
      error: "Service temporarily unavailable",
      message: "Application routes failed to load. Please check configuration."
    });
  });
}

// Export app for Vercel serverless functions
module.exports = app;

// Only start server if not in Vercel environment
if (!process.env.VERCEL) {
  const server = app.listen(config.port, function () {
    const port = server.address().port;
    logger.info(`Express server listening on port ${port}, in ${config.env} mode`);
    logger.info(`Open http://localhost:${port}`);
  });

  server.on("error", function (e) {
    if (e.code === "EADDRINUSE") {
      logger.error(`Port ${config.port} is already in use`);
      process.exit(1);
    } else {
      logger.error("Server error:", e);
      process.exit(1);
    }
  });
}
