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
    const { url, primaryColor, eyeColor, backgroundColor, companyInitial, patternStyle } = req.body;
    const logoFile = req.file;

    console.log("Received request:", {
      url,
      primaryColor,
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

    // Step 1: Generate base QR code
    let qrBuffer;

    if (pattern === "square") {
      // Standard square QR
      qrBuffer = await QRCode.toBuffer(url, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: size,
        color: {
          dark: customColor,
          light: "#FFFFFF",
        },
      });
    } else {
      // For patterns, generate black/white first, then redraw
      qrBuffer = await QRCode.toBuffer(url, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: size,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
    }

    // Step 2: Create canvas and load QR
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Draw white background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    const qrImage = await loadImage(qrBuffer);

    // Step 3: Apply pattern if not square
    // Step 3: Apply pattern if not square
if (pattern !== "square") {

  // ✅ Create QR matrix properly
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });

  const moduleCount = qr.modules.size;
  const moduleSize = size / moduleCount;

  // Draw modules safely
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {

      const isDark = qr.modules.get(row, col);
      if (!isDark) continue;

      const x = col * moduleSize;
      const y = row * moduleSize;

      // ✅ Keep finder patterns square (VERY IMPORTANT)
      const isFinder =
        (col < 9 && row < 9) ||
        (col > moduleCount - 9 && row < 9) ||
        (col < 9 && row > moduleCount - 9);


      if (isFinder) {
        ctx.fillStyle = finderColor; // Use eye color for finders
        ctx.fillRect(x, y, moduleSize, moduleSize);
        continue;
      }

      ctx.fillStyle = customColor; // Use QR color for modules

      // ✅ Draw patterns
      // if (pattern === "dots") {
      //   ctx.beginPath();
      //   ctx.arc(
      //     x + moduleSize / 2,
      //     y + moduleSize / 2,
      //     moduleSize / 2,
      //     0,
      //     Math.PI * 2
      //   );
      //   ctx.fill();
      // }

      // else 
      if (pattern === "rounded") {
        roundRect(ctx, x, y, moduleSize, moduleSize, moduleSize / 3);
      }

      else if (pattern === "circle") {
        ctx.beginPath();
        ctx.arc(
          x + moduleSize / 2,
          y + moduleSize / 2,
          moduleSize / 2.1,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

} else {
  // Square QR stays same
  ctx.drawImage(qrImage, 0, 0, size, size);
  if (finderColor !== customColor) {
    const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
    const moduleCount = qr.modules.size;
    const moduleSize = size / moduleCount;

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        const isDark = qr.modules.get(row, col);
        if (!isDark) continue;

        const isFinder =
          (col < 9 && row < 9) ||
          (col > moduleCount - 9 && row < 9) ||
          (col < 9 && row > moduleCount - 9);

        if (isFinder) {
          const x = col * moduleSize;
          const y = row * moduleSize;
          ctx.fillStyle = finderColor;
          ctx.fillRect(x, y, moduleSize, moduleSize);
        }
      }
    }
  }
}


    // Step 4: Add logo if provided
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

        // Border
        ctx.strokeStyle = customColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
      } catch (err) {
        console.error("Logo processing error:", err);
      }
    } else if (companyInitial) {
      // Step 5: Add 3D embossed initial (like your reference image)
      const initial = companyInitial.charAt(0).toUpperCase();
      const centerX = size / 2;
      const centerY = size / 2;

      // Create 3D effect with multiple layers
      ctx.save();

      // Layer 1: Deep shadow (bottom right)
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.font = "bold 200px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initial, centerX + 6, centerY + 6);

      // Layer 2: Medium shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillText(initial, centerX + 4, centerY + 4);

      // Layer 3: Light shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillText(initial, centerX + 2, centerY + 2);

      // Layer 4: Main letter (white/light)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(initial, centerX, centerY);

      // Layer 5: Top highlight (gives 3D raised effect)
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText(initial, centerX - 1, centerY - 1);

      // Layer 6: Outline for definition
      // ctx.strokeStyle = customColor;
      // ctx.lineWidth = 3;
      // ctx.strokeText(initial, centerX, centerY);

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