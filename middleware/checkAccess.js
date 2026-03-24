const User = require("../models/User");

const checkAccess = (feature) => {
  return async (req, res, next) => {
    try {
      const allowedFeatures = ["logo", "portfolio", "thumbnail", "customQR"];

      if (!allowedFeatures.includes(feature)) {
        return res.status(400).json({
          message: "Invalid feature"
        });
      }

      const userId = req.user.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentDate = new Date();

      // 🔹 STEP 1: Expiry check
      if (
        user.subscription.expiryDate &&
        currentDate > user.subscription.expiryDate &&
        user.subscription.isActive
      ) {
        user.subscription.isActive = false;
        await user.save();
      }

      // 🔹 STEP 2: Premium access
      if (user.subscription.isActive) {
        return next();
      }

      // 🔹 STEP 3: Free usage
      if (!user.freeUsage[feature]) {
        user.freeUsage[feature] = true;
        user.markModified("freeUsage");
        await user.save();
        return next();
      }

      // 🔴 STEP 4: Block
      return res.status(403).json({
        success: false,
        message: "Free limit reached. Please upgrade your plan."
      });

    } catch (error) {
      return res.status(500).json({
        message: "Access control error",
        error: error.message
      });
    }
  };
};

module.exports = checkAccess;