const mongoose = require("mongoose");

const clickSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
    },
    userAgent: String,
    referer: String,
    ip: String,
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      permissionGranted: {
        type: Boolean,
        default: false,
      },
    },
  },
  { _id: false }
);

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
  clicks: {
    type: Number,
    default: 0,
  },
  lastClickedAt: {
    type: Date,
  },
  clickDetails: [clickSchema],
});

// Add indexes for better query performance
urlSchema.index({ urlCode: 1 });
urlSchema.index({ longUrl: 1 });
urlSchema.index({ date: -1 });
urlSchema.index({ clicks: -1 });

// Method to increment clicks
urlSchema.methods.recordClick = function (clickData) {
  this.clicks += 1;
  this.lastClickedAt = new Date();

  // Only keep last 100 click details to prevent document from growing too large
  if (this.clickDetails.length >= 100) {
    this.clickDetails.shift();
  }

  this.clickDetails.push(clickData);
  return this.save();
};

module.exports = mongoose.model("Url", urlSchema);
