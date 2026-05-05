// Homework.js - defines what a homework assignment looks like in the database
// each field here becomes a column in MongoDB

const mongoose = require("mongoose");

const homeworkSchema = new mongoose.Schema(
  {
    // which user this homework belongs to
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // index makes lookups by user faster
    },
    // optional link to a course
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Homework title is required"],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    // optional time the assignment is due (stored as "HH:MM")
    dueTime: {
      type: String,
      trim: true,
      default: "",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    // hex color code for the card color
    color: {
      type: String,
      required: true,
      match: [/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex value"],
      default: "#3B82F6",
    },
    completed: {
      type: Boolean,
      default: false,
    },
    // used when importing from Canvas to avoid duplicate imports
    canvasId: {
      type: String,
      default: "",
    },
    // stores the original Canvas course name as a fallback display label
    canvasCourseName: {
      type: String,
      default: "",
    },
  },
  { timestamps: true } // automatically adds createdAt and updatedAt fields
);

module.exports = mongoose.model("Homework", homeworkSchema);
