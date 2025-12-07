# 🚀 How to Run SafeTrail

## Quick Start (3 Steps)

### Step 1: Install Dependencies
Open a terminal in the SafeTrail folder and run:
```bash
npm install
```

This will install all required packages (Express, CORS, Axios, etc.)

### Step 2: Start the Server
Run one of these commands:

**Option A - Using npm:**
```bash
npm start
```

**Option B - Using the batch file (Windows):**
```bash
start.bat
```

**Option C - Development mode (auto-reload on changes):**
```bash
npm run dev
```

### Step 3: Open in Browser
Once the server starts, you'll see:
```
🛡️  SafeTrail Backend running on http://localhost:3000
```

Open your web browser and navigate to:
```
http://localhost:3000
```

---

## What You'll See

1. **Login/Signup Screen** - Create an account or login
2. **Main Dashboard** - Interactive map with all safety features
3. **Sidebar** - Route planning, alerts, safe havens, and more

---

## Features to Try

✅ **Plan a Route**
- Enter start and destination
- Click "Fastest" or "Safest" route
- See AI-powered safety analysis

✅ **Safety Feed**
- Scroll through recent incidents and alerts
- Click items to view on map

✅ **AI Chat Companion**
- Click the chat button (bottom right)
- Ask safety questions

✅ **Report Incidents**
- Use privacy controls (Anonymous mode, Location blur)
- Help the community stay safe

✅ **Emergency Features**
- SOS button for emergencies
- Voice SOS: Say "Help SafeTrail"

✅ **Crowd Density**
- Toggle crowd density layer on map
- See high/medium/low density zones

✅ **Incident Timeline**
- View incident patterns over time
- Switch between 24H, 7D, 30D views

---

## Troubleshooting

**Port 3000 already in use?**
- Change PORT in `server.js` or set environment variable:
  ```bash
  set PORT=3001
  npm start
  ```

**Dependencies not installing?**
- Make sure you have Node.js installed (v14+)
- Try: `npm cache clean --force` then `npm install`

**Map not loading?**
- Check browser console for errors
- Ensure internet connection (uses OpenStreetMap)

**API errors?**
- Make sure server is running on port 3000
- Check that `http://localhost:3000/api/` endpoints are accessible

---

## Development

To run with auto-reload (recommended for development):
```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when you make changes.

---

## Need Help?

- Check the browser console (F12) for errors
- Verify server is running: `http://localhost:3000/api/incidents`
- All API endpoints should return JSON data

Enjoy using SafeTrail! 🛡️✨

