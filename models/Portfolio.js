const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema({
  businessName: String,
  description: String,
  phone: String,
  address: String,
  email: String,
  linkedin: String,
  twitter: String,
  instagram: String,
  logoUrl: String,

});

module.exports = mongoose.model("Portfolio", portfolioSchema);
