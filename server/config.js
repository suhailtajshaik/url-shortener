"use strict";
require("dotenv").config();

const config = () => {
  return {
    protocol: process.env.NODE_PROTOCOL || "http",
    hostname: process.env.NODE_HOSTNAME || "localhost",
    port: process.env.NODE_PORT || "3000",
    env: process.env.NODE_ENV || "develop",
    mock: process.env.MOCK_FLAG || "false",
    mongoURI: process.env.MONGO_URI,
    baseUrl:
      process.env.NODE_PROTOCOL +
      "://" +
      process.env.NODE_HOSTNAME +
      ":" +
      process.env.NODE_PORT,
  };
};

module.exports = config();
