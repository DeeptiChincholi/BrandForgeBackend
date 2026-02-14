const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");

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
      width: 512, // High resolution
      color: {
        dark: "#000000", // Black QR code
        light: "#FFFFFF", // White background
      },
    };

    // Generate QR code as base64
    const qrCodeDataURL = await QRCode.toDataURL(url, qrOptions);

    // Also generate SVG version
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

module.exports = router;