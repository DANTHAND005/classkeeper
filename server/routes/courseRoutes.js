// courseRoutes.js - handles everything related to courses
// GET    /         - get all my courses
// POST   /         - add a new course
// GET    /:id      - get one course
// PUT    /:id      - update a course
// DELETE /:id      - delete a course (also removes course from any homework)

const express = require("express");
const { body, param } = require("express-validator");
const Course = require("../models/Course");
const Homework = require("../models/Homework");
const protect = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();
const hexMessage = "Choose a valid color";

// rules that every course must follow
const courseValidators = [
  body("name").trim().notEmpty().withMessage("Course name is required"),
  body("teacher").optional().trim().isLength({ max: 80 }).withMessage("Teacher must be shorter than 80 characters"),
  body("room").optional().trim().isLength({ max: 40 }).withMessage("Room must be shorter than 40 characters"),
  body("color").matches(/^#[0-9A-Fa-f]{6}$/).withMessage(hexMessage),
];

// all routes below require the user to be logged in
router.use(protect);

// GET / - return all courses for the logged in user, sorted by name
router.get("/", async (req, res, next) => {
  try {
    const courses = await Course.find({ user: req.user._id }).sort({ name: 1 });
    res.json(courses);
  } catch (error) {
    next(error);
  }
});

// POST / - create a new course
router.post("/", courseValidators, validate, async (req, res, next) => {
  try {
    const course = await Course.create({ ...req.body, user: req.user._id });
    res.status(201).json(course);
  } catch (error) {
    next(error);
  }
});

// GET /:id - get a single course by id (must belong to this user)
router.get("/:id", param("id").isMongoId().withMessage("Invalid course id"), validate, async (req, res, next) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, user: req.user._id });
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (error) {
    next(error);
  }
});

// PUT /:id - update an existing course
router.put("/:id", param("id").isMongoId().withMessage("Invalid course id"), courseValidators, validate, async (req, res, next) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true } // new: true returns the updated version
    );
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - delete a course and unlink it from any homework that used it
router.delete("/:id", param("id").isMongoId().withMessage("Invalid course id"), validate, async (req, res, next) => {
  try {
    const course = await Course.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!course) return res.status(404).json({ message: "Course not found" });

    // set course to null on any homework that was linked to this course
    await Homework.updateMany({ user: req.user._id, course: course._id }, { $set: { course: null } });
    res.json({ message: "Course deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
