const express = require("express");
const router = express.Router();
require("dotenv").config();

// ========================================
// 1. GENERATE HASHTAGS
// ========================================
router.post("/generate-hashtags", async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }

    const prompt = `Generate 10-15 relevant and trending hashtags for the following business/post description. Return ONLY the hashtags, each on a new line, starting with #. No explanations or additional text.

Description: ${description}

Format example:
#hashtag1
#hashtag2
#hashtag3`;

    // ✅ CORRECT MODEL NAME
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Gemini API Error:", data.error);
      return res.status(500).json({ 
        message: "Failed to generate hashtags",
        error: data.error 
      });
    }

    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return res.status(500).json({ message: "No hashtags generated" });
    }

    // Parse hashtags from response
    const hashtags = textContent
      .split("\n")
      .filter(line => line.trim().startsWith("#"))
      .map(line => line.trim())
      .slice(0, 15);

    res.json({ hashtags });
  } catch (err) {
    console.error("Hashtag Generation Error:", err);
    res.status(500).json({ 
      message: "Hashtag generation failed",
      error: err.message 
    });
  }
});

// ========================================
// 2. GENERATE CAPTIONS
// ========================================
router.post("/generate-captions", async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }

    const prompt = `Generate 5 engaging and creative social media captions for the following business/post description. Make them varied in style - some professional, some casual, some with emojis. Each caption should be compelling and encourage engagement.

Description: ${description}

Return ONLY the captions, separated by "---" (three dashes). No numbering or additional text.

Format example:
Caption one here 🚀
---
Caption two here ✨
---
Caption three here 💡`;

    // ✅ CORRECT MODEL NAME
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API Error:", data.error);
      return res.status(500).json({ 
        message: "Failed to generate captions",
        error: data.error 
      });
    }

    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return res.status(500).json({ message: "No captions generated" });
    }

    // Parse captions from response
    const captions = textContent
      .split("---")
      .map(caption => caption.trim())
      .filter(caption => caption.length > 0)
      .slice(0, 5);

    res.json({ captions });
  } catch (err) {
    console.error("Caption Generation Error:", err);
    res.status(500).json({ 
      message: "Caption generation failed",
      error: err.message 
    });
  }
});

// ========================================
// 3. GENERATE THUMBNAIL
// ========================================
router.post("/generate-thumbnail", async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }

    const prompt = `Create an eye-catching, professional social media thumbnail/cover image for the following:

${description}

Style requirements:
- Bold, vibrant colors
- Modern and professional design
- Eye-catching and scroll-stopping
- Suitable for YouTube thumbnail or Instagram post
- High contrast and clear visual hierarchy
- No text (visual elements only)
- 16:9 aspect ratio preferred`;

    // ✅ CORRECT MODEL NAME (same as your logo generator)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GOOGLE_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Gemini Image API Error:", data.error);
      return res.status(500).json({ 
        message: "Failed to generate thumbnail",
        error: data.error 
      });
    }

    const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!inlineData) {
      return res.status(500).json({ 
        message: "No thumbnail generated",
        raw: data 
      });
    }

    const base64 = inlineData.data;
    const mimeType = inlineData.mimeType || "image/png";

    res.json({
      thumbnail: `data:${mimeType};base64,${base64}`,
      message: "Thumbnail generated successfully",
    });
  } catch (err) {
    console.error("Thumbnail Generation Error:", err);
    res.status(500).json({ 
      message: "Thumbnail generation failed",
      error: err.message 
    });
  }
});

module.exports = router;