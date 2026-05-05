// auth.js - middleware that protects routes from unauthenticated users
// runs before any route that requires a login
// checks the Authorization header for a valid JWT token

const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protect(req, res, next) {
  try {
    // grab the authorization header and strip out "Bearer " to get just the token
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    // no token means the user isnt logged in, block the request
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // verify the token using our secret key and decode the user id from it
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");

    // look up the user in the database, dont include the password field
    const user = await User.findById(decoded.id).select("-password");

    // if the account was deleted after the token was issued, block them
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // attach the user object to the request so any route can use it
    req.user = user;
    next();
  } catch (_error) {
    // token was tampered with or expired
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = protect;
