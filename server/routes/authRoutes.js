// authRoutes.js - handles user registration, login, and profile updates
// POST /register - create a new account
// POST /login    - log in and get a token
// GET  /me       - get the current logged in user
// PATCH /profile - update name, email, or password

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const User = require("../models/User");
const protect = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// creates a JWT token that expires in 7 days
function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET || "dev-secret", {
    expiresIn: "7d",
  });
}

// strips the password before sending user data to the frontend
function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

// POST /register - create a new account
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate,
  async (req, res, next) => {
    try {
      // make sure nobody else has the same email
      const existing = await User.findOne({ email: req.body.email });
      if (existing) {
        return res.status(409).json({ message: "An account with that email already exists" });
      }

      // hash the password before storing it (never store plain text passwords)
      const hashedPassword = await bcrypt.hash(req.body.password, 12);
      const user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
      });

      // send back a token so the user is instantly logged in
      res.status(201).json({ token: signToken(user), user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  }
);

// POST /login - log in with email and password
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findOne({ email: req.body.email });

      // compare the entered password against the stored hash
      const passwordMatches = user ? await bcrypt.compare(req.body.password, user.password) : false;

      // give a vague error so we dont tell hackers whether the email exists
      if (!user || !passwordMatches) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      res.json({ token: signToken(user), user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  }
);

// GET /me - returns the currently logged in user (used to restore session)
router.get("/me", protect, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// PATCH /profile - update name, email, or password
router.patch(
  "/profile",
  protect,
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("email").optional().isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("newPassword").optional().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { name, email, currentPassword, newPassword } = req.body;

      // update name if provided
      if (name) user.name = name;

      // update email only if it changed and isnt already taken
      if (email && email !== user.email) {
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ message: "An account with that email already exists" });
        user.email = email;
      }

      // changing password requires the current password to be correct
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to change your password" });
        }
        const matches = await bcrypt.compare(currentPassword, user.password);
        if (!matches) return res.status(401).json({ message: "Current password is incorrect" });
        user.password = await bcrypt.hash(newPassword, 12);
      }

      await user.save();

      // send back a fresh token and updated user info
      res.json({ token: signToken(user), user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
