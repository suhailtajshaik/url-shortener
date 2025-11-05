"use strict";
require("dotenv").config();

const config = () => {
  // Validate required environment variables
  if (!process.env.MONGO_URI) {
    console.error("ERROR: MONGO_URI environment variable is required");
    process.exit(1);
  }

  const protocol = process.env.NODE_PROTOCOL || "http";
  const hostname = process.env.NODE_HOSTNAME || "localhost";
  const port = process.env.NODE_PORT || "3000";

  // Default URL expiration in hours (30 days = 720 hours)
  const defaultExpirationHours =
    parseInt(process.env.DEFAULT_URL_EXPIRATION_HOURS) || 720;

  return {
    protocol,
    hostname,
    port,
    env: process.env.NODE_ENV || "develop",
    mock: process.env.MOCK_FLAG || "false",
    mongoURI: process.env.MONGO_URI,
    baseUrl: `${protocol}://${hostname}:${port}`,
    defaultExpirationHours,
  };
};

module.exports = config();
