"use strict";
require("dotenv").config();

const config = () => {
  // Supabase configuration
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  // Skip validation during build time (when modules are just being loaded)
  // Environment variables are only needed at runtime for serverless functions
  if (!supabaseUrl || !supabaseKey) {
    // Only show warning during build, don't exit
    // At runtime (when actual requests come in), Vercel will have env vars injected
    console.warn(
      "WARNING: SUPABASE_URL and SUPABASE_KEY not configured"
    );
    console.warn("This is OK during build, but required at runtime");
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
