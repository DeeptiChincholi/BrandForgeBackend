const User = require("../models/User");

const checkAccess = (feature) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // 🔹 STEP 1: Check expiry
      if (user.subscription.expiryDate) {
        const currentDate = new Date();

        if (currentDate > user.subscription.expiryDate) {
          user.subscription.isActive = false;
          await user.save();
        }
      }

      // 🔹 STEP 2: If premium active → allow
      if (user.subscription.isActive) {
        return next();
      }

      // 🔹 STEP 3: Check free usage
      if (!user.freeUsage[feature]) {
        user.freeUsage[feature] = true;
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