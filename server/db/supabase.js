const { createClient } = require("@supabase/supabase-js");
const config = require("../config");
const logger = require("../utils/logger");

let supabase = null;

const initSupabase = () => {
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
    process.exit(1);
  }
};

const getSupabase = () => {
  if (!supabase) {
    return initSupabase();
  }
  return supabase;
};

module.exports = { initSupabase, getSupabase };

