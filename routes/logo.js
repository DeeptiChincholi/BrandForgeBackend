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
      "https://router.huggingface.co/hf-inference/models/runwayml/stable-diffusion-v1-5",
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
      const errorText = await response.text();
      console.log("HF Error:", errorText);

      return res.status(400).json({
        message: "Logo generation failed",
        error: errorText,
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
