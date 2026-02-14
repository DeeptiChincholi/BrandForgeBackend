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
// GENERATE CUSTOM QR CODE (WORKING VERSION)
// ========================================
router.post("/generate-custom", upload.single("logo"), async (req, res) => {
  try {
    const { 
      url, 
      primaryColor, 
      patternStyle,
      qrOuterShape, 
      companyInitial,
      useAIBackground 
    } = req.body;
    const logoFile = req.file;

    console.log("Received request:", {
      url,
      primaryColor,
      patternStyle,
      qrOuterShape,
      companyInitial,
      useAIBackground,
      hasLogo: !!logoFile
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
    const size = 600;

    // Step 1: Generate base QR code with custom color
    const qrBuffer = await QRCode.toBuffer(url, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: size,
      color: {
        dark: customColor,
        light: "#FFFFFF",
      },
    });

    // Step 2: Load QR into canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");
    const qrImage = await loadImage(qrBuffer);
    ctx.drawImage(qrImage, 0, 0, size, size);

    // Step 3: Add logo if provided
    if (logoFile) {
      try {
        const logoImage = await loadImage(logoFile.buffer);
        const logoSize = 120;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;

        // White circle background
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw logo
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
        ctx.restore();

        // Border around logo
        ctx.strokeStyle = customColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
      } catch (err) {
        console.error("Logo processing error:", err);
      }
    } else if (companyInitial) {
      // Add initial letter
      const initial = companyInitial.charAt(0).toUpperCase();
      
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 100px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Stroke for visibility
      ctx.strokeStyle = customColor;
      ctx.lineWidth = 8;
      ctx.strokeText(initial, size / 2, size / 2);
      
      // Fill
      ctx.fillText(initial, size / 2, size / 2);
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
      stack: err.stack
    });
  }
});

module.exports = router;