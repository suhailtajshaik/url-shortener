"use strict";

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const config = require("./config.js");
const { initSupabase } = require("./db/supabase");
const logger = require("./utils/logger");
const swaggerSpec = require("./swagger");

const app = express();

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

// Initialize Supabase client
initSupabase();

app.use(express.static(path.join("..", "client")));

// Export shortenLimiter for use in routes
app.set("shortenLimiter", shortenLimiter);

// Swagger API documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
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

require("./routes")(app);

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
