"use strict";

const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const validUrl = require("valid-url");
const shortid = require("shortid");
let config = require("../../config.js");
const Url = require("../../db/models/Url");

// @route     POST /api/url/shorten
// @desc      Create short URL with validation and rate limiting
router.post(
  "/shorten",
  [
    // Input validation middleware
    body("longUrl")
      .trim()
      .notEmpty()
      .withMessage("URL is required")
      .isURL({
        protocols: ["http", "https"],
        require_protocol: true,
      })
      .withMessage("Please provide a valid URL with http or https protocol")
      .isLength({ max: 2048 })
      .withMessage("URL is too long (maximum 2048 characters)"),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    try {
      const { longUrl } = req.body;
      const baseUrl = config.baseUrl;

      // Additional URL validation
      if (!validUrl.isUri(longUrl)) {
        return res.status(400).json({
          success: false,
          message: "Invalid URL format",
        });
      }

      // Check if URL already exists in database
      let url = await Url.findOne({ longUrl });

      if (url) {
        return res.json({
          success: true,
          data: url,
          message: "URL already shortened",
        });
      }

      // Generate unique URL code
      let urlCode = shortid.generate();

      // Ensure the code is unique (very unlikely collision, but good practice)
      let existingCode = await Url.findOne({ urlCode });
      while (existingCode) {
        urlCode = shortid.generate();
        existingCode = await Url.findOne({ urlCode });
      }

      const shortUrl = `${baseUrl}/${urlCode}`;

      // Create new URL document
      url = new Url({
        longUrl,
        shortUrl,
        urlCode,
        date: new Date(),
      });

      await url.save();

      res.status(201).json({
        success: true,
        data: url,
        message: "URL shortened successfully",
      });
    } catch (err) {
      console.error("Error in /shorten:", err);

      // Handle specific mongoose errors
      if (err.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: Object.values(err.errors).map((e) => e.message),
        });
      }

      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "URL code already exists, please try again",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;
