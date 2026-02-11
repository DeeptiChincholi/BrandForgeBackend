const express = require("express");
const Portfolio = require("../models/Portfolio");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const upload = require("../middleware/upload");

/**
 * ✅ GET latest portfolio (default)
 * URL: /api/portfolio
 */
router.get("/", async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne();

    if (!portfolio) {
      return res.status(404).json({ message: "No portfolio found" });
    }

    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});
router.get("/view/:id", async (req, res) => {
  try {
    // 1. Get portfolio from MongoDB
    const portfolio = await Portfolio.findById(req.params.id);

    if (!portfolio) {
      return res.status(404).send("Portfolio Not Found");
    }

    // 2. Load HTML template file
    const templatePath = path.join(
      __dirname,
      "../templates/premium-portfolio/index.html"
    );

    let html = fs.readFileSync(templatePath, "utf-8");

    // 3. Replace placeholders with real data
    html = html.replace("{{businessName}}", portfolio.businessName);
    html = html.replace("{{description}}", portfolio.description);
    html = html.replace("{{phone}}", portfolio.phone);
    html = html.replace("{{email}}", portfolio.email);

    // 4. Send HTML page in browser
    res.send(html);
  } catch (error) {
    res.status(500).send("Server Error");
  }
});


/**
 * ✅ GET portfolio by ID
 * URL: /api/portfolio/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);

    if (!portfolio) {
      return res.status(404).json({ message: "Portfolio not found" });
    }

    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});



// POST - Create Portfolio Data
// POST - Create Portfolio Data + Logo Upload
router.post("/", upload.single("logo"), async (req, res) => {
  try {
    // logo will come from Cloudinary
    const logoUrl = req.file ? req.file.path : "";

    // Save portfolio data
    const savedPortfolio = await Portfolio.create({
      ...req.body,
      logoUrl,
    });

    res.status(201).json({
      message: "Portfolio saved successfully",
      portfolio: savedPortfolio,

      // ✅ Portfolio link
      portfolioUrl: `https://brandforge-portfolio.vercel.app/portfolio/${savedPortfolio._id}`,
      //portfolioUrl: `http://localhost:5000/templates/premium-portfolio/index.html?id=${savedPortfolio._id}`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error saving portfolio",
      error: error.message,
    });
  }
});


module.exports = router;
