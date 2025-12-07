# SafeTrail - System Architecture

## 🏗️ Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                     (http://localhost:3000)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Requests
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Client)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  index.html  │  styles.css  │  app.js                │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │  • Interactive Map (Leaflet.js)                      │  │
│  │  • Route Planning UI                                 │  │
│  │  • Incident Reporting Form                           │  │
│  │  • SOS Emergency Button                              │  │
│  │  • Real-time Updates (30s intervals)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API Calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js Server)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  server.js (Express.js)                              │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │  API Endpoints:                                      │  │
│  │  • GET  /api/geocode                                 │  │
│  │  • GET  /api/route/fastest                           │  │
│  │  • GET  /api/route/safest                            │  │
│  │  • GET  /api/safety/heatmap                          │  │
│  │  • GET  /api/incidents                               │  │
│  │  • POST /api/incidents                               │  │
│  │  • GET  /api/sos                                     │  │
│  │  • POST /api/sos                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  In-Memory Data Storage                              │  │
│  │  ─────────────────────────────────────────────────   │  │
│  │  • incidents[] - Reported incidents                  │  │
│  │  • sosAlerts[] - Active SOS alerts                   │  │
│  │  • highRiskZones[] - Safety heatmap data            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ External API Calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  OpenStreetMap (OSM)                                 │  │
│  │  • Map tiles and geographic data                     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  OSRM (Open Source Routing Machine)                  │  │
│  │  • Route calculation                                 │  │
│  │  • Distance and duration estimates                   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Nominatim                                           │  │
│  │  • Geocoding (address → coordinates)                 │  │
│  │  • Reverse geocoding (coordinates → address)         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### 1. Route Planning Flow

```
User Input (From/To)
        │
        ▼
Frontend Geocoding
        │
        ▼
Backend API Request
        │
        ▼
OSRM Route Calculation
        │
        ▼
AI Safety Analysis
        │
        ▼
Route Display on Map
```

### 2. Incident Reporting Flow

```
User Reports Incident
        │
        ▼
Capture Map Coordinates
        │
        ▼
POST to Backend
        │
        ▼
Store in Memory
        │
        ▼
Broadcast to All Clients
        │
        ▼
Update Map Markers
```

### 3. SOS Emergency Flow

```
User Clicks SOS Button
        │
        ▼
Get Current Location
        │
        ▼
POST to Backend
        │
        ▼
Create Alert Record
        │
        ▼
Notify Nearby Users
        │
        ▼
Display Pulsing Marker
```

---

## 🔄 Component Interaction

### Frontend Components

```
┌─────────────────────────────────────────────────────────┐
│                    Main Application                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Sidebar    │  │  Map Canvas  │  │  Route Info  │ │
│  │              │  │              │  │              │ │
│  │ • Search     │  │ • Leaflet.js │  │ • Distance   │ │
│  │ • Report     │  │ • Markers    │  │ • Duration   │ │
│  │ • SOS        │  │ • Routes     │  │ • Safety     │ │
│  │ • Legend     │  │ • Heatmap    │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Backend Components

```
┌─────────────────────────────────────────────────────────┐
│                    Express Server                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Routes     │  │  Controllers │  │    Data      │ │
│  │              │  │              │  │              │ │
│  │ • /geocode   │  │ • Geocoding  │  │ • Incidents  │ │
│  │ • /route     │  │ • Routing    │  │ • SOS        │ │
│  │ • /incidents │  │ • Safety     │  │ • Zones      │ │
│  │ • /sos       │  │ • Emergency  │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Layer 1: CORS Protection                        │  │
│  │  • Cross-origin resource sharing enabled         │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Layer 2: Input Validation                       │  │
│  │  • Query parameter sanitization                  │  │
│  │  • Request body validation                       │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Layer 3: Anonymous Data                         │  │
│  │  • No user authentication required               │  │
│  │  • No personal data stored                       │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Layer 4: Temporary Storage                      │  │
│  │  • In-memory data (not persistent)               │  │
│  │  • Auto-expiring SOS alerts                      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📡 API Communication

