// homeworkRoutes.js - handles everything related to homework assignments
// GET    /             - get all my homework
// POST   /             - add new homework
// GET    /:id          - get one homework item
// PUT    /:id          - update homework
// PATCH  /:id/complete - mark as complete or incomplete
// DELETE /:id          - delete homework

const express = require("express");
const { body, param } = require("express-validator");
const Homework = require("../models/Homework");
const Course = require("../models/Course");
const protect = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// validation rules shared between create and update
const homeworkValidators = [
  body("title").trim().notEmpty().withMessage("Homework title is required"),
  body("description").optional().trim().isLength({ max: 500 }).withMessage("Description must be shorter than 500 characters"),
  body("dueDate").isISO8601().withMessage("Due date is required"),
  body("dueTime").optional({ checkFalsy: true }).matches(/^\d{2}:\d{2}$/).withMessage("Due time must be in HH:MM format"),
  body("priority").isIn(["Low", "Medium", "High"]).withMessage("Choose a valid priority"),
  body("color").matches(/^#[0-9A-Fa-f]{6}$/).withMessage("Choose a valid color"),
  body("course").optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage("Invalid course id"),
];

// make sure the course being linked actually belongs to this user
async function assertCourseOwner(req, res, next) {
  try {
    if (!req.body.course) return next();
    const course = await Course.findOne({ _id: req.body.course, user: req.user._id });
    if (!course) return res.status(403).json({ message: "You cannot use another user's course" });
    next();
  } catch (error) {
    next(error);
  }
}

// all routes below require the user to be logged in
router.use(protect);

// GET / - return all homework for the logged in user sorted by due date
router.get("/", async (req, res, next) => {
  try {
    const homework = await Homework.find({ user: req.user._id }).populate("course").sort({ dueDate: 1 });
    res.json(homework);
  } catch (error) {
    next(error);
  }
});

// POST / - create a new homework item
router.post("/", homeworkValidators, validate, assertCourseOwner, async (req, res, next) => {
  try {
    const homework = await Homework.create({ ...req.body, course: req.body.course || null, user: req.user._id });
    const populated = await homework.populate("course");
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
});

// GET /:id - get a single homework item
router.get("/:id", param("id").isMongoId().withMessage("Invalid homework id"), validate, async (req, res, next) => {
  try {
    const homework = await Homework.findOne({ _id: req.params.id, user: req.user._id }).populate("course");
    if (!homework) return res.status(404).json({ message: "Homework not found" });
    res.json(homework);
  } catch (error) {
    next(error);
  }
});

// PUT /:id - update an existing homework item
router.put("/:id", param("id").isMongoId().withMessage("Invalid homework id"), homeworkValidators, validate, assertCourseOwner, async (req, res, next) => {
  try {
    const homework = await Homework.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ...req.body, course: req.body.course || null },
      { new: true, runValidators: true }
    ).populate("course");
    if (!homework) return res.status(404).json({ message: "Homework not found" });
    res.json(homework);
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/complete - toggle the completed status of a homework item
router.patch("/:id/complete", param("id").isMongoId().withMessage("Invalid homework id"), body("completed").isBoolean().withMessage("Completed must be true or false"), validate, async (req, res, next) => {
  try {
    const homework = await Homework.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { completed: req.body.completed },
      { new: true, runValidators: true }
    ).populate("course");
    if (!homework) return res.status(404).json({ message: "Homework not found" });
    res.json(homework);
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - delete a homework item
router.delete("/:id", param("id").isMongoId().withMessage("Invalid homework id"), validate, async (req, res, next) => {
  try {
    const homework = await Homework.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!homework) return res.status(404).json({ message: "Homework not found" });
    res.json({ message: "Homework deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
