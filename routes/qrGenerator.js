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
      patternStyle,
      roundedEyes 
    } = req.body;
    const logoFile = req.file;

    console.log("Received request:", {
      url,
      primaryColor,
      eyeColor,
      backgroundColor,
      companyInitial,
      patternStyle,
      roundedEyes,
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
    const useRoundedEyes = roundedEyes === "true" || roundedEyes === true;
    const size = 600;

    // Step 1: Generate base QR code
    let qrBuffer;

    if (pattern === "square") {
      qrBuffer = await QRCode.toBuffer(url, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: size,
        color: {
          dark: customColor,
          light: bgColor,
        },
      });
    } else {
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

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    const qrImage = await loadImage(qrBuffer);

    // Step 3: Apply pattern if not square
    if (pattern !== "square") {
      const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
      const moduleCount = qr.modules.size;
      const moduleSize = size / moduleCount;

      // Draw modules
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          const isDark = qr.modules.get(row, col);
          if (!isDark) continue;

          const x = col * moduleSize;
          const y = row * moduleSize;

          const isFinder =
            (col < 9 && row < 9) ||
            (col > moduleCount - 9 && row < 9) ||
            (col < 9 && row > moduleCount - 9);

          if (isFinder) {
            continue; // Skip finders, draw them separately
          }

          ctx.fillStyle = customColor;

          if (pattern === "rounded") {
            roundRect(ctx, x, y, moduleSize, moduleSize, moduleSize / 3);
          } else if (pattern === "circle") {
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

      // Draw finder patterns
      if (useRoundedEyes) {
        drawRoundedFinderPattern(ctx, 0, 0, moduleSize, finderColor);
        drawRoundedFinderPattern(ctx, (moduleCount - 7) * moduleSize, 0, moduleSize, finderColor);
        drawRoundedFinderPattern(ctx, 0, (moduleCount - 7) * moduleSize, moduleSize, finderColor);
      } else {
        // Draw square finders
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

    } else {
      // Square pattern
      const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
      const moduleCount = qr.modules.size;
      const moduleSize = size / moduleCount;

      // Draw all modules
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (!qr.modules.get(row, col)) continue;

          const x = col * moduleSize;
          const y = row * moduleSize;

          const isFinder =
            (col < 9 && row < 9) ||
            (col > moduleCount - 9 && row < 9) ||
            (col < 9 && row > moduleCount - 9);

          if (useRoundedEyes && isFinder) {
            continue; // Skip, will draw rounded version
          }

          ctx.fillStyle = isFinder ? finderColor : customColor;
          ctx.fillRect(x, y, moduleSize, moduleSize);
        }
      }

      // Draw rounded finders if enabled
      if (useRoundedEyes) {
        drawRoundedFinderPattern(ctx, 0, 0, moduleSize, finderColor);
        drawRoundedFinderPattern(ctx, (moduleCount - 7) * moduleSize, 0, moduleSize, finderColor);
        drawRoundedFinderPattern(ctx, 0, (moduleCount - 7) * moduleSize, moduleSize, finderColor);
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
      // Step 5: Add initial in circular background
      const initial = companyInitial.charAt(0).toUpperCase();
      const centerX = size / 2;
      const centerY = size / 2;
      const circleRadius = 70;

      ctx.save();

      // White circular background
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Border with QR color
      ctx.strokeStyle = customColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Initial with QR color
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

// ========================================
// HELPER FUNCTIONS
// ========================================

// Draw Instagram-style rounded finder pattern
function drawRoundedFinderPattern(ctx, x, y, moduleSize, color) {
  const size = moduleSize * 7; // Finder is 7x7 modules
  const outerRadius = size / 4;
  const innerSize = moduleSize * 3;
  const innerRadius = innerSize / 4;
  const centerPos = size / 2;

  ctx.save();
  
  // Outer rounded square (thick ring)
  ctx.fillStyle = color;
  ctx.beginPath();
  roundRectPath(ctx, x, y, size, size, outerRadius);
  ctx.fill();
  
  // Cut out inner rounded square (creates ring effect)
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  roundRectPath(
    ctx, 
    x + moduleSize * 2, 
    y + moduleSize * 2, 
    innerSize, 
    innerSize, 
    innerRadius
  );
  ctx.fill();
  
  // Add center dot
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(
    x + centerPos,
    y + centerPos,
    moduleSize * 1.5,
    0,
    Math.PI * 2
  );
  ctx.fill();
  
  ctx.restore();
}

// Helper for rounded rectangle path (no fill)
function roundRectPath(ctx, x, y, width, height, radius) {
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
}

// Helper for rounded rectangles with fill
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