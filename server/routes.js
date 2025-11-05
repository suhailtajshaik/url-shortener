"use strict";

const path = require("path");

const config = require("./config.js");
const routting = (app) => {
  app.use("/api/url", require("./apis/url/index"));
  app.use("/", require("./apis/home/index"));

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

  // All other routes should redirect to the index.html
  app.route("/*").get(function (req, res) {
    res.sendFile(path.resolve(__dirname, "..", "client" + "/index.html"));
  });
};

module.exports = routting;
