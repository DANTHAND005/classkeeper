// validate.js - middleware that checks if the request body passed all validation rules
// used after express-validator checks in route files
// if there are any errors it stops the request and sends them back to the frontend

const { validationResult } = require("express-validator");

function validate(req, res, next) {
  // collect all errors that the validators found
  const errors = validationResult(req);

  // if there are errors, send a 400 with details so the frontend can show them
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Please fix the highlighted fields.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  // no errors, move on to the actual route handler
  next();
}

module.exports = validate;
