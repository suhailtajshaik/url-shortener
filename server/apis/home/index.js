"use strict";

const express = require("express");
const router = express.Router();
let config = require("../../config.js");
const Url = require("../../db/models/Url");

// @route     GET /:code
// @desc      Redirect to long/original URL
router.get("/:urlCode", async (req, res) => {
  try {
    const { urlCode } = req.params;
    const url = await Url.findOne({ urlCode });

    if (url) {
      return res.redirect(url.longUrl);
    } else {
      return res.status(404).json({ message: "No url found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json("Server error");
  }
});

module.exports = router;
