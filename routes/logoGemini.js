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

    const prompt = `Create a professional, modern logo for a company.

Company Name: ${companyName}
Business Description: ${description}
Brand Goals: ${brandGoals || "modern, professional, memorable"}

Requirements:
- Clean and minimalist design
- Professional and scalable
- Centered composition
- Transparent or white background
- Vector-style appearance
- Include the company name in the logo
- Make it suitable for business cards and websites`;

    // ✅ CORRECT MODEL NAME
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GOOGLE_API_KEY}`;

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
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
    });

    const data = await response.json();

    console.log("Gemini Response:", JSON.stringify(data, null, 2));

    // ✅ Extract Base64 Image
    const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!inlineData) {
      console.error("Full response:", JSON.stringify(data, null, 2));
      return res.status(500).json({
        message: "Gemini did not return image data",
        raw: data,
      });
    }

    const base64 = inlineData.data;
    const mimeType = inlineData.mimeType || "image/png";

    // ✅ Send usable data URL
    res.json({
      logo: `data:${mimeType};base64,${base64}`,
      message: "Logo generated successfully",
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
