const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/auth");
const User = require("../models/User");

router.post("/buy", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { planType } = req.body;

    // 🔹 Step 1: Validate planType
    const validPlans = ["WEEK", "MONTH", "YEAR"];

    if (!validPlans.includes(planType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan type"
      });
    }

    // 🔹 Step 2: Get user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // 🔹 Step 3: Decide duration
    let durationDays = 0;

    if (planType === "WEEK") durationDays = 7;
    if (planType === "MONTH") durationDays = 30;
    if (planType === "YEAR") durationDays = 365;

    // 🔹 Step 4: Calculate dates
    const currentDate = new Date();
    let startDate = currentDate;
    let expiryDate;

    // 🔁 Renew logic
    if (
      user.subscription.isActive &&
      user.subscription.expiryDate &&
      new Date(user.subscription.expiryDate) > currentDate
    ) {
      // extend from existing expiry
      startDate = user.subscription.expiryDate;
    }

    expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    // 🔹 Step 5: Update subscription
    user.subscription = {
      planType,
      startDate: currentDate,
      expiryDate,
      isActive: true
    };

    await user.save();

    // 🔹 Step 6: Response
    return res.status(200).json({
      success: true,
      message: "Subscription activated successfully",
      plan: {
        type: planType,
        expiryDate
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Subscription error",
      error: error.message
    });
  }
});

module.exports = router;