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

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  })
  .catch((err) => console.log(err));
