# SafeTrail - Your Trusted Travel Companion 🛡️

SafeTrail is an AI-driven navigation platform that prioritizes your safety over speed. Navigate unfamiliar areas with confidence using real-time safety data, community reports, and intelligent routing.

## Features

✅ **Intelligent Safety Mapping**
- Visual safety heatmap showing high-risk zones
- Real-time location tracking
- Auto-zoom to show complete journey

✅ **AI-Powered Navigation**
- Fastest Route (optimized for speed)
- Safest Route (AI-analyzed for security)
- Smart geocoding search

✅ **Community & Emergency Response**
- Crowdsourced incident reporting (Theft, Harassment, etc.)
- SOS Emergency broadcast to nearby users
- Real-time incident visualization

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the backend server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

1. **Plan Your Route**: Enter start and destination locations
2. **Choose Route Type**: Select fastest or safest route
3. **Report Incidents**: Help the community by reporting safety concerns
4. **Emergency SOS**: Broadcast your location in emergencies

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript, Leaflet.js
- **Backend**: Node.js, Express
- **Maps**: OpenStreetMap, OSRM
- **APIs**: Nominatim (Geocoding), OSRM (Routing)

## API Endpoints

- `GET /api/geocode` - Convert address to coordinates
- `GET /api/route/fastest` - Get fastest route
- `GET /api/route/safest` - Get AI-analyzed safest route
- `GET /api/safety/heatmap` - Get safety zone data
- `POST /api/incidents` - Report new incident
- `GET /api/incidents` - Get all incidents
- `POST /api/sos` - Send SOS emergency alert
- `GET /api/sos` - Get active SOS alerts

## Development

Run in development mode with auto-reload:
```bash
npm run dev
```

## License

MIT License
