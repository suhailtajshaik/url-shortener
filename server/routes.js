"use strict";

let path = require("path");

let config = require("./config.js");
let routting = (app) => {
  app.use("/api/url", require("./apis/url/index"));
  app.use("/", require("./apis/home/index"));

  app.route("/version").get((req, res) => {
    let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    let pkg = require("../package.json");
    let os = require("os");
    let data = {
      name: pkg.name,
      version: pkg.version,
      port: config.port,
      hostname: config.hostname,
      mode: config.env,
      mock: config.mock,
    };
    res.json(data);
  });

  // All other routes should redirect to the index.html
  app.route("/*").get(function (req, res) {
    res.sendFile(path.resolve(__dirname, "..", "client" + "/index.html"));
  });
};

module.exports = routting;
