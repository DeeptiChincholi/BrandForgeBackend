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
      patternStyle,
      qrOuterShape, 
      companyInitial,
      useAIBackground 
    } = req.body;
    const logoFile = req.file;

    if (!url) {
      return res.status(400).json({ message: "URL is required" });
    }

    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    const customColor = primaryColor || "#000000";
    const pattern = patternStyle || "square";
    const outerShape = qrOuterShape || "square";
    const initial = companyInitial || "";
    const includeAIBg = useAIBackground === "true";

    // Canvas size
    const size = 800;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");

    // Step 1: Generate AI Background (if requested)
    if (includeAIBg) {
      try {
        const bgPrompt = `Create a subtle, elegant background pattern with soft pastel colors and light gradients. Minimalist and professional. Main color theme: ${customColor}. Very light and not overpowering. Perfect for QR code background. Abstract gentle patterns.`;
        
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
          
          // Draw AI background at exact QR size
          ctx.save();
          ctx.drawImage(bgImage, 0, 0, size, size);
          ctx.restore();
        } else {
          // Fallback: light gradient
          const gradient = ctx.createLinearGradient(0, 0, size, size);
          gradient.addColorStop(0, lightenColor(customColor, 85));
          gradient.addColorStop(1, lightenColor(customColor, 70));
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, size, size);
        }
      } catch (err) {
        console.error("AI Background Error:", err);
        // Fallback gradient
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, "#FAFAFA");
        gradient.addColorStop(1, lightenColor(customColor, 75));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
      }
    } else {
      // White background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);
    }

    // Step 2: Generate base QR code
    const qrSize = 600;
    const qrBuffer = await QRCode.toBuffer(url, {
      errorCorrectionLevel: "H",
      margin: 0,
      width: qrSize,
      color: {
        dark: "#000000",
        light: "#FFFFFF00", // Transparent
      },
    });

    const qrImage = await loadImage(qrBuffer);
    const tempCanvas = createCanvas(qrSize, qrSize);
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(qrImage, 0, 0, qrSize, qrSize);
    const imageData = tempCtx.getImageData(0, 0, qrSize, qrSize);

    // Step 3: Draw QR with custom pattern
    const qrX = (size - qrSize) / 2;
    const qrY = (size - qrSize) / 2;
    const moduleSize = 10;

    for (let y = 0; y < qrSize; y += moduleSize) {
      for (let x = 0; x < qrSize; x += moduleSize) {
        const i = (y * qrSize + x) * 4;
        const isDark = imageData.data[i] < 128;

        if (isDark) {
          const centerX = qrX + x + moduleSize / 2;
          const centerY = qrY + y + moduleSize / 2;
          ctx.fillStyle = customColor;

          switch (pattern) {
            case "dots":
              ctx.beginPath();
              ctx.arc(centerX, centerY, moduleSize / 2, 0, Math.PI * 2);
              ctx.fill();
              break;

            case "rounded":
              roundRect(ctx, qrX + x, qrY + y, moduleSize, moduleSize, moduleSize / 4);
              break;

            case "heart":
              ctx.save();
              ctx.translate(centerX, centerY);
              ctx.scale(moduleSize / 40, moduleSize / 40);
              drawHeartShape(ctx);
              ctx.restore();
              break;

            case "star":
              ctx.save();
              ctx.translate(centerX, centerY);
              drawStar(ctx, 0, 0, 5, moduleSize / 2, moduleSize / 4);
              ctx.restore();
              break;

            case "circle":
              ctx.beginPath();
              ctx.arc(centerX, centerY, moduleSize / 2.2, 0, Math.PI * 2);
              ctx.fill();
              break;

            default: // square
              ctx.fillRect(qrX + x, qrY + y, moduleSize, moduleSize);
          }
        }
      }
    }

    // Step 4: Add logo or initial
    const centerPos = size / 2;

    if (logoFile) {
      // Logo with white background
      const logoImage = await loadImage(logoFile.buffer);
      const logoSize = 140;
      const logoPos = (size - logoSize) / 2;

      // White circle background
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(centerPos, centerPos, logoSize / 2 + 15, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = customColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw logo
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerPos, centerPos, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImage, logoPos, logoPos, logoSize, logoSize);
      ctx.restore();
    } else if (initial) {
      // Initial in white (no background)
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 140px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Outline for visibility
      ctx.strokeStyle = customColor;
      ctx.lineWidth = 6;
      ctx.strokeText(initial.charAt(0).toUpperCase(), centerPos, centerPos + 5);
      
      // Fill
      ctx.fillText(initial.charAt(0).toUpperCase(), centerPos, centerPos + 5);
      ctx.restore();
    }

    // Step 5: Apply outer shape mask
    const finalCanvas = createCanvas(size, size);
    const finalCtx = finalCanvas.getContext("2d");

    switch (outerShape) {
      case "circle":
        finalCtx.beginPath();
        finalCtx.arc(centerPos, centerPos, size / 2 - 20, 0, Math.PI * 2);
        finalCtx.clip();
        finalCtx.drawImage(canvas, 0, 0);
        
        // Border
        finalCtx.strokeStyle = customColor;
        finalCtx.lineWidth = 8;
        finalCtx.beginPath();
        finalCtx.arc(centerPos, centerPos, size / 2 - 20, 0, Math.PI * 2);
        finalCtx.stroke();
        break;

      case "heart":
        finalCtx.save();
        finalCtx.translate(centerPos, centerPos - 50);
        finalCtx.scale(3.5, 3.5);
        drawHeartPath(finalCtx);
        finalCtx.clip();
        finalCtx.drawImage(canvas, -centerPos, -centerPos + 50);
        finalCtx.restore();
        
        // Border
        finalCtx.save();
        finalCtx.translate(centerPos, centerPos - 50);
        finalCtx.scale(3.5, 3.5);
        drawHeartPath(finalCtx);
        finalCtx.strokeStyle = customColor;
        finalCtx.lineWidth = 3;
        finalCtx.stroke();
        finalCtx.restore();
        break;

      case "rounded":
        const radius = 60;
        roundRect(finalCtx, 50, 50, size - 100, size - 100, radius);
        finalCtx.clip();
        finalCtx.drawImage(canvas, 0, 0);
        
        // Border
        finalCtx.strokeStyle = customColor;
        finalCtx.lineWidth = 8;
        roundRect(finalCtx, 50, 50, size - 100, size - 100, radius);
        finalCtx.stroke();
        break;

      default: // square
        finalCtx.drawImage(canvas, 0, 0);
        
        // Border
        finalCtx.strokeStyle = customColor;
        finalCtx.lineWidth = 8;
        finalCtx.strokeRect(40, 40, size - 80, size - 80);
    }

    const finalQR = finalCanvas.toDataURL("image/png");

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

// ========================================
// HELPER FUNCTIONS
// ========================================

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

function drawHeartShape(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(0, 5, -5, 0, -10, 0);
  ctx.bezierCurveTo(-15, 0, -20, 5, -20, 10);
  ctx.bezierCurveTo(-20, 15, -15, 20, 0, 30);
  ctx.bezierCurveTo(15, 20, 20, 15, 20, 10);
  ctx.bezierCurveTo(20, 5, 15, 0, 10, 0);
  ctx.bezierCurveTo(5, 0, 0, 5, 0, 10);
  ctx.closePath();
  ctx.fill();
}

function drawHeartPath(ctx) {
  const x = 0;
  const y = 0;
  const size = 100;
  
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.3);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size * 0.3);
  ctx.bezierCurveTo(x - size / 2, y + size * 0.7, x, y + size * 0.9, x, y + size);
  ctx.bezierCurveTo(x, y + size * 0.9, x + size / 2, y + size * 0.7, x + size / 2, y + size * 0.3);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size * 0.3);
  ctx.closePath();
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

function lightenColor(color, percent) {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return "#" + ((R << 16) | (G << 8) | B).toString(16).padStart(6, "0");
}

module.exports = router;