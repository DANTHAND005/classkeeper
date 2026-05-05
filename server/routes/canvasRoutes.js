// canvasRoutes.js - imports assignments from Canvas LMS into ClassKeeper
// POST /import - fetches courses and assignments from the Canvas API
//                skips anything already imported (checks canvasId to avoid duplicates)
//                tries to match Canvas courses to ClassKeeper courses by name
//                marks overdue assignments as red and high priority automatically

const express = require("express");
const https = require("https");
const http = require("http");
const Homework = require("../models/Homework");
const Course = require("../models/Course");
const protect = require("../middleware/auth");
console.log("✓ canvasRoutes loaded");

const router = express.Router();

// all routes require login
router.use(protect);

// helper to make HTTP requests to the Canvas API without needing extra packages
// returns { status, body } so we can check the status code before using the data
function canvasFetch(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "ClassKeeper/1.0" },
    };
    lib.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: null }); }
      });
    }).on("error", reject);
  });
}

// tries to find a ClassKeeper course that matches a Canvas course name
// checks for exact match first, then checks if one name contains the other
function matchCourse(canvasCourseName, userCourses) {
  if (!canvasCourseName || !userCourses.length) return null;
  const needle = canvasCourseName.toLowerCase();

  // exact match
  let match = userCourses.find((c) => c.name.toLowerCase() === needle);
  if (match) return match;

  // partial match - one name contains the other
  match = userCourses.find((c) => {
    const hay = c.name.toLowerCase();
    return needle.includes(hay) || hay.includes(needle);
  });
  return match || null;
}

// POST /import - main import handler
router.post("/import", async (req, res, next) => {
  try {
    const { canvasUrl, canvasToken } = req.body;
    if (!canvasUrl || !canvasToken) {
      return res.status(400).json({ message: "Canvas URL and token are required." });
    }

    // strip trailing slashes from the URL
    const base = canvasUrl.replace(/\/+$/, "");

    // fetch the list of active courses from Canvas
    let coursesResult;
    try {
      coursesResult = await canvasFetch(
        `${base}/api/v1/courses?enrollment_state=active&per_page=50`,
        canvasToken
      );
    } catch {
      return res.status(400).json({ message: "Could not reach your Canvas. Check the URL and try again." });
    }

    if (coursesResult.status === 401) {
      return res.status(400).json({ message: "Invalid Canvas token. Generate a new one in Canvas → Account → Settings." });
    }
    if (coursesResult.status !== 200 || !Array.isArray(coursesResult.body)) {
      return res.status(400).json({ message: "Canvas returned an error. Double-check your URL." });
    }

    // load the users existing ClassKeeper courses so we can try to match them
    const userCourses = await Course.find({ user: req.user._id });

    // only import assignments from the last 30 days or in the future
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    // today at midnight - used to decide if something is overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let imported = 0;
    let skipped = 0;

    // loop through each Canvas course
    for (const canvasCourse of coursesResult.body) {
      if (!canvasCourse.id || canvasCourse.access_restricted_by_date) continue;

      // try to find a matching ClassKeeper course for this Canvas course
      const matchedCourse = matchCourse(canvasCourse.name, userCourses);

      // fetch assignments for this course
      let assignResult;
      try {
        assignResult = await canvasFetch(
          `${base}/api/v1/courses/${canvasCourse.id}/assignments?per_page=100&order_by=due_at`,
          canvasToken
        );
      } catch { continue; }

      if (assignResult.status !== 200 || !Array.isArray(assignResult.body)) continue;

      // loop through each assignment
      for (const a of assignResult.body) {
        if (!a.due_at) continue;
        if (new Date(a.due_at) < cutoff) continue;

        // skip things that arent real graded assignments (like ungraded info posts)
        const types = a.submission_types || [];
        if (types.includes("not_graded") || types.includes("none") || (types.length === 1 && types[0] === "")) continue;

        // skip if we already imported this one before
        const canvasId = `canvas_${a.id}`;
        const exists = await Homework.exists({ user: req.user._id, canvasId });
        if (exists) { skipped++; continue; }

        // strip HTML tags and decode HTML entities from the description
        const rawDesc = a.description || "";
        const description = rawDesc
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500);

        // convert Canvas UTC time to local date so the date doesnt shift by one day
        const dueDt = new Date(a.due_at);
        const localDate = `${dueDt.getFullYear()}-${String(dueDt.getMonth() + 1).padStart(2, "0")}-${String(dueDt.getDate()).padStart(2, "0")}`;
        const isOverdue = new Date(localDate) < today;

        await Homework.create({
          user: req.user._id,
          title: a.name,
          description,
          dueDate: new Date(localDate),
          dueTime: dueDt.toTimeString().slice(0, 5),
          // overdue assignments get red + high priority so they stand out
          priority: isOverdue ? "High" : "Medium",
          color: isOverdue ? "#EF4444" : (matchedCourse ? matchedCourse.color : "#3B82F6"),
          course: matchedCourse ? matchedCourse._id : null,
          canvasId,
          canvasCourseName: canvasCourse.name || "",
        });
        imported++;
      }
    }

    res.json({ imported, skipped });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
