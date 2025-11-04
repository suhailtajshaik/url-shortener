"use strict";

const express = require("express");
const router = express.Router();
const { param, validationResult } = require("express-validator");
let config = require("../../config.js");
const Url = require("../../db/models/Url");

// @route     GET /:code
// @desc      Redirect to long/original URL with validation and error handling
router.get(
  "/:urlCode",
  [
    // Validate URL code parameter
    param("urlCode")
      .trim()
      .notEmpty()
      .withMessage("URL code is required")
      .isLength({ min: 1, max: 50 })
      .withMessage("Invalid URL code length")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("URL code contains invalid characters"),
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
      const { urlCode } = req.params;

      // Find URL in database
      const url = await Url.findOne({ urlCode });

      if (!url) {
        return res.status(404).json({
          success: false,
          message: "Short URL not found",
        });
      }

      // Validate the long URL before redirecting
      if (!url.longUrl || url.longUrl.trim() === "") {
        console.error(`Invalid longUrl for urlCode: ${urlCode}`);
        return res.status(500).json({
          success: false,
          message: "Invalid URL data",
        });
      }

      // Redirect to the original URL
      return res.redirect(301, url.longUrl);
    } catch (err) {
      console.error("Error in redirect endpoint:", err);

      // Handle specific mongoose errors
      if (err.name === "CastError") {
        return res.status(400).json({
          success: false,
          message: "Invalid URL code format",
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
