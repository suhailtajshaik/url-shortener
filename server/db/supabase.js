const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const logger = require("../utils/logger");

let supabase = null;

const initSupabase = () => {
  // Check if credentials are available before attempting to initialize
  if (!config.supabaseUrl || !config.supabaseKey) {
    logger.warn("Supabase credentials not configured. Database features will be disabled.");
    logger.warn("Set SUPABASE_URL and SUPABASE_KEY environment variables to enable database.");
    return null;
  }

  try {
    supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    logger.info("Supabase client initialized successfully");
    logger.info(`Database URL: ${config.supabaseUrl}`);

    return supabase;
  } catch (err) {
    logger.error("Failed to initialize Supabase client:", err.message);
    logger.warn("Application will continue without database functionality.");
    return null;
  }
};

const getSupabase = () => {
  if (!supabase) {
    return initSupabase();
  }
  return supabase;
};

module.exports = { initSupabase, getSupabase };

