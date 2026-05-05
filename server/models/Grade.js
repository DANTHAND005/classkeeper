const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Grade name is required"],
      trim: true,
      maxlength: 120,
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: 0,
    },
    outOf: {
      type: Number,
      required: [true, "Max score is required"],
      min: 1,
      default: 100,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Grade", gradeSchema);
