"use strict";

const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const validUrl = require("valid-url");
const shortid = require("shortid");
const QRCode = require("qrcode");
const logger = require("../../utils/logger");
const config = require("../../config.js");
const Url = require("../../db/models/Url");

/**
 * @swagger
 * /api/url/shorten:
 *   post:
 *     summary: Create a shortened URL
 *     description: Creates a new shortened URL with optional custom code and expiration. Returns existing URL if the same long URL was already shortened (only for non-custom codes).
 *     tags: [URL Shortening]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - longUrl
 *             properties:
 *               longUrl:
 *                 type: string
 *                 format: uri
 *                 description: The long URL to shorten (must include http:// or https://)
 *                 minLength: 1
 *                 maxLength: 2048
 *                 example: https://www.example.com/very/long/url/path/to/resource
 *               customCode:
 *                 type: string
 *                 description: Optional custom short code (3-30 characters, alphanumeric, hyphens, and underscores only)
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: ^[a-zA-Z0-9_-]+$
 *                 example: my-custom-code
 *               expiresIn:
 *                 type: integer
 *                 description: Expiration time in hours (1-8760 hours, max 1 year)
 *                 minimum: 1
 *                 maximum: 8760
 *                 example: 720
 *     responses:
 *       201:
 *         description: URL shortened successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/URL'
 *             example:
 *               success: true
 *               message: URL shortened successfully
 *               data:
 *                 id: 1
 *                 urlCode: abc123
 *                 longUrl: https://www.example.com/very/long/url
 *                 shortUrl: http://localhost:3000/abc123
 *                 clicks: 0
 *                 isCustom: false
 *                 date: "2024-01-01T12:00:00.000Z"
 *                 lastClickedAt: null
 *                 expiresAt: "2024-02-01T12:00:00.000Z"
 *       200:
 *         description: URL already exists (returned existing URL)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/URL'
 *             example:
 *               success: true
 *               message: URL already shortened
 *               data:
 *                 id: 1
 *                 urlCode: abc123
 *                 longUrl: https://www.example.com/very/long/url
 *                 shortUrl: http://localhost:3000/abc123
 *                 clicks: 5
 *                 isCustom: false
 *                 date: "2024-01-01T12:00:00.000Z"
 *                 lastClickedAt: "2024-01-15T14:30:00.000Z"
 *                 expiresAt: null
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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
    body("customCode")
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("Custom code must be between 3 and 30 characters")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(
        "Custom code can only contain letters, numbers, hyphens, and underscores"
      ),
    body("expiresIn")
      .optional()
      .isInt({ min: 1, max: 8760 })
      .withMessage("Expiration time must be between 1 and 8760 hours (1 year)"),
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
      const { longUrl, customCode, expiresIn } = req.body;
      const baseUrl = config.baseUrl;

      // Additional URL validation
      if (!validUrl.isUri(longUrl)) {
        return res.status(400).json({
          success: false,
          message: "Invalid URL format",
        });
      }

      // Check if URL already exists in database (only for non-custom codes)
      if (!customCode) {
        const url = await Url.findOne({ longUrl });

        if (url) {
          return res.json({
            success: true,
            data: url,
            message: "URL already shortened",
          });
        }
      }

      let urlCode;
      let isCustom = false;

      // Handle custom code
      if (customCode) {
        // Check if custom code is already taken
        const existingUrl = await Url.findOne({ urlCode: customCode });
        if (existingUrl) {
          return res.status(409).json({
            success: false,
            message: "Custom code is already taken. Please choose another one.",
          });
        }
        urlCode = customCode;
        isCustom = true;
      } else {
        // Generate unique URL code
        urlCode = shortid.generate();

        // Ensure the code is unique (very unlikely collision, but good practice)
        let existingCode = await Url.findOne({ urlCode });
        while (existingCode) {
          urlCode = shortid.generate();
          existingCode = await Url.findOne({ urlCode });
        }
      }

      const shortUrl = `${baseUrl}/${urlCode}`;

      // Calculate expiration date if expiresIn is provided
      let expiresAt = null;
      if (expiresIn) {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
      }

      // Create new URL document
      const url = await Url.create({
        longUrl,
        shortUrl,
        urlCode,
        isCustom,
        expiresAt,
        date: new Date(),
      });

      logger.info(
        `URL shortened: ${longUrl} -> ${shortUrl}${isCustom ? " (custom)" : ""}${expiresAt ? ` (expires: ${expiresAt.toISOString()})` : ""}`
      );

      res.status(201).json({
        success: true,
        data: url,
        message: "URL shortened successfully",
      });
    } catch (err) {
      logger.error("Error in /shorten:", err);

      // Handle specific Supabase/PostgreSQL errors
      if (err.code === "23505") {
        // Unique constraint violation
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

/**
 * @swagger
 * /api/url/stats/{urlCode}:
 *   get:
 *     summary: Get URL analytics and statistics
 *     description: Retrieves detailed analytics for a shortened URL including total clicks, location statistics, and recent click details (last 10 clicks from 100 stored).
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: urlCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[a-zA-Z0-9_-]+$
 *         description: The short URL code
 *         example: abc123
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         urlCode:
 *                           type: string
 *                           example: abc123
 *                         longUrl:
 *                           type: string
 *                           example: https://www.example.com
 *                         shortUrl:
 *                           type: string
 *                           example: http://localhost:3000/abc123
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         totalClicks:
 *                           type: integer
 *                           example: 42
 *                         lastClickedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         clicksWithLocation:
 *                           type: integer
 *                           description: Number of clicks with location data
 *                           example: 25
 *                         locationPermissionRate:
 *                           type: string
 *                           description: Percentage of clicks with location permission granted
 *                           example: "59.52%"
 *                         recentClicks:
 *                           type: array
 *                           description: Last 10 click details
 *                           items:
 *                             $ref: '#/components/schemas/ClickDetail'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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

      // Get click details
      const clickDetails = await Url.getClickDetails(urlCode, 100);

      // Calculate location statistics
      const clicksWithLocation = clickDetails.filter(
        (click) => click.location && click.location.permissionGranted
      );
      const locationPermissionRate =
        clickDetails.length > 0
          ? (clicksWithLocation.length / clickDetails.length) * 100
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
          recentClicks: clickDetails.slice(0, 10), // Last 10 clicks
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

/**
 * @swagger
 * /api/url/details/{urlCode}:
 *   get:
 *     summary: Get detailed URL information
 *     description: Retrieves detailed information about a shortened URL including expiration status, remaining time, and basic statistics.
 *     tags: [URL Management]
 *     parameters:
 *       - in: path
 *         name: urlCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[a-zA-Z0-9_-]+$
 *         description: The short URL code
 *         example: abc123
 *     responses:
 *       200:
 *         description: URL details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         urlCode:
 *                           type: string
 *                           example: abc123
 *                         longUrl:
 *                           type: string
 *                           example: https://www.example.com
 *                         shortUrl:
 *                           type: string
 *                           example: http://localhost:3000/abc123
 *                         isCustom:
 *                           type: boolean
 *                           example: false
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         expirationInfo:
 *                           $ref: '#/components/schemas/ExpirationInfo'
 *                         totalClicks:
 *                           type: integer
 *                           example: 42
 *                         lastClickedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// @route     GET /api/url/details/:urlCode
// @desc      Get detailed URL information including expiration
router.get(
  "/details/:urlCode",
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

      // Calculate expiration info
      const now = new Date();
      let expirationInfo = null;

      if (url.expiresAt) {
        const remainingMs = url.expiresAt.getTime() - now.getTime();
        const isExpired = remainingMs <= 0;

        expirationInfo = {
          expiresAt: url.expiresAt,
          isExpired,
          remainingMs: isExpired ? 0 : remainingMs,
          remainingHours: isExpired
            ? 0
            : Math.floor(remainingMs / (1000 * 60 * 60)),
          remainingDays: isExpired
            ? 0
            : Math.floor(remainingMs / (1000 * 60 * 60 * 24)),
        };
      }

      res.json({
        success: true,
        data: {
          urlCode: url.urlCode,
          longUrl: url.longUrl,
          shortUrl: url.shortUrl,
          isCustom: url.isCustom,
          createdAt: url.date,
          expirationInfo,
          totalClicks: url.clicks,
          lastClickedAt: url.lastClickedAt,
        },
      });
    } catch (err) {
      logger.error("Error fetching URL details:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * @swagger
 * /api/url/edit/{urlCode}:
 *   put:
 *     summary: Edit a shortened URL destination
 *     description: Updates the destination (long URL) of an existing shortened URL. The short code/alias cannot be changed. Optionally resets the expiration timer to the default period (720 hours).
 *     tags: [URL Management]
 *     parameters:
 *       - in: path
 *         name: urlCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[a-zA-Z0-9_-]+$
 *         description: The short URL code to edit
 *         example: abc123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - longUrl
 *             properties:
 *               longUrl:
 *                 type: string
 *                 format: uri
 *                 description: New destination URL (must include http:// or https://)
 *                 maxLength: 2048
 *                 example: https://www.newdestination.com/page
 *               resetExpiration:
 *                 type: boolean
 *                 description: Whether to reset the expiration timer (defaults to true)
 *                 example: true
 *     responses:
 *       200:
 *         description: URL updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/URL'
 *             example:
 *               success: true
 *               message: URL updated successfully
 *               data:
 *                 id: 1
 *                 urlCode: abc123
 *                 longUrl: https://www.newdestination.com/page
 *                 shortUrl: http://localhost:3000/abc123
 *                 clicks: 42
 *                 isCustom: false
 *                 date: "2024-01-01T12:00:00.000Z"
 *                 lastClickedAt: "2024-01-15T14:30:00.000Z"
 *                 expiresAt: "2024-02-15T10:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       410:
 *         $ref: '#/components/responses/Gone'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// @route     PUT /api/url/edit/:urlCode
// @desc      Edit destination URL of an existing shortened URL (alias cannot be changed)
router.put(
  "/edit/:urlCode",
  [
    param("urlCode")
      .trim()
      .notEmpty()
      .withMessage("URL code is required")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("Invalid URL code format"),
    body("longUrl")
      .trim()
      .notEmpty()
      .withMessage("Destination URL is required")
      .isURL({
        protocols: ["http", "https"],
        require_protocol: true,
      })
      .withMessage("Please provide a valid URL with http or https protocol")
      .isLength({ max: 2048 })
      .withMessage("URL is too long (maximum 2048 characters)"),
    body("resetExpiration")
      .optional()
      .isBoolean()
      .withMessage("resetExpiration must be a boolean"),
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
      const { longUrl, resetExpiration } = req.body;

      // Find the existing URL
      const url = await Url.findOne({ urlCode });

      if (!url) {
        return res.status(404).json({
          success: false,
          message: "Short URL not found",
        });
      }

      // Check if URL is expired
      if (url.expiresAt && new Date() > url.expiresAt) {
        return res.status(410).json({
          success: false,
          message: "This short URL has expired and cannot be edited",
        });
      }

      // Validate new URL
      if (!validUrl.isUri(longUrl)) {
        return res.status(400).json({
          success: false,
          message: "Invalid URL format",
        });
      }

      // Prepare updates
      const updates = { longUrl };

      // Reset expiration timer if requested or if default expiration should apply
      if (resetExpiration === true || resetExpiration === undefined) {
        const expirationDate = new Date();
        expirationDate.setHours(
          expirationDate.getHours() + config.defaultExpirationHours
        );
        updates.expiresAt = expirationDate;
      }

      // Update the URL
      const updatedUrl = await Url.update(urlCode, updates);

      logger.info(
        `URL edited: ${urlCode} (longUrl: ${updatedUrl.longUrl}, expires: ${updatedUrl.expiresAt ? new Date(updatedUrl.expiresAt).toISOString() : "never"})`
      );

      res.json({
        success: true,
        data: updatedUrl,
        message: "URL updated successfully",
      });
    } catch (err) {
      logger.error("Error editing URL:", err);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * @swagger
 * /api/url/{urlCode}:
 *   delete:
 *     summary: Delete a shortened URL
 *     description: Permanently deletes a shortened URL and all associated click tracking data. This action cannot be undone.
 *     tags: [URL Management]
 *     parameters:
 *       - in: path
 *         name: urlCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[a-zA-Z0-9_-]+$
 *         description: The short URL code to delete
 *         example: abc123
 *     responses:
 *       200:
 *         description: URL deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         urlCode:
 *                           type: string
 *                           example: abc123
 *                         longUrl:
 *                           type: string
 *                           example: https://www.example.com
 *             example:
 *               success: true
 *               message: URL deleted successfully
 *               data:
 *                 urlCode: abc123
 *                 longUrl: https://www.example.com
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// @route     DELETE /api/url/:urlCode
// @desc      Delete a shortened URL
router.delete(
  "/:urlCode",
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

      // Find and delete the URL
      const url = await Url.delete(urlCode);

      if (!url) {
        return res.status(404).json({
          success: false,
          message: "Short URL not found",
        });
      }

      logger.info(`URL deleted: ${urlCode} (${url.longUrl})`);

      res.json({
        success: true,
        message: "URL deleted successfully",
        data: {
          urlCode: url.urlCode,
          longUrl: url.longUrl,
        },
      });
    } catch (err) {
      logger.error("Error deleting URL:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * @swagger
 * /api/url/info/{urlCode}:
 *   get:
 *     summary: Get URL information without tracking
 *     description: Retrieves basic URL information without recording a click. Used by the redirect page to fetch destination URL before tracking the click with location data.
 *     tags: [Redirects]
 *     parameters:
 *       - in: path
 *         name: urlCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[a-zA-Z0-9_-]+$
 *         description: The short URL code
 *         example: abc123
 *     responses:
 *       200:
 *         description: URL information retrieved successfully (not expired)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         urlCode:
 *                           type: string
 *                           example: abc123
 *                         longUrl:
 *                           type: string
 *                           example: https://www.example.com
 *                         shortUrl:
 *                           type: string
 *                           example: http://localhost:3000/abc123
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       410:
 *         $ref: '#/components/responses/Gone'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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

      // Check if URL has expired
      if (url.expiresAt && new Date() > url.expiresAt) {
        return res.status(410).json({
          success: false,
          message: "This short URL has expired",
          expiresAt: url.expiresAt,
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

/**
 * @swagger
 * /api/url/track-redirect:
 *   post:
 *     summary: Track URL click with analytics
 *     description: Records a click event with optional location data and analytics information. This endpoint is called after the user grants or denies location permission on the redirect page. Automatically updates click count and last clicked timestamp.
 *     tags: [Redirects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urlCode
 *             properties:
 *               urlCode:
 *                 type: string
 *                 pattern: ^[a-zA-Z0-9_-]+$
 *                 description: The short URL code being accessed
 *                 example: abc123
 *               location:
 *                 $ref: '#/components/schemas/Location'
 *     responses:
 *       200:
 *         description: Click tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Click tracked successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       410:
 *         $ref: '#/components/responses/Gone'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
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

      // Check if URL has expired
      if (url.expiresAt && new Date() > url.expiresAt) {
        return res.status(410).json({
          success: false,
          message: "This short URL has expired",
          expiresAt: url.expiresAt,
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
      await Url.recordClick(urlCode, clickData);

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

/**
 * @swagger
 * /api/url/qrcode/{urlCode}:
 *   get:
 *     summary: Generate QR code for shortened URL
 *     description: Generates a QR code image (as base64 data URL) for a shortened URL. The QR code is PNG format with medium error correction level, 300x300 pixels.
 *     tags: [QR Codes]
 *     parameters:
 *       - in: path
 *         name: urlCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[a-zA-Z0-9_-]+$
 *         description: The short URL code
 *         example: abc123
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         urlCode:
 *                           type: string
 *                           example: abc123
 *                         shortUrl:
 *                           type: string
 *                           example: http://localhost:3000/abc123
 *                         longUrl:
 *                           type: string
 *                           example: https://www.example.com
 *                         qrCode:
 *                           type: string
 *                           description: Base64-encoded PNG image data URL
 *                           example: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       410:
 *         $ref: '#/components/responses/Gone'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// @route     GET /api/url/qrcode/:urlCode
// @desc      Generate QR code for a shortened URL
router.get(
  "/qrcode/:urlCode",
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

      // Check if URL has expired
      if (url.expiresAt && new Date() > url.expiresAt) {
        return res.status(410).json({
          success: false,
          message: "This short URL has expired",
          expiresAt: url.expiresAt,
        });
      }

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(url.shortUrl, {
        errorCorrectionLevel: "M",
        type: "image/png",
        quality: 0.92,
        margin: 1,
        width: 300,
      });

      logger.info(`QR code generated for: ${url.shortUrl}`);

      res.json({
        success: true,
        data: {
          urlCode: url.urlCode,
          shortUrl: url.shortUrl,
          longUrl: url.longUrl,
          qrCode: qrCodeDataURL,
        },
      });
    } catch (err) {
      logger.error("Error generating QR code:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;
