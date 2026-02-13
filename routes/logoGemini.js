const express = require("express");
const router = express.Router();
require("dotenv").config();

const STYLE_NAMES = [
  "Modern",
  "Minimalist",
  "Bold",
  "Elegant",
  "Playful",
  "Professional"
];

router.post("/generate", async (req, res) => {
  try {
    const { companyName, description, brandGoals } = req.body;
    if (!companyName || !description) {
      return res.status(400).json({ message: "Company name and description required" });
    }

    const logos = [];

    for (let i = 0; i < STYLE_NAMES.length; i++) {
      const styleName = STYLE_NAMES[i];

      const prompt = `
        Create a professional logo for a company called "${companyName}".
        Business: ${description}.
        Brand goals: ${brandGoals || "modern, minimal, professional"}.
        Style: ${styleName}.
        Clean, centered, vector style, no background.
      `;

      const response = await fetch("https://api.generativeai.googleapis.com/v1/images:generate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GOOGLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash-image",
          prompt: prompt,
          size: "1024x1024"
        }),
      });

     
      const data = await response.json();
console.log("Gemini API response:", data);

if (!data.data || !data.data[0]?.url) {
    return res.status(500).json({ message: "Gemini did not return a valid image URL", raw: data });
}

      // Depending on API response, it might return URL or base64
      logos.push({ styleName, url: data.data[0].url });
    }

    res.json({ logos });

  } catch (err) {
    console.log("Gemini Logo Error:", err);
    res.status(500).json({ message: "Logo generation failed" });
  }
});

module.exports = router;
