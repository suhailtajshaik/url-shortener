"use strict";

const crypto = require("crypto");

/**
 * URL Code Generator Utility
 * Provides multiple strategies for generating short URL codes
 */

// Base62 character set (0-9, a-z, A-Z)
const BASE62_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Strategy 1: Base62 Encoding with Counter
 * Converts a numeric ID to a Base62 string
 * @param {number} num - The numeric ID to encode
 * @returns {string} Base62 encoded string
 */
function encodeBase62(num) {
  if (num === 0) return BASE62_CHARS[0];

  let encoded = "";
  while (num > 0) {
    const remainder = num % 62;
    encoded = BASE62_CHARS[remainder] + encoded;
    num = Math.floor(num / 62);
  }

  return encoded;
}

/**
 * Decodes a Base62 string back to a number
 * @param {string} str - Base62 encoded string
 * @returns {number} Decoded numeric value
 */
function decodeBase62(str) {
  let num = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = BASE62_CHARS.indexOf(char);
    num = num * 62 + value;
  }
  return num;
}

/**
 * Strategy 2: MD5 Hash-based Generation
 * Generates a short code from MD5 hash of the URL
 * @param {string} url - The long URL to hash
 * @param {number} length - Desired length of the code (default: 7)
 * @returns {string} Short code derived from MD5 hash
 */
function generateFromMD5(url, length = 7) {
  // Add timestamp to ensure uniqueness for same URL
  const input = url + Date.now() + Math.random();
  const hash = crypto.createHash("md5").update(input).digest("hex");

  // Convert hex to Base62 for shorter representation
  const decimal = BigInt("0x" + hash.substring(0, 16));
  let code = encodeBase62(Number(decimal % BigInt(62 ** length)));

  // Pad with random Base62 characters if needed
  while (code.length < length) {
    code = BASE62_CHARS[Math.floor(Math.random() * 62)] + code;
  }

  return code.substring(0, length);
}

/**
 * Strategy 3: SHA-256 Hash-based Generation
 * Generates a short code from SHA-256 hash of the URL
 * @param {string} url - The long URL to hash
 * @param {number} length - Desired length of the code (default: 7)
 * @returns {string} Short code derived from SHA-256 hash
 */
function generateFromSHA256(url, length = 7) {
  // Add timestamp and random value for uniqueness
  const input = url + Date.now() + Math.random();
  const hash = crypto.createHash("sha256").update(input).digest("hex");

  // Convert hex to Base62 for shorter representation
  const decimal = BigInt("0x" + hash.substring(0, 16));
  let code = encodeBase62(Number(decimal % BigInt(62 ** length)));

  // Pad with random Base62 characters if needed
  while (code.length < length) {
    code = BASE62_CHARS[Math.floor(Math.random() * 62)] + code;
  }

  return code.substring(0, length);
}

/**
 * Strategy 4: Cryptographically Random Generation
 * Generates a secure random code using crypto.randomBytes
 * @param {number} length - Desired length of the code (default: 7)
 * @returns {string} Cryptographically random short code
 */
function generateRandom(length = 7) {
  const bytes = crypto.randomBytes(length);
  let code = "";

  for (let i = 0; i < length; i++) {
    const index = bytes[i] % 62;
    code += BASE62_CHARS[index];
  }

  return code;
}

/**
 * Strategy 5: Timestamp-based Generation
 * Generates a code based on current timestamp with random suffix
 * @param {number} length - Desired length of the code (default: 7)
 * @returns {string} Timestamp-based short code
 */
function generateTimestampBased(length = 7) {
  const timestamp = Date.now();
  let code = encodeBase62(timestamp);

  // Add random characters if needed
  while (code.length < length) {
    const randomIndex = Math.floor(Math.random() * 62);
    code += BASE62_CHARS[randomIndex];
  }

  return code.substring(code.length - length);
}

/**
 * Main generator function that uses the best strategy
 * Default: Cryptographically Random (most collision-resistant)
 * @param {Object} options - Generation options
 * @param {string} options.strategy - Strategy to use: 'random', 'md5', 'sha256', 'timestamp', 'base62'
 * @param {string} options.url - URL to use for hash-based strategies
 * @param {number} options.id - Numeric ID for Base62 strategy
 * @param {number} options.length - Desired code length (default: 7)
 * @returns {string} Generated short code
 */
function generate(options = {}) {
  const {
    strategy = "random",
    url = "",
    id = null,
    length = 7,
  } = options;

  switch (strategy) {
    case "base62":
      if (id === null) {
        throw new Error("Base62 strategy requires an ID");
      }
      return encodeBase62(id);

    case "md5":
      if (!url) {
        throw new Error("MD5 strategy requires a URL");
      }
      return generateFromMD5(url, length);

    case "sha256":
      if (!url) {
        throw new Error("SHA-256 strategy requires a URL");
      }
      return generateFromSHA256(url, length);

    case "timestamp":
      return generateTimestampBased(length);

    case "random":
    default:
      return generateRandom(length);
  }
}

/**
 * Validates if a code is a valid Base62 string
 * @param {string} code - Code to validate
 * @returns {boolean} True if valid Base62
 */
function isValidCode(code) {
  if (!code || typeof code !== "string") return false;

  for (let i = 0; i < code.length; i++) {
    if (BASE62_CHARS.indexOf(code[i]) === -1) {
      return false;
    }
  }

  return true;
}

module.exports = {
  generate,
  encodeBase62,
  decodeBase62,
  generateFromMD5,
  generateFromSHA256,
  generateRandom,
  generateTimestampBased,
  isValidCode,
  BASE62_CHARS,
};
