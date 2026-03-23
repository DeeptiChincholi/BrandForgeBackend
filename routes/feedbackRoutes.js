const express = require("express");
const router = express.Router();
const Feedback = require("../models/Feedback");
const verifyToken = require("../middleware/auth");

// POST feedback (save feedback)
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const feedback = new Feedback(req.body);
    await feedback.save();
    res.status(201).json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET feedback (for analytics)
router.get("/", async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    res.json(feedbacks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;