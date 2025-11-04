"use strict";

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const config = require("./config.js");
const connectDB = require("./db");

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

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

// connnect to db
connectDB();

app.use(express.static(path.join("..", "client")));

// Export shortenLimiter for use in routes
app.set("shortenLimiter", shortenLimiter);

require("./routes")(app);

const server = app.listen(config.port, function () {
  var port = server.address().port;
  console.log(
    "\nExpress server listening on port " +
      port +
      ", in " +
      config.env +
      " mode"
  );
  console.log("open http://localhost:" + port);
});

server.on("error", function (e) {
  if (e.code === "EADDRINUSE") {
    console.log("ADDRESS IN USE");
    console.log(
      "\nExpress server listening on port " +
        e.port +
        ", in " +
        config.env +
        " mode"
    );
  } else {
    process.exit(1);
  }
});
