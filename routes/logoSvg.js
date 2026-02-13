const express = require("express");
const router = express.Router();

const COLORS = [
  ["#ff6f61","#ffb347"], // Modern
  ["#6a11cb","#2575fc"], // Minimalist
  ["#fddb92","#d1fdff"], // Bold
  ["#ffecd2","#fcb69f"], // Elegant
  ["#a18cd1","#fbc2eb"], // Playful
  ["#43cea2","#185a9d"], // Professional
];

const FONT_STYLES = {
  Modern: "Helvetica, Arial, sans-serif",
  Minimalist: "Verdana, sans-serif",
  Bold: "Impact, Arial Black, sans-serif",
  Elegant: "Georgia, serif",
  Playful: "Comic Sans MS, cursive",
  Professional: "Verdana, sans-serif"
};

const KEYWORD_SHAPES = {
  tech: '<polygon points="50,10 90,90 10,90" fill="white" opacity="0.3"/>',
  food: '<circle cx="50" cy="50" r="20" fill="white" opacity="0.3"/>',
  creative: '<polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" fill="white" opacity="0.3"/>',
};

router.post("/generate", (req, res) => {
  try {
    const { companyName, description, brandGoals } = req.body;

    if (!companyName || !description) {
      return res.status(400).json({ message: "Company name and description required" });
    }

    const descLower = description.toLowerCase();

    const logos = COLORS.map((colors, idx) => {
      const styleName = Object.keys(FONT_STYLES)[idx];
      const font = FONT_STYLES[styleName];

      // Add extra shapes if keywords match
      let extraShapes = "";
      Object.keys(KEYWORD_SHAPES).forEach((keyword) => {
        if (descLower.includes(keyword)) extraShapes += KEYWORD_SHAPES[keyword];
      });

      const firstLetter = companyName.charAt(0).toUpperCase();

      const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <linearGradient id="grad${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors[0]}" />
      <stop offset="100%" stop-color="${colors[1]}" />
    </linearGradient>
    <filter id="shadow${idx}" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="rgba(0,0,0,0.4)"/>
    </filter>
  </defs>

  <rect width="512" height="512" rx="50" ry="50" fill="url(#grad${idx})" filter="url(#shadow${idx})"/>

  ${extraShapes}

  <text x="50%" y="45%" font-family="${font}" font-size="150" fill="white" text-anchor="middle" alignment-baseline="middle" filter="url(#shadow${idx})">${firstLetter}</text>

  <text x="50%" y="75%" font-family="${font}" font-size="40" fill="white" text-anchor="middle" alignment-baseline="middle" filter="url(#shadow${idx})">${companyName}</text>
</svg>
`;
      return { styleName, svg };
    });

    res.json({ logos });

  } catch (err) {
    console.log("SVG Logo Error:", err);
    res.status(500).json({ message: "Logo generation failed" });
  }
});

module.exports = router;
