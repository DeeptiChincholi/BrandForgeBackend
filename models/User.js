const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  // ✅ FREE USAGE TRACKING
  freeUsage: {
    logo: {
      type: Boolean,
      default: false
    },
    portfolio: {
      type: Boolean,
      default: false
    },
    thumbnail: {
      type: Boolean,
      default: false
    },
    customQR: {
      type: Boolean,
      default: false
    }
  },

  // ✅ SUBSCRIPTION DETAILS
  subscription: {
    planType: {
      type: String,
      default: "FREE"
    },
    startDate: {
      type: Date
    },
    expiryDate: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: false
    }
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);