const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema({
  urlCode: {
    type: String,
    required: true,
    unique: true,
  },
  longUrl: {
    type: String,
    required: true,
  },
  shortUrl: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes for better query performance
urlSchema.index({ urlCode: 1 });
urlSchema.index({ longUrl: 1 });

module.exports = mongoose.model("Url", urlSchema);
