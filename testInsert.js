const mongoose = require("mongoose");
const Portfolio = require("./models/Portfolio");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const newPortfolio = await Portfolio.create({
    businessName: "Deepti's Tech Co",
    description: "We build amazing AI tools for branding.",
    phone: "+91 9718347593",
    address: "Delhi, India",
    email: "deeptichincholi1@gmail.com",
    linkedin: "https://linkedin.com/in/deeptichincholi",
    twitter: "https://twitter.com/deeptichincholi",
    instagram: "https://instagram.com/deeptichincholi",
  });

  console.log("Inserted Portfolio ID:", newPortfolio._id);
  process.exit();
});
