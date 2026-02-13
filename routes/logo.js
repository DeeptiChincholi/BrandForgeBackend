const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

router.post("/generate", async (req, res) => {
  try {
    const { companyName, description, brandGoals } = req.body;

    const prompt = `
    Professional logo for brand "${companyName}".
    Business: ${description}.
    Style: ${brandGoals || "minimal modern"}.
    Clean vector style, centered, no background.
    `;

    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      return res.status(400).json({
        message: "Logo generation failed",
      });
    }

    const imageBuffer = await response.arrayBuffer();

    res.set("Content-Type", "image/png");
    res.send(Buffer.from(imageBuffer));
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
