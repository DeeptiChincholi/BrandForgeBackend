const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());


const portfolioRoutes = require("./routes/portfolioRoutes.js");
const logoGeminiRoutes = require("./routes/logoGemini.js");
const contentRoutes = require("./routes/contentGenerator.js");
const qrRoutes = require("./routes/qrGenerator.js");

/* ROUTES */
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/logo-gemini", logoGeminiRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/qr", qrRoutes);

/* ✅ CONNECT MONGODB */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
