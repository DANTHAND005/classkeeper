// index.js - main entry point for the ClassKeeper backend server
// sets up Express, connects to MongoDB, and registers all the routes

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const dns = require("dns");
require("dotenv").config();

// import all the route files
const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const homeworkRoutes = require("./routes/homeworkRoutes");
const eventRoutes = require("./routes/eventRoutes");
const gradeRoutes = require("./routes/gradeRoutes");
const canvasRoutes = require("./routes/canvasRoutes");

const app = express();
const port = process.env.PORT || 5000;

// use google and cloudflare DNS servers to avoid network issues
dns.setServers((process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1").split(","));

// allow requests from the frontend dev server
const clientOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

// middleware - runs on every request
app.use(cors({ origin: clientOrigins })); // allow frontend to talk to backend
app.use(express.json()); // parse JSON request bodies
app.use(morgan("dev")); // log every request to the terminal

// simple health check route to confirm the server is running
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "ClassKeeper" });
});

// connect each feature to its route file
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/homework", homeworkRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/canvas", canvasRoutes);

// catch requests that dont match any route above
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// catch any errors thrown inside route handlers
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

// start the server - connect to MongoDB first then listen for requests
async function start() {
  if (!process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET is not set. Using insecure default. Set JWT_SECRET in your .env file.");
  }

  try {
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/classkeeper";
    await mongoose.connect(uri);
    app.listen(port, () => {
      console.log(`ClassKeeper API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start ClassKeeper API", error);
    process.exit(1);
  }
}

start();
