"use strict";

const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const validUrl = require("valid-url");
const shortid = require("shortid");
const logger = require("../../utils/logger");
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

      logger.info(`URL shortened: ${longUrl} -> ${shortUrl}`);

      res.status(201).json({
        success: true,
        data: url,
        message: "URL shortened successfully",
      });
    } catch (err) {
      logger.error("Error in /shorten:", err);

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

// @route     GET /api/url/stats/:urlCode
// @desc      Get analytics for a shortened URL
router.get(
  "/stats/:urlCode",
  [
    param("urlCode")
      .trim()
      .notEmpty()
      .withMessage("URL code is required")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Invalid URL code format"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    try {
      const { urlCode } = req.params;
      const url = await Url.findOne({ urlCode });

      if (!url) {
        return res.status(404).json({
          success: false,
          message: "Short URL not found",
        });
      }

      // Calculate location statistics
      const clicksWithLocation = url.clickDetails.filter(
        (click) => click.location && click.location.permissionGranted
      );
      const locationPermissionRate =
        url.clickDetails.length > 0
          ? (clicksWithLocation.length / url.clickDetails.length) * 100
          : 0;

      // Return analytics data
      res.json({
        success: true,
        data: {
          urlCode: url.urlCode,
          longUrl: url.longUrl,
          shortUrl: url.shortUrl,
          createdAt: url.date,
          totalClicks: url.clicks,
          lastClickedAt: url.lastClickedAt,
          clicksWithLocation: clicksWithLocation.length,
          locationPermissionRate: locationPermissionRate.toFixed(2) + "%",
          recentClicks: url.clickDetails.slice(-10), // Last 10 clicks with location
        },
      });
    } catch (err) {
      logger.error("Error fetching URL stats:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// @route     GET /api/url/info/:urlCode
// @desc      Get URL info without recording a click (for redirect page)
router.get(
  "/info/:urlCode",
  [
    param("urlCode")
      .trim()
      .notEmpty()
      .withMessage("URL code is required")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Invalid URL code format"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    try {
      const { urlCode } = req.params;
      const url = await Url.findOne({ urlCode });

      if (!url) {
        return res.status(404).json({
          success: false,
          message: "Short URL not found",
        });
      }

      // Return basic URL info (no click recording)
      res.json({
        success: true,
        data: {
          urlCode: url.urlCode,
          longUrl: url.longUrl,
          shortUrl: url.shortUrl,
        },
      });
    } catch (err) {
      logger.error("Error fetching URL info:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// @route     POST /api/url/track-redirect
// @desc      Record click with location data and analytics
router.post(
  "/track-redirect",
  [
    body("urlCode")
      .trim()
      .notEmpty()
      .withMessage("URL code is required")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Invalid URL code format"),
    body("location").optional().isObject(),
    body("location.latitude").optional().isNumeric(),
    body("location.longitude").optional().isNumeric(),
    body("location.accuracy").optional().isNumeric(),
    body("location.permissionGranted").optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    try {
      const { urlCode, location } = req.body;

      // Find URL in database
      const url = await Url.findOne({ urlCode });

      if (!url) {
        return res.status(404).json({
          success: false,
          message: "Short URL not found",
        });
      }

      // Prepare click data
      const clickData = {
        timestamp: new Date(),
        userAgent: req.get("user-agent") || "Unknown",
        referer: req.get("referer") || "Direct",
        ip: req.ip || req.connection.remoteAddress,
      };

      // Add location data if provided
      if (location) {
        clickData.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          permissionGranted: location.permissionGranted || false,
        };
      }

      // Record click with location data
      await url.recordClick(clickData);

      logger.info(
        `Click tracked: ${urlCode} -> ${url.longUrl} ${
          location
            ? `(Location: ${location.latitude}, ${location.longitude})`
            : "(No location)"
        }`
      );

      res.json({
        success: true,
        message: "Click tracked successfully",
      });
    } catch (err) {
      logger.error("Error tracking redirect:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;
