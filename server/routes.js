"use strict";

const path = require("path");

const config = require("./config.js");
const routting = (app) => {
  app.use("/api/url", require("./apis/url/index"));
  app.use("/", require("./apis/home/index"));

  /**
   * @swagger
   * /version:
   *   get:
   *     summary: Get application version and configuration
   *     description: Returns application metadata including version, port, hostname, and environment mode.
   *     tags: [System]
   *     responses:
   *       200:
   *         description: Application version information
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 name:
   *                   type: string
   *                   description: Application name
   *                   example: url-shortener
   *                 version:
   *                   type: string
   *                   description: Application version
   *                   example: 1.0.0
   *                 port:
   *                   type: integer
   *                   description: Server port
   *                   example: 3000
   *                 hostname:
   *                   type: string
   *                   description: Server hostname
   *                   example: localhost
   *                 mode:
   *                   type: string
   *                   description: Environment mode
   *                   example: development
   *                 mock:
   *                   type: boolean
   *                   description: Mock mode status
   *                   example: false
   */
  app.route("/version").get((req, res) => {
    const pkg = require("../package.json");
    const data = {
      name: pkg.name,
      version: pkg.version,
      port: config.port,
      hostname: config.hostname,
      mode: config.env,
      mock: config.mock,
    };
    res.json(data);
  });
};

module.exports = routting;
