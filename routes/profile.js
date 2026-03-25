// routes/profile.js
const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth");
const User = require("../models/User");

router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message
    });
  }
});

module.exports = router;