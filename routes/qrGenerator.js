const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");
const { createCanvas, loadImage } = require("canvas");
const multer = require("multer");

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

    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    const qrOptions = {
      errorCorrectionLevel: "H",
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
    const { 
      url, 
      primaryColor, 
      eyeColor,
      backgroundColor,
      companyInitial, 
      patternStyle 
    } = req.body;
    const logoFile = req.file;

    console.log("Received request:", {
      url,
      primaryColor,
      eyeColor,
      backgroundColor,
      companyInitial,
      patternStyle,
      hasLogo: !!logoFile,
    });

    if (!url) {
      return res.status(400).json({ message: "URL is required" });
    }

    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    const customColor = primaryColor || "#000000";
    const finderColor = eyeColor || customColor;
    const bgColor = backgroundColor || "#FFFFFF";
    const pattern = patternStyle || "square";
    const size = 600;

    // Step 1: Create canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Draw background color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Step 2: Generate QR matrix
    const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
    const moduleCount = qr.modules.size;
    const moduleSize = size / (moduleCount + 4); // +4 for margin (2 modules on each side)
    const offset = moduleSize * 2; // Start drawing with 2-module margin

    // Step 3: Draw QR code modules
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        const isDark = qr.modules.get(row, col);
        if (!isDark) continue;

        const x = offset + col * moduleSize;
        const y = offset + row * moduleSize;

        // Check if this is part of finder pattern (corner squares)
        const isFinder =
          (col < 7 && row < 7) || // Top-left
          (col > moduleCount - 8 && row < 7) || // Top-right
          (col < 7 && row > moduleCount - 8); // Bottom-left

        // Use finder color for finder patterns, QR color for rest
        ctx.fillStyle = isFinder ? finderColor : customColor;

        // Apply pattern style
        if (pattern === "square" || isFinder) {
          // Always use square for finder patterns to maintain scannability
          ctx.fillRect(x, y, moduleSize, moduleSize);
        } else if (pattern === "rounded") {
          roundRect(ctx, x, y, moduleSize, moduleSize, moduleSize / 3);
        } else if (pattern === "circle") {
          ctx.beginPath();
          ctx.arc(
            x + moduleSize / 2,
            y + moduleSize / 2,
            moduleSize / 2.2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    // Step 4: Add logo if provided
    if (logoFile) {
      try {
        const logoImage = await loadImage(logoFile.buffer);
        const logoSize = 120;
        const centerX = size / 2;
        const centerY = size / 2;

        // White circle background
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(centerX, centerY, logoSize / 2 + 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw logo (clipped to circle)
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          logoImage,
          centerX - logoSize / 2,
          centerY - logoSize / 2,
          logoSize,
          logoSize
        );
        ctx.restore();

        // Border
        ctx.strokeStyle = customColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, logoSize / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
      } catch (err) {
        console.error("Logo processing error:", err);
      }
    } else if (companyInitial) {
      // Step 5: Add initial in circular background with border
      const initial = companyInitial.charAt(0).toUpperCase();
      const centerX = size / 2;
      const centerY = size / 2;
      const circleRadius = 70;

      ctx.save();

      // Draw white circular background
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw border with QR color
      ctx.strokeStyle = customColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw initial with QR color
      ctx.fillStyle = customColor;
      ctx.font = "bold 80px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initial, centerX, centerY);

      ctx.restore();
    }

    // Convert to base64
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
      stack: err.stack,
    });
  }
});

// Helper function for rounded rectangles
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

module.exports = router;