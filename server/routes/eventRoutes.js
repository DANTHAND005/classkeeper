// eventRoutes.js - handles everything related to events (tests, activities, reminders, etc.)
// GET    /     - get all my events
// POST   /     - add a new event
// GET    /:id  - get one event
// PUT    /:id  - update an event
// DELETE /:id  - delete an event

const express = require("express");
const { body, param } = require("express-validator");
const Event = require("../models/Event");
const protect = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// validation rules for creating or updating an event
const eventValidators = [
  body("title").trim().notEmpty().withMessage("Event title is required"),
  body("type").isIn(["Activity", "Event", "Test", "Reminder"]).withMessage("Choose a valid event type"),
  body("date").isISO8601().withMessage("Event date is required"),
  body("time").optional().trim(),
  body("location").optional().trim().isLength({ max: 120 }).withMessage("Location must be shorter than 120 characters"),
  body("notes").optional().trim().isLength({ max: 500 }).withMessage("Notes must be shorter than 500 characters"),
  body("color").matches(/^#[0-9A-Fa-f]{6}$/).withMessage("Choose a valid color"),
];

// all routes below require the user to be logged in
router.use(protect);

// GET / - return all events sorted by date then time
router.get("/", async (req, res, next) => {
  try {
    const events = await Event.find({ user: req.user._id }).sort({ date: 1, time: 1 });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// POST / - create a new event
router.post("/", eventValidators, validate, async (req, res, next) => {
  try {
    const event = await Event.create({ ...req.body, user: req.user._id });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

// GET /:id - get a single event by id
router.get("/:id", param("id").isMongoId().withMessage("Invalid event id"), validate, async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, user: req.user._id });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// PUT /:id - update an existing event
router.put("/:id", param("id").isMongoId().withMessage("Invalid event id"), eventValidators, validate, async (req, res, next) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - delete an event
router.delete("/:id", param("id").isMongoId().withMessage("Invalid event id"), validate, async (req, res, next) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
