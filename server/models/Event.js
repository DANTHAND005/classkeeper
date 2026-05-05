const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      maxlength: 120,
    },
    type: {
      type: String,
      enum: ["Activity", "Event", "Test", "Reminder"],
      default: "Event",
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    time: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    color: {
      type: String,
      required: true,
      match: [/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex value"],
      default: "#22C55E",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
