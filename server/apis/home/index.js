"use strict";

const express = require("express");
const router = express.Router();
const path = require("path");
const { param, validationResult } = require("express-validator");
const logger = require("../../utils/logger");
const Url = require("../../db/models/Url");

/**
 * @swagger
 * /{urlCode}:
 *   get:
 *     summary: Redirect to destination URL (Direct API Redirect)
 *     description: Redirects directly to the original URL and tracks the click asynchronously. This is the core URL shortening redirect functionality.
 *     tags: [Redirects]
 *     parameters:
 *       - in: path
 *         name: urlCode
 *         required: true
 *         schema:
 *           type: string
 *           pattern: ^[a-zA-Z0-9_-]+$
 *           minLength: 1
 *           maxLength: 50
 *         description: The short URL code
 *         example: abc123
 *     responses:
 *       302:
 *         description: Redirect to destination URL
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: The destination URL
 *             example: https://example.com
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         description: Short URL not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: Short URL not found
 *       410:
 *         description: Short URL has expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: This short URL has expired
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// @route     GET /:code
// @desc      Direct redirect to destination URL with click tracking
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

      // Check if URL has expired
      if (url.expiresAt && new Date(url.expiresAt) < new Date()) {
        return res.status(410).json({
          success: false,
          message: "This short URL has expired",
          expiresAt: url.expiresAt,
        });
      }

      // Track the click asynchronously (don't wait for it)
      const clickData = {
        userAgent: req.get("user-agent") || "Unknown",
        referer: req.get("referer") || null,
        ip: req.ip || req.connection.remoteAddress || null,
      };

      // Record click in background
      Url.recordClick(urlCode, clickData).catch((err) => {
        logger.error("Error recording click:", err);
      });

      // Redirect immediately
      return res.redirect(302, url.longUrl);
    } catch (err) {
      logger.error("Error processing redirect:", err);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

module.exports = router;
