// Course.js - defines what a course looks like in the database

const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    // which user owns this course
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
      maxlength: 80,
    },
    teacher: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    room: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
    // hex color used to color-code the course across the app
    color: {
      type: String,
      required: true,
      match: [/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex value"],
      default: "#3B82F6",
    },
    // weekly schedule slots - each entry is one day with a start and end time
    schedule: [
      {
        day: { type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
        startTime: { type: String, default: "" },
        endTime: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
