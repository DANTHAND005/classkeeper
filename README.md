# ClassKeeper

## Abstract

ClassKeeper is a student planner app built with React on the frontend, Express for the backend, and MongoDB as the database. The main idea was to give students one place to track all their homework, courses, and school events instead of juggling different apps or paper planners.

The centerpiece is a big monthly calendar similar to the one in Canvas, where homework and events show up directly on the days they are due. Each item gets a custom color so you can tell your classes apart at a glance. The dashboard also shows four quick stats at the top so you always know what is overdue, what is due today, what is coming up, and how much you have already finished.

Outside the calendar the app lets you fully manage courses, homework, and school events. You can add details like teacher name and room number to a course, link homework to a specific class, set priority levels and due times on assignments, and track things like tests or club meetings with location notes attached. Everything is saved in MongoDB so nothing disappears when you close the tab or restart the server. Login is handled with JWT tokens so each user only ever sees their own data. Both sides of the app check for missing or invalid input before saving anything and return a clear error message when something is wrong.

## Team Members

Daniel Than

## Demo Video

https://youtu.be/34cuyB8H7Yw

## Technologies Used

Frontend: React 19, React Router 7, Vite, Lucide React icons, custom CSS

Backend: Node.js, Express 5, MongoDB, Mongoose 9, JSON Web Tokens, bcryptjs, express-validator, morgan, nodemon

## Setup and Run Instructions

1. Install backend dependencies from the project root: `npm install`
2. Install frontend dependencies: `cd client` then `npm install`
3. Copy `.env.example` to `.env` in the project root and fill in the values (see Configuration Notes below)
4. Start the backend from the project root: `npm run dev`
5. Start the frontend from the client folder: `npm run dev`
6. Open the URL Vite shows, usually http://localhost:5173

## Configuration Notes

Create a `.env` file in the project root with these values:

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/classkeeper
JWT_SECRET=any-long-random-string
CLIENT_ORIGIN=http://localhost:5173
```

MONGODB_URI is  Atlas connection string. JWT_SECRET can be any long random string. CLIENT_ORIGIN should match the URL Vite uses for the frontend. Do not commit the .env file to version control.

## Test Credentials

Since each grader runs their own local MongoDB you will need to register an account on first launch. The app opens to the Register page for unauthenticated users. You can use any email and password you want, or register with these:

```
Email: demo@classkeeper.com
Password: Password123
```

## Completed MVPs

- User accounts with register, login, and logout all working
- JWT tokens protect every page so you have to be logged in to see anything
- The server blocks unauthorized requests directly, not just through the UI
- Every user's data is completely separate from everyone else's
- Everything saves to MongoDB and sticks around after page refresh or server restart
- Full CRUD for courses with custom color, teacher name, and room number
- Full CRUD for homework including a complete toggle, priority levels, due time, and course linking
- Full CRUD for events and activities with type, date, time, location, and notes
- Dashboard with a Canvas-style monthly calendar
- Homework and events show up as chips inside calendar cells on their due dates
- Month navigation arrows and a Today button to jump back to the current month
- Today's date gets a blue circle around the number
- Dashboard stats showing Due Today, Upcoming, Overdue, and Completed counts
- Both the frontend and backend catch missing or invalid input and show clear error messages
- Layout works on laptop and mobile screen sizes

## Stretch Features

- Canvas LMS import — paste a Canvas access token in Settings and it pulls in your real assignments automatically
- Weekly schedule timetable — if you add class times to a course they show up as blocks on a Monday to Friday grid on the Schedule page
- Pomodoro study timer — a 25/5/15 minute focus timer with a visual countdown ring
- Drag to reorder homework — drag assignments up and down to change the order
- Dark mode toggle in Settings that saves your preference
- Profile settings page to update your name, email, or password
- Filter buttons on the homework page to show All, Active, Completed, or Overdue
- Course filter pills so you can narrow the homework list down to one class
- Calendar cells show a +N more indicator when there are too many items to display

## REST API Documentation

Base URL: `http://localhost:5000/api`

Protected endpoints require this header: `Authorization: Bearer <token>`

The token is returned by register and login and stored in localStorage by the app.

### GET /health

Purpose: Check that the server is running. No authentication required.

Example response:
```json
{ "status": "ok", "app": "ClassKeeper" }
```

### POST /auth/register

Purpose: Create a new account and get a JWT back. No authentication required.

Request body:
```json
{ "name": "Demo Student", "email": "demo@classkeeper.com", "password": "Password123" }
```

Fields: name (required), email (required, valid email), password (required, min 6 characters)

Example response (201):
```json
{ "token": "eyJ...", "user": { "id": "68123abc", "name": "Demo Student", "email": "demo@classkeeper.com" } }
```

Error responses: 400 if fields are missing or invalid, 409 if email is already registered

### POST /auth/login

Purpose: Log in and get a JWT back. No authentication required.

Request body:
```json
{ "email": "demo@classkeeper.com", "password": "Password123" }
```

Example response (200): same shape as register

Error responses: 400 if fields are missing, 401 if email or password is wrong

### GET /auth/me

Purpose: Get the currently logged in user. Authentication required.

Example response (200):
```json
{ "user": { "id": "68123abc", "name": "Demo Student", "email": "demo@classkeeper.com" } }
```

Error responses: 401 if token is missing, invalid, or expired

### PATCH /auth/profile

Purpose: Update name, email, or password. Authentication required.

Request body (all fields optional):
```json
{ "name": "New Name", "email": "new@email.com", "currentPassword": "OldPass1", "newPassword": "NewPass2" }
```

currentPassword and newPassword are both required if you want to change the password.

Example response (200): returns a new token and the updated user object

