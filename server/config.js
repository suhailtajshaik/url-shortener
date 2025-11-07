"use strict";
require("dotenv").config();

const config = () => {
  // Supabase configuration
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "ERROR: Both SUPABASE_URL and SUPABASE_KEY are required"
    );
    process.exit(1);
  }

  const protocol = process.env.NODE_PROTOCOL || "http";
  const hostname = process.env.NODE_HOSTNAME || "localhost";
  const port = process.env.NODE_PORT || "3000";

  // Default URL expiration in hours (30 days = 720 hours)
  const defaultExpirationHours =
    parseInt(process.env.DEFAULT_URL_EXPIRATION_HOURS) || 720;

  // For Vercel deployments, use VERCEL_URL if available
  let baseUrl;
  if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.VERCEL) {
    // Running on Vercel but VERCEL_URL not set
    baseUrl = `${protocol}://${hostname}`;
  } else {
    // Local development or other hosting
    baseUrl = `${protocol}://${hostname}:${port}`;
  }

  return {
    protocol,
    hostname,
    port,
    env: process.env.NODE_ENV || "develop",
    mock: process.env.MOCK_FLAG || "false",
    supabaseUrl,
    supabaseKey,
    baseUrl,
    defaultExpirationHours,
  };
};

module.exports = config();