### Request/Response Pattern

```
Frontend                    Backend                  External API
   │                          │                          │
   │──── GET /api/geocode ───>│                          │
   │                          │──── Nominatim API ──────>│
   │                          │<──── Coordinates ────────│
   │<──── JSON Response ──────│                          │
   │                          │                          │
   │─ GET /api/route/safest ─>│                          │
   │                          │──── OSRM API ───────────>│
   │                          │<──── Route Data ─────────│
   │                          │                          │
   │                          │ [AI Safety Analysis]     │
   │                          │                          │
   │<──── Safest Route ───────│                          │
```

---

## 💾 Data Models

### Incident Object
```javascript
{
  id: Number,
  type: String,        // 'theft', 'harassment', 'accident', 'other'
  lat: Number,
  lng: Number,
  description: String,
  timestamp: Number
}
```

### SOS Alert Object
```javascript
{
  id: Number,
  lat: Number,
  lng: Number,
  userId: String,
  timestamp: Number
}
```

### High-Risk Zone Object
```javascript
{
  lat: Number,
  lng: Number,
  radius: Number,      // in meters
  riskLevel: String    // 'high', 'medium', 'low'
}
```

### Route Object
```javascript
{
  geometry: {
    coordinates: [[lng, lat], ...]
  },
  distance: Number,    // in meters
  duration: Number,    // in seconds
  riskScore: Number    // calculated by AI
}
```

---

## 🔄 State Management

### Frontend State
```
┌─────────────────────────────────────────┐
│  Global State Variables                 │
│  • map (Leaflet instance)               │
│  • currentLocationMarker                │
│  • routeLayer                           │
│  • userLocation                         │
│  • heatmapCircles[]                     │
│  • incidentMarkers[]                    │
│  • sosMarkers[]                         │
└─────────────────────────────────────────┘
```

### Backend State
```
┌─────────────────────────────────────────┐
│  In-Memory Storage                      │
│  • incidents[] (persistent)             │
│  • sosAlerts[] (time-limited)           │
│  • highRiskZones[] (static)             │
└─────────────────────────────────────────┘
```

---

## 🚀 Deployment Architecture

### Development
```
Local Machine
  ├── Node.js Server (Port 3000)
  ├── Static Files (public/)
  └── In-Memory Data
```

### Production (Recommended)
```
Cloud Platform (Heroku/AWS/Vercel)
  ├── Node.js Server
  ├── Static CDN (Frontend)
  ├── Database (MongoDB/PostgreSQL)
  └── Load Balancer
```

---

## 📈 Scalability Considerations

### Current Architecture
- Single server instance
- In-memory storage
- Suitable for: 100-1000 concurrent users

### Future Scaling
```
┌─────────────────────────────────────────────────────────┐
│  Load Balancer                                          │
└─────────────────────────────────────────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│Server 1│ │Server 2│ │Server 3│
└────────┘ └────────┘ └────────┘
    │         │         │
    └─────────┼─────────┘
              ▼
    ┌─────────────────┐
    │    Database     │
    │  (MongoDB/SQL)  │
    └─────────────────┘
```

---

## 🔧 Technology Stack Details

### Frontend Stack
```
HTML5
  └── Semantic markup
CSS3
  └── Flexbox, Grid, Animations
JavaScript (ES6+)
  ├── Async/Await
  ├── Fetch API
  └── Event Listeners
Leaflet.js
  └── Map rendering & interaction
```

### Backend Stack
```
Node.js
  └── JavaScript runtime
Express.js
  ├── Routing
  ├── Middleware
  └── Static file serving
Axios
  └── HTTP client
CORS
  └── Cross-origin support
```

---

## 🎯 Performance Optimization

### Frontend
- Lazy loading of map tiles
- Debounced search input
- Efficient marker rendering
- Cached route calculations

### Backend
- Async/await for non-blocking I/O
- Efficient data structures
- Minimal API calls
- Response caching potential

---

**This architecture provides a solid foundation for SafeTrail's current needs and future growth!** 🛡️
