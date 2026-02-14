const express = require("express");
const router = express.Router();

const QRCode = require("qrcode");
const { createCanvas, loadImage } = require("canvas");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* ======================================================
   BASIC QR GENERATION (PNG + SVG)
====================================================== */
router.post("/generate", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return res.status(400).json({ message: "URL is required" });

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    const qrOptions = {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 512,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    };

    const qrPNG = await QRCode.toDataURL(url, qrOptions);
    const qrSVG = await QRCode.toString(url, { ...qrOptions, type: "svg" });

    res.json({
      qrCodePNG: qrPNG,
      qrCodeSVG: qrSVG,
      url,
      message: "QR Code generated successfully",
    });
  } catch (err) {
    console.error("QR Generation Error:", err);
    res.status(500).json({ message: "QR generation failed" });
  }
});

/* ======================================================
   CUSTOM QR GENERATION (Patterns + Logo + Initial)
====================================================== */
router.post("/generate-custom", upload.single("logo"), async (req, res) => {
  try {
    const { url, primaryColor, companyInitial, patternStyle } = req.body;
    const logoFile = req.file;

    if (!url) return res.status(400).json({ message: "URL is required" });

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    const customColor = primaryColor || "#000000";
    const pattern = patternStyle || "square";
    const size = 600;

    /* -------------------------------
       STEP 1: Generate Base QR Buffer
    -------------------------------- */
    const qrBuffer = await QRCode.toBuffer(url, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: size,
      color: {
        dark: pattern === "square" ? customColor : "#000000",
        light: "#FFFFFF",
      },
    });

    /* -------------------------------
       STEP 2: Setup Canvas
    -------------------------------- */
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Background White
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);

    const qrImage = await loadImage(qrBuffer);

    /* -------------------------------
       STEP 3: Draw QR Pattern
    -------------------------------- */
    if (pattern === "square") {
      // Normal QR
      ctx.drawImage(qrImage, 0, 0, size, size);
    } else {
      // Create QR module matrix
      const qr = QRCode.create(url, { errorCorrectionLevel: "H" });

      const moduleCount = qr.modules.size;
      const moduleSize = size / moduleCount;

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          const isDark = qr.modules.get(row, col);
          if (!isDark) continue;

          const x = col * moduleSize;
          const y = row * moduleSize;

          // Protect Finder Patterns
          const isFinder =
            (col < 9 && row < 9) ||
            (col > moduleCount - 9 && row < 9) ||
            (col < 9 && row > moduleCount - 9);

          ctx.fillStyle = customColor;

          if (isFinder) {
            ctx.fillRect(x, y, moduleSize, moduleSize);
            continue;
          }

          /* ---- Pattern Styles ---- */

          // ✅ Circle
          if (pattern === "circle") {
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

          // ✅ Diamond
          else if (pattern === "diamond") {
            ctx.save();
            ctx.translate(x + moduleSize / 2, y + moduleSize / 2);
            ctx.rotate(Math.PI / 4);

            ctx.fillRect(
              -moduleSize / 2.2,
              -moduleSize / 2.2,
              moduleSize / 1.1,
              moduleSize / 1.1
            );

            ctx.restore();
          }

          // ✅ Sparkle
          else if (pattern === "sparkle") {
            // Outer circle
            ctx.beginPath();
            ctx.arc(
              x + moduleSize / 2,
              y + moduleSize / 2,
              moduleSize / 2.3,
              0,
              Math.PI * 2
            );
            ctx.fill();

            // Inner shine
            ctx.beginPath();
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.arc(
              x + moduleSize / 2.3,
              y + moduleSize / 2.3,
              moduleSize / 6,
              0,
              Math.PI * 2
            );
            ctx.fill();

            ctx.fillStyle = customColor;
          }
        }
      }
    }

    /* -------------------------------
       STEP 4: Add Logo OR Initial
    -------------------------------- */

    // ✅ Logo
    if (logoFile) {
      const logoImage = await loadImage(logoFile.buffer);

      const logoSize = 120;
      const logoX = (size - logoSize) / 2;
      const logoY = (size - logoSize) / 2;

      // White safe background circle
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, logoSize / 2 + 12, 0, Math.PI * 2);
      ctx.fill();

      // Clip logo inside circle
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
      ctx.arc(size / 2, size / 2, logoSize / 2 + 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ✅ Initial
    else if (companyInitial) {
      const initial = companyInitial.charAt(0).toUpperCase();

      ctx.save();
      ctx.font = "bold 190px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(initial, size / 2, size / 2);

      ctx.restore();
    }

    /* -------------------------------
       STEP 5: Return Final QR
    -------------------------------- */
    const finalQR = canvas.toDataURL("image/png");

    res.json({
      qrCode: finalQR,
      message: "Custom QR generated successfully",
    });
  } catch (err) {
    console.error("Custom QR Error:", err);
    res.status(500).json({
      message: "Custom QR generation failed",
      error: err.message,
    });
  }
});

module.exports = router;
