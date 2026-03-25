const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const verifyToken = require("../middleware/auth");
const User = require("../models/User");

// 🔐 UPDATE PASSWORD
router.post("/update-password", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // 1. Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // 2. Get user
    const user = await User.findById(userId);

    // 3. Compare current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // 4. Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating password",
      error: error.message
    });
  }
});

module.exports = router;