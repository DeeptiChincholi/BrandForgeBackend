const express = require("express");
const router = express.Router();
require("dotenv").config();

router.post("/generate", async (req, res) => {
  try {
    const { companyName, description, brandGoals } = req.body;

    if (!companyName || !description) {
      return res.status(400).json({
        message: "Company name and description required",
      });
    }

    const prompt = `
Generate a clean professional logo.

Company Name: ${companyName}
Business: ${description}
Brand Goals: ${brandGoals || "modern, minimal"}

Style: vector, centered, no background.
`;

    // ✅ Correct Gemini Endpoint
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${process.env.GOOGLE_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    const data = await response.json();

    console.log("Gemini Response:", data);

    // ✅ Extract Base64 Image
    const inlineData =
      data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!inlineData) {
      return res.status(500).json({
        message: "Gemini did not return image data",
        raw: data,
      });
    }

    const base64 = inlineData.data;

    // ✅ Send usable URL
    res.json({
      logo: `data:image/png;base64,${base64}`,
    });
  } catch (err) {
    console.error("Gemini Logo Error:", err);
    res.status(500).json({
      message: "Logo generation failed",
      error: err.message,
    });
  }
});

module.exports = router;
