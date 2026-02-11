const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const portfolioRoutes = require("./routes/portfolioRoutes.js");

const app = express();

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

// ✅ VERY IMPORTANT
// app.use("/templates", express.static("templates"));
app.use("/api/portfolio", portfolioRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
