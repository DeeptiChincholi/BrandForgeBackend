const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");
const { createCanvas, loadImage } = require("canvas");
const multer = require("multer");

// Configure multer for logo upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ========================================
// GENERATE BASIC QR CODE
// ========================================
router.post("/generate", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: "URL is required" });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    // Generate QR code options
    const qrOptions = {
      errorCorrectionLevel: "H", // High - allows 30% damage/customization
      type: "image/png",
      quality: 1,
      margin: 1,
      width: 512,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    };

    const qrCodeDataURL = await QRCode.toDataURL(url, qrOptions);
    const qrCodeSVG = await QRCode.toString(url, {
      ...qrOptions,
      type: "svg",
    });

    res.json({
      qrCodePNG: qrCodeDataURL,
      qrCodeSVG: qrCodeSVG,
      url: url,
      message: "QR Code generated successfully",
    });
  } catch (err) {
    console.error("QR Code Generation Error:", err);
    res.status(500).json({
      message: "QR Code generation failed",
      error: err.message,
    });
  }
});

// ========================================
// GENERATE CUSTOM QR CODE
// ========================================
router.post("/generate-custom", upload.single("logo"), async (req, res) => {
  try {
    const { url, primaryColor, shapeStyle, includeAIBackground, companyInitial } = req.body;
    const logoFile = req.file;

    if (!url) {
      return res.status(400).json({ message: "URL is required" });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    // Parse customization options
    const customColor = primaryColor || "#000000";
    const shape = shapeStyle || "square"; // square, dots, rounded, hearts, stars
    const useAIBg = includeAIBackground === "true";
    const initial = companyInitial || "";

    // Generate base QR code
    const qrOptions = {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 600,
      color: {
        dark: customColor,
        light: "#FFFFFF00", // Transparent background
      },
    };

    // Create canvas
    const canvas = createCanvas(700, 700);
    const ctx = canvas.getContext("2d");

    // Step 1: Add AI Background (if requested)
    if (useAIBg) {
      // Generate AI background using Gemini Image API
      const bgPrompt = `Create an abstract, professional background with ${customColor} color theme. Modern, elegant, and suitable for business branding. No text, just artistic patterns and gradients.`;
      
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GOOGLE_API_KEY}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: bgPrompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      });

      const data = await response.json();
      const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

      if (inlineData) {
        const bgBase64 = inlineData.data;
        const bgBuffer = Buffer.from(bgBase64, "base64");
        const bgImage = await loadImage(bgBuffer);
        ctx.drawImage(bgImage, 0, 0, 700, 700);
      }
    } else {
      // Simple gradient background
      const gradient = ctx.createLinearGradient(0, 0, 700, 700);
      gradient.addColorStop(0, "#FFFFFF");
      gradient.addColorStop(1, "#F5F5F5");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 700, 700);
    }

    // Step 2: Generate QR Code with custom shape
    const qrBuffer = await QRCode.toBuffer(url, qrOptions);
    const qrImage = await loadImage(qrBuffer);

    // Apply shape transformation based on style
    if (shape === "dots") {
      // Draw QR as dots instead of squares
      ctx.save();
      const qrSize = 500;
      const qrX = (700 - qrSize) / 2;
      const qrY = (700 - qrSize) / 2;
      
      // Sample the QR code and draw circles
      const tempCanvas = createCanvas(qrSize, qrSize);
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(qrImage, 0, 0, qrSize, qrSize);
      const imageData = tempCtx.getImageData(0, 0, qrSize, qrSize);
      
      const dotSize = 8;
      for (let y = 0; y < qrSize; y += dotSize) {
        for (let x = 0; x < qrSize; x += dotSize) {
          const i = (y * qrSize + x) * 4;
          if (imageData.data[i] < 128) {
            ctx.fillStyle = customColor;
            ctx.beginPath();
            ctx.arc(qrX + x + dotSize / 2, qrY + y + dotSize / 2, dotSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    } else if (shape === "rounded") {
      // Draw QR with rounded corners
      ctx.save();
      const qrSize = 500;
      const qrX = (700 - qrSize) / 2;
      const qrY = (700 - qrSize) / 2;
      
      const tempCanvas = createCanvas(qrSize, qrSize);
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(qrImage, 0, 0, qrSize, qrSize);
      const imageData = tempCtx.getImageData(0, 0, qrSize, qrSize);
      
      const blockSize = 8;
      const cornerRadius = 3;
      for (let y = 0; y < qrSize; y += blockSize) {
        for (let x = 0; x < qrSize; x += blockSize) {
          const i = (y * qrSize + x) * 4;
          if (imageData.data[i] < 128) {
            ctx.fillStyle = customColor;
            roundRect(ctx, qrX + x, qrY + y, blockSize, blockSize, cornerRadius);
          }
        }
      }
      ctx.restore();
    } else {
      // Default square style
      ctx.drawImage(qrImage, 100, 100, 500, 500);
    }

    // Step 3: Add Logo in Center (if provided)
    if (logoFile) {
      const logoImage = await loadImage(logoFile.buffer);
      const logoSize = 120;
      const logoX = (700 - logoSize) / 2;
      const logoY = (700 - logoSize) / 2;

      // White circle background for logo
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(350, 350, logoSize / 2 + 10, 0, Math.PI * 2);
      ctx.fill();

      // Draw logo
      ctx.save();
      ctx.beginPath();
      ctx.arc(350, 350, logoSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    }

    // Step 4: Add Company Initial (if provided and no logo)
    if (initial && !logoFile) {
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(350, 350, 80, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = customColor;
      ctx.font = "bold 100px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initial.charAt(0).toUpperCase(), 350, 360);
    }

    // Step 5: Add Gradient Frame
    const frameGradient = ctx.createLinearGradient(0, 0, 700, 700);
    frameGradient.addColorStop(0, customColor);
    frameGradient.addColorStop(1, adjustColor(customColor, -30));
    
    ctx.strokeStyle = frameGradient;
    ctx.lineWidth = 15;
    ctx.strokeRect(7.5, 7.5, 685, 685);

    // Convert canvas to base64
    const finalQR = canvas.toDataURL("image/png");

    res.json({
      qrCode: finalQR,
      message: "Custom QR Code generated successfully",
    });
  } catch (err) {
    console.error("Custom QR Generation Error:", err);
    res.status(500).json({
      message: "Custom QR generation failed",
      error: err.message,
    });
  }
});

// Helper function: Draw rounded rectangle
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

// Helper function: Adjust color brightness
function adjustColor(color, amount) {
  const num = parseInt(color.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

module.exports = router;