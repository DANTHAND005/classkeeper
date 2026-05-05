const express = require("express");
const { body, param } = require("express-validator");
const Grade = require("../models/Grade");
const protect = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const grades = await Grade.find({ user: req.user._id })
      .populate("course", "name color")
      .sort({ createdAt: -1 });
    res.json(grades);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  [
    body("course").notEmpty().withMessage("Course is required"),
    body("name").trim().notEmpty().withMessage("Grade name is required"),
    body("score").isFloat({ min: 0 }).withMessage("Score must be a non-negative number"),
    body("outOf").isFloat({ min: 1 }).withMessage("Max score must be at least 1"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const grade = await Grade.create({
        user: req.user._id,
        course: req.body.course,
        name: req.body.name,
        score: Number(req.body.score),
        outOf: Number(req.body.outOf),
      });
      await grade.populate("course", "name color");
      res.status(201).json(grade);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid grade id"),
    body("name").trim().notEmpty().withMessage("Grade name is required"),
    body("score").isFloat({ min: 0 }).withMessage("Score must be a non-negative number"),
    body("outOf").isFloat({ min: 1 }).withMessage("Max score must be at least 1"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const grade = await Grade.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { name: req.body.name, score: Number(req.body.score), outOf: Number(req.body.outOf) },
        { new: true, runValidators: true }
      ).populate("course", "name color");
      if (!grade) return res.status(404).json({ message: "Grade not found" });
      res.json(grade);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:id",
  param("id").isMongoId().withMessage("Invalid grade id"),
  validate,
  async (req, res, next) => {
    try {
      const grade = await Grade.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!grade) return res.status(404).json({ message: "Grade not found" });
      res.json({ message: "Deleted" });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
