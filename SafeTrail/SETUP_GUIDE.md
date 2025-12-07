# SafeTrail - Complete Setup Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies (Already Done!)
The project dependencies are already installed. You're ready to go!

### Step 2: Start the Server
Double-click `start.bat` or run:
```bash
npm start
```

### Step 3: Open in Browser
Navigate to: **http://localhost:3000**

---

## 📋 Project Structure

```
SafeTrail/
├── public/              # Frontend files
│   ├── index.html      # Main HTML page
│   ├── styles.css      # Styling
│   └── app.js          # Frontend JavaScript
├── server.js           # Backend API server
├── package.json        # Dependencies
├── .env                # Environment variables
├── start.bat           # Windows startup script
└── README.md           # Documentation
```

---

## 🎯 Features Overview

### 1. Safety Heatmap
- Red circles indicate high-risk zones
- Automatically loaded on map initialization
- Helps users avoid dangerous areas

### 2. Route Planning
- **Fastest Route**: Optimized for speed using OSRM
- **Safest Route**: AI-analyzed to avoid high-risk zones
- Real-time geocoding for address search

### 3. Incident Reporting
- Report theft, harassment, accidents
- Incidents appear as orange markers
- Community-driven safety data

### 4. SOS Emergency
- One-click emergency broadcast
- Alerts nearby users
- Shows as pulsing red markers

---

## 🔧 How to Use

### Planning a Route
1. Enter your starting location (or click "Use Current Location")
2. Enter your destination
3. Click "Fastest Route" or "Safest Route"
4. View route information in the top-right panel

### Reporting an Incident
1. Pan the map to the incident location
2. Select incident type from dropdown
3. Add optional description
4. Click "Report at Map Center"

### Emergency SOS
1. Click the red "SOS EMERGENCY" button
2. Confirm the alert
3. Your location is broadcast to nearby users

---

## 🌐 API Endpoints

### Geocoding
- `GET /api/geocode?query=address` - Convert address to coordinates
- `GET /api/reverse-geocode?lat=X&lon=Y` - Get address from coordinates

### Routing
- `GET /api/route/fastest?start=lng,lat&end=lng,lat` - Fastest route
- `GET /api/route/safest?start=lng,lat&end=lng,lat` - Safest route

### Safety Data
- `GET /api/safety/heatmap` - Get high-risk zones
- `GET /api/incidents` - Get all reported incidents
- `POST /api/incidents` - Report new incident

### Emergency
- `GET /api/sos` - Get active SOS alerts
- `POST /api/sos` - Send SOS emergency broadcast

---

## 🛠️ Development

### Run in Development Mode
```bash
npm run dev
```
This uses nodemon for auto-reload on file changes.

### Environment Variables
Edit `.env` file:
```
PORT=3000
NODE_ENV=development
```

---

## 🔒 Security Features

1. **Risk Analysis**: Routes are analyzed for proximity to high-risk zones
2. **Community Reports**: Real-time incident data from users
3. **Emergency System**: Quick SOS broadcast capability
4. **Location Privacy**: User locations are not permanently stored

---

## 📱 Browser Compatibility

- Chrome (Recommended)
- Firefox
- Edge
- Safari

**Note**: Location services must be enabled for "Use Current Location" feature.

---

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is available
- Run: `npm install` to reinstall dependencies

### Map not loading
- Check internet connection (requires OpenStreetMap access)
- Clear browser cache

### Routes not appearing
- Verify start and end locations are valid
- Check browser console for errors

### Location not detected
- Enable location services in browser
- Grant location permission when prompted

---

## 🚀 Next Steps

### Potential Enhancements
1. User authentication system
2. Real-time chat for nearby users
3. Integration with local police APIs
4. Machine learning for better risk prediction
5. Mobile app (React Native/Flutter)
6. Push notifications for nearby incidents
7. Historical crime data integration
8. Weather and lighting conditions

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Ensure all dependencies are installed

---

## 📄 License

MIT License - Feel free to use and modify!

---

**Happy Safe Travels! 🛡️**
