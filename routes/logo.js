const express = require("express");
const router = express.Router();
const Replicate = require("replicate");

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

router.post("/generate", async (req, res) => {
  try {
    const { companyName, description, brandGoals } = req.body;

    const prompt = `
      A professional logo for a company called "${companyName}".
      Business: ${description}.
      Style: ${brandGoals || "minimal modern"}.
      Vector style, clean, centered, no background.
    `;

    // Stable Diffusion model on Replicate
    const output = await replicate.run(
      "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      {
        input: {
          prompt: prompt,
          width: 512,
          height: 512,
        },
      }
    );

    // Replicate returns an image URL
    res.json({ imageUrl: output[0] });
  } catch (err) {
    console.log("Replicate Error:", err);
    res.status(500).json({ message: "Logo generation failed" });
  }
});

module.exports = router;
