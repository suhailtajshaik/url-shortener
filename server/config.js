"use strict";
require("dotenv").config();

const config = () => {
  // MongoDB configuration - support both direct URI and username/password
  let mongoURI;

  if (process.env.MONGO_URI) {
    // Use direct connection string if provided
    mongoURI = process.env.MONGO_URI;
  } else {
    // Build MongoDB Atlas connection string from username and password
    const mongoUsername = process.env.MONGO_USERNAME;
    const mongoPassword = process.env.MONGO_PASSWORD;
    const mongoCluster = process.env.MONGO_CLUSTER || "default.schqzct.mongodb.net";
    const mongoAppName = process.env.MONGO_APP_NAME || "default";

    if (!mongoUsername || !mongoPassword) {
      console.error(
        "ERROR: Either MONGO_URI or both MONGO_USERNAME and MONGO_PASSWORD are required"
      );
      process.exit(1);
    }

    // Encode username and password to handle special characters
    const encodedUsername = encodeURIComponent(mongoUsername);
    const encodedPassword = encodeURIComponent(mongoPassword);

    mongoURI = `mongodb+srv://${encodedUsername}:${encodedPassword}@${mongoCluster}/?appName=${mongoAppName}`;
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
    mongoURI,
    baseUrl: `${protocol}://${hostname}:${port}`,
    defaultExpirationHours,
  };
};

module.exports = config();
