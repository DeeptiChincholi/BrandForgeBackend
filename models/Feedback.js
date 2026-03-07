const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true
  },
  reachBefore: {
    type: Number
  },
  reachAfter: {
    type: Number
  },
  feedback: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    default: 5
  }
}, { timestamps: true });

module.exports = mongoose.model("Feedback", feedbackSchema);