Error responses: 400 if fields are invalid or current password is wrong, 401 if not authenticated

### GET /courses

Purpose: Get all courses for the logged in user sorted by name. Authentication required.

Example response (200):
```json
[{ "_id": "abc123", "name": "Algebra 2", "teacher": "Ms. Rivera", "room": "204", "color": "#3B82F6", "schedule": [] }]
```

Error responses: 401 if not authenticated

### POST /courses

Purpose: Create a new course. Authentication required.

Request body:
```json
{ "name": "Algebra 2", "teacher": "Ms. Rivera", "room": "204", "color": "#3B82F6" }
```

Fields: name (required), teacher (optional, max 80 chars), room (optional, max 40 chars), color (required, 6-digit hex)

Example response (201): the created course object

Error responses: 400 if fields are invalid, 401 if not authenticated

### GET /courses/:id

Purpose: Get one course by ID. Authentication required.

Example response (200): the course object

Error responses: 400 invalid ID, 401 not authenticated, 404 not found or belongs to another user

### PUT /courses/:id

Purpose: Update a course. Authentication required. Body is the same as POST /courses.

Example response (200): the updated course object

Error responses: 400 invalid ID or fields, 401 not authenticated, 404 not found

### DELETE /courses/:id

Purpose: Delete a course and remove its reference from all linked homework. Authentication required.

Example response (200):
```json
{ "message": "Course deleted" }
```

Error responses: 400 invalid ID, 401 not authenticated, 404 not found

### GET /homework

Purpose: Get all homework for the logged in user sorted by due date, with course populated. Authentication required.

Example response (200):
```json
[{ "_id": "def456", "title": "Math Worksheet", "dueDate": "2026-05-08T00:00:00.000Z", "dueTime": "23:59", "priority": "High", "color": "#EF4444", "completed": false, "course": { "_id": "abc123", "name": "Algebra 2", "color": "#3B82F6" } }]
```

Error responses: 401 not authenticated

### POST /homework

Purpose: Create a new homework entry. Authentication required.

Request body:
```json
{ "title": "Math Worksheet", "description": "Problems 1-20", "dueDate": "2026-05-08", "dueTime": "23:59", "priority": "High", "color": "#EF4444", "course": "abc123" }
```

Fields: title (required), description (optional, max 500 chars), dueDate (required, ISO 8601), dueTime (optional, HH:MM), priority (required, Low/Medium/High), color (required, hex), course (optional, must belong to this user)

Example response (201): the created homework object with course populated

Error responses: 400 invalid fields, 401 not authenticated, 403 if course belongs to another user

### GET /homework/:id

Purpose: Get one homework entry. Authentication required.

Example response (200): the homework object with course populated

Error responses: 400 invalid ID, 401 not authenticated, 404 not found

### PUT /homework/:id

Purpose: Update a homework entry. Authentication required. Body same as POST /homework.

Example response (200): the updated homework object

Error responses: 400 invalid ID or fields, 401 not authenticated, 403 course ownership, 404 not found

### PATCH /homework/:id/complete

Purpose: Mark homework complete or incomplete. Authentication required.

Request body:
```json
{ "completed": true }
```

Example response (200): the updated homework object

Error responses: 400 invalid ID or completed is not a boolean, 401 not authenticated, 404 not found

### DELETE /homework/:id

Purpose: Delete a homework entry. Authentication required.

Example response (200):
```json
{ "message": "Homework deleted" }
```

Error responses: 400 invalid ID, 401 not authenticated, 404 not found

### GET /events

Purpose: Get all events for the logged in user sorted by date and time. Authentication required.

Example response (200):
```json
[{ "_id": "ghi789", "title": "Science Club", "type": "Activity", "date": "2026-05-10T00:00:00.000Z", "time": "15:30", "location": "Room 101", "notes": "Bring notebook", "color": "#22C55E" }]
```

Error responses: 401 not authenticated

### POST /events

Purpose: Create a new event. Authentication required.

Request body:
```json
{ "title": "Science Club", "type": "Activity", "date": "2026-05-10", "time": "15:30", "location": "Room 101", "notes": "Bring notebook", "color": "#22C55E" }
```

Fields: title (required), type (required, Activity/Event/Test/Reminder), date (required, ISO 8601), time (optional, HH:MM), location (optional, max 120 chars), notes (optional, max 500 chars), color (required, hex)

Example response (201): the created event object

Error responses: 400 invalid fields, 401 not authenticated

### GET /events/:id

Purpose: Get one event. Authentication required.

Example response (200): the event object

Error responses: 400 invalid ID, 401 not authenticated, 404 not found

### PUT /events/:id

Purpose: Update an event. Authentication required. Body same as POST /events.

Example response (200): the updated event object

Error responses: 400 invalid ID or fields, 401 not authenticated, 404 not found

### DELETE /events/:id

Purpose: Delete an event. Authentication required.

Example response (200):
```json
{ "message": "Event deleted" }
```

Error responses: 400 invalid ID, 401 not authenticated, 404 not found

### POST /canvas/import

Purpose: Connect to a Canvas LMS account and pull in upcoming assignments as homework entries. Anything already imported gets skipped so you can run it multiple times. Overdue assignments get automatically set to High priority and red. Authentication required.

Request body:
```json
{ "canvasUrl": "https://yourschool.instructure.com", "canvasToken": "your-canvas-access-token" }
```

Fields: canvasUrl (required), canvasToken (required, generated in Canvas under Account > Settings > New Access Token)

Example response (200):
```json
{ "imported": 12, "skipped": 3 }
```

Error responses: 400 if URL or token is missing, 400 if Canvas can't be reached or the token is wrong, 401 if not authenticated with ClassKeeper
