"use strict";

const express = require("express");
const router = express.Router();
const path = require("path");
const { param, validationResult } = require("express-validator");
const logger = require("../../utils/logger");
const Url = require("../../db/models/Url");

// @route     GET /:code
// @desc      Show intermediate page with location permission request
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

      // Verify URL exists
      const url = await Url.findOne({ urlCode });

      if (!url) {
        return res.status(404).json({
          success: false,
          message: "Short URL not found",
        });
      }

      // Serve the redirect page with location permission request
      return res.sendFile(
        path.resolve(__dirname, "..", "..", "..", "client", "redirect.html")
      );
    } catch (err) {
      logger.error("Error serving redirect page:", err);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;
