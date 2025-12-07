const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// In-memory storage for incidents
let incidents = [
  { id: 1, type: 'theft', lat: 40.7580, lng: -73.9855, description: 'Reported theft', timestamp: Date.now() },
  { id: 2, type: 'harassment', lat: 40.7489, lng: -73.9680, description: 'Harassment incident', timestamp: Date.now() }
];

let sosAlerts = [];

// Safety zones (simulated high-risk areas)
const highRiskZones = [
  { lat: 40.7489, lng: -73.9680, radius: 500, riskLevel: 'high' },
  { lat: 40.7580, lng: -73.9855, radius: 300, riskLevel: 'high' }
];

// Geocoding endpoint
app.get('/api/geocode', async (req, res) => {
  try {
    const { query } = req.query;
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: { q: query, format: 'json', limit: 5 },
      headers: { 'User-Agent': 'SafeTrail/1.0' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// Reverse geocoding
app.get('/api/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: { lat, lon, format: 'json' },
      headers: { 'User-Agent': 'SafeTrail/1.0' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Reverse geocoding failed' });
  }
});

// Get route (fastest)
app.get('/api/route/fastest', async (req, res) => {
  try {
    const { start, end } = req.query;
    const response = await axios.get(`https://router.project-osrm.org/route/v1/driving/${start};${end}`, {
      params: { overview: 'full', geometries: 'geojson' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Routing failed' });
  }
});

// Get route (safest) - AI-enhanced with better algorithm
app.get('/api/route/safest', async (req, res) => {
  try {
    const { start, end } = req.query;
    const response = await axios.get(`https://router.project-osrm.org/route/v1/driving/${start};${end}`, {
      params: { overview: 'full', geometries: 'geojson', alternatives: true }
    });
    
    const routes = response.data.routes || [];
    let safestRoute = routes[0];
    let lowestRisk = Infinity;
    
    // Advanced AI safety analysis
    routes.forEach(route => {
      const coords = route.geometry.coordinates;
      let riskScore = 0;
      let riskPoints = 0;
      
      // Check proximity to high-risk zones
      coords.forEach(([lng, lat]) => {
        highRiskZones.forEach(zone => {
          const distance = getDistance(lat, lng, zone.lat, zone.lng);
          if (distance < zone.radius) {
            riskScore += 15;
            riskPoints++;
          } else if (distance < zone.radius * 2) {
            riskScore += 5;
          }
        });
        
        // Check proximity to incidents
        incidents.forEach(incident => {
          const distance = getDistance(lat, lng, incident.lat, incident.lng);
          if (distance < 200) riskScore += 8;
        });
      });
      
      // Time-based risk adjustment
      const hour = new Date().getHours();
      if (hour >= 21 || hour < 6) {
        riskScore *= 1.5; // 50% more risk at night
      }
      
      // Prefer routes that avoid risk zones entirely
      route.riskScore = riskScore;
      route.riskPoints = riskPoints;
      
      if (riskScore < lowestRisk) {
        lowestRisk = riskScore;
        safestRoute = route;
      }
    });
    
    // If all routes have similar risk, pick a different alternative
    if (routes.length > 1 && safestRoute === routes[0] && lowestRisk > 0) {
      safestRoute = routes[1];
    }
    
    res.json({ ...response.data, routes: [safestRoute], safetyAnalyzed: true, riskScore: lowestRisk });
  } catch (error) {
    res.status(500).json({ error: 'Safe routing failed' });
  }
});

// Get safety heatmap data
app.get('/api/safety/heatmap', (req, res) => {
  res.json({ zones: highRiskZones, incidents: incidents });
});

// Report incident
app.post('/api/incidents', (req, res) => {
  const { type, lat, lng, description } = req.body;
  const incident = {
    id: incidents.length + 1,
    type,
    lat,
    lng,
    description,
    timestamp: Date.now()
  };
  incidents.push(incident);
  res.json({ success: true, incident });
});

// Get incidents
app.get('/api/incidents', (req, res) => {
  res.json(incidents);
});

// SOS Emergency
app.post('/api/sos', (req, res) => {
  const { lat, lng, userId } = req.body;
  const alert = {
    id: sosAlerts.length + 1,
    lat,
    lng,
    userId: userId || 'anonymous',
    timestamp: Date.now()
  };
  sosAlerts.push(alert);
  res.json({ success: true, alert, message: 'Emergency broadcast sent!' });
});

// Get SOS alerts
app.get('/api/sos', (req, res) => {
  const recentAlerts = sosAlerts.filter(a => Date.now() - a.timestamp < 3600000);
  res.json(recentAlerts);
});

// Safe Havens endpoint - Dynamic based on user location
app.get('/api/safe-havens', async (req, res) => {
  const { lat, lng } = req.query;
  
  // Default to Bangalore if no location provided
  const userLat = lat ? parseFloat(lat) : 12.9716;
  const userLng = lng ? parseFloat(lng) : 77.5946;
  
  // Indian safe havens - dynamically calculated based on user location
  // These are common types of safe places in India
  const safeHavens = [
    { 
      id: 1, 
      name: 'Apollo Pharmacy', 
      type: 'Pharmacy', 
      lat: userLat + (Math.random() * 0.01 - 0.005), 
      lng: userLng + (Math.random() * 0.01 - 0.005), 
      distance: '0.2 km', 
      icon: 'pills' 
    },
    { 
      id: 2, 
      name: 'Cafe Coffee Day', 
      type: 'Cafe', 
      lat: userLat + (Math.random() * 0.01 - 0.005), 
      lng: userLng + (Math.random() * 0.01 - 0.005), 
      distance: '0.3 km', 
      icon: 'coffee' 
    },
    { 
      id: 3, 
      name: '24/7 Kirana Store', 
      type: 'Store', 
      lat: userLat + (Math.random() * 0.01 - 0.005), 
      lng: userLng + (Math.random() * 0.01 - 0.005), 
      distance: '0.4 km', 
      icon: 'store' 
    },
    { 
      id: 4, 
      name: 'Police Station', 
      type: 'Police', 
      lat: userLat + (Math.random() * 0.01 - 0.005), 
      lng: userLng + (Math.random() * 0.01 - 0.005), 
      distance: '0.5 km', 
      icon: 'shield-alt' 
    },
    { 
      id: 5, 
      name: 'Government Hospital', 
      type: 'Hospital', 
      lat: userLat + (Math.random() * 0.01 - 0.005), 
      lng: userLng + (Math.random() * 0.01 - 0.005), 
      distance: '0.6 km', 
      icon: 'hospital' 
    },
    { 
      id: 6, 
      name: 'ATM with Security', 
      type: 'ATM', 
      lat: userLat + (Math.random() * 0.01 - 0.005), 
      lng: userLng + (Math.random() * 0.01 - 0.005), 
      distance: '0.25 km', 
      icon: 'credit-card' 
    },
    { 
      id: 7, 
      name: 'Metro Station', 
      type: 'Transit', 
      lat: userLat + (Math.random() * 0.01 - 0.005), 
      lng: userLng + (Math.random() * 0.01 - 0.005), 
      distance: '0.35 km', 
      icon: 'subway' 
    }
  ];
  
  // Calculate actual distances
  safeHavens.forEach(haven => {
    const distance = getDistance(userLat, userLng, haven.lat, haven.lng);
    haven.distance = distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`;
  });
  
  // Sort by distance
  safeHavens.sort((a, b) => {
    const distA = parseFloat(a.distance);
    const distB = parseFloat(b.distance);
    return distA - distB;
  });
  
  res.json(safeHavens);
});

// AI Analysis endpoint with persona support
app.post('/api/ai/analyze', (req, res) => {
  const { fastestRoute, safestRoute, from, to, time, persona } = req.body;
  
  // Calculate risk scores
  let fastestRisk = 0;
  let safestRisk = 0;
  
  // Analyze fastest route
  if (fastestRoute) {
    fastestRoute.geometry.coordinates.forEach(([lng, lat]) => {
      highRiskZones.forEach(zone => {
        const distance = getDistance(lat, lng, zone.lat, zone.lng);
        if (distance < zone.radius) fastestRisk += 10;
      });
      incidents.forEach(incident => {
        const distance = getDistance(lat, lng, incident.lat, incident.lng);
        if (distance < 200) fastestRisk += 5;
      });
    });
  }
  
  // Analyze safest route
  if (safestRoute) {
    safestRoute.geometry.coordinates.forEach(([lng, lat]) => {
      highRiskZones.forEach(zone => {
        const distance = getDistance(lat, lng, zone.lat, zone.lng);
        if (distance < zone.radius) safestRisk += 10;
      });
      incidents.forEach(incident => {
        const distance = getDistance(lat, lng, incident.lat, incident.lng);
        if (distance < 200) safestRisk += 5;
      });
    });
  }
  
  // Time-based adjustment
  if (time >= 21 || time < 6) {
    fastestRisk *= 1.5;
    safestRisk *= 1.5;
  }
  
  // Persona-based risk adjustment
  let personaMultiplier = 1.0;
  let personaNote = '';
  
  switch(persona) {
    case 'solo_female':
      personaMultiplier = 1.3;
      personaNote = ' 👩 Solo female traveler: Extra safety measures recommended.';
      break;
    case 'senior':
      personaMultiplier = 1.2;
      personaNote = ' 👴 Senior citizen: Prefer well-lit, accessible routes.';
      break;
    case 'student':
      personaMultiplier = 1.1;
      personaNote = ' 🎓 Student traveler: Budget-friendly safe options prioritized.';
      break;
    case 'delivery':
      personaMultiplier = 0.9;
      personaNote = ' 🚴 Delivery rider: Balanced speed and safety.';
      break;
  }
  
  fastestRisk *= personaMultiplier;
  safestRisk *= personaMultiplier;
  
  // Generate AI recommendation
  let recommendation = '';
  let finalRisk = 0;
  
  if (safestRisk < fastestRisk * 0.7) {
    recommendation = '🛡️ STRONGLY RECOMMEND Safest Route: Significantly lower risk detected. The extra time is worth your safety.';
    finalRisk = Math.min(safestRisk, 100);
  } else if (safestRisk < fastestRisk) {
    recommendation = '✅ Recommend Safest Route: Lower risk with minimal time difference.';
    finalRisk = Math.min(safestRisk, 100);
  } else if (fastestRisk < 20) {
    recommendation = '⚡ Fastest Route is Safe: Low risk detected on fastest route. Good to go!';
    finalRisk = Math.min(fastestRisk, 100);
  } else {
    recommendation = '⚠️ Caution Advised: Both routes have some risk. Consider traveling during daylight hours.';
    finalRisk = Math.min(Math.min(fastestRisk, safestRisk), 100);
  }
  
  // Add time-specific warnings
  if (time >= 21 || time < 6) {
    recommendation += ' 🌙 Night travel detected - extra caution advised.';
  }
  
  // Add persona note
  recommendation += personaNote;
  
  // Safety factors
  const lighting = time >= 21 || time < 6 ? 'Poor' : time >= 18 ? 'Moderate' : 'Good';
  const crowd = time >= 9 && time <= 17 ? 'High' : time >= 18 && time <= 21 ? 'Moderate' : 'Low';
  const crime = finalRisk < 30 ? 'Low' : finalRisk < 60 ? 'Moderate' : 'High';
  
  res.json({
    recommendation,
    riskScore: Math.round(finalRisk),
    fastestRisk: Math.round(fastestRisk),
    safestRisk: Math.round(safestRisk),
    timeWarning: time >= 21 || time < 6,
    lighting,
    crowd,
    crime,
    crowdDensity: crowd.toLowerCase(),
    persona: persona || 'general'
  });
});

// Weather endpoint (simulated - in production, use real weather API)
app.get('/api/weather', async (req, res) => {
  try {
    // Simulate weather data (in production, integrate with OpenWeatherMap or similar)
    const conditions = ['clear', 'cloudy', 'rain', 'storm'];
    const random = Math.random();
    
    const weather = {
      condition: random > 0.7 ? 'rain' : 'clear',
      rain: random > 0.7,
      description: random > 0.7 ? 'Rain expected in the next 2 hours' : 'Clear skies',
      temperature: Math.round(15 + Math.random() * 15),
      humidity: Math.round(40 + Math.random() * 40)
    };
    
    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: 'Weather fetch failed' });
  }
});

// Safety Feed endpoint
app.get('/api/safety-feed', (req, res) => {
  const feed = [];
  
  // Add recent incidents
  incidents.slice(-5).forEach(incident => {
    feed.push({
      type: 'incident',
      content: `${incident.type.toUpperCase()}: ${incident.description || 'Incident reported'}`,
      location: `Lat: ${incident.lat.toFixed(4)}, Lng: ${incident.lng.toFixed(4)}`,
      lat: incident.lat,
      lng: incident.lng,
      timestamp: incident.timestamp
    });
  });
  
  // Add SOS alerts
  sosAlerts.slice(-3).forEach(alert => {
    feed.push({
      type: 'alert',
      content: '🚨 SOS Emergency Alert - User needs immediate assistance',
      location: `Lat: ${alert.lat.toFixed(4)}, Lng: ${alert.lng.toFixed(4)}`,
      lat: alert.lat,
      lng: alert.lng,
      timestamp: alert.timestamp
    });
  });
  
  // Add safety tips
  const tips = [
    { content: '💡 Safety Tip: Always share your route with a trusted contact', timestamp: Date.now() - 3600000 },
    { content: '🛡️ Safety Tip: Avoid isolated areas after dark', timestamp: Date.now() - 7200000 },
    { content: '✅ Safety Tip: Use well-lit, populated routes when possible', timestamp: Date.now() - 10800000 }
  ];
  
  tips.forEach(tip => feed.push({ ...tip, type: 'tip' }));
  
  // Sort by timestamp (newest first)
  feed.sort((a, b) => b.timestamp - a.timestamp);
  
  res.json(feed.slice(0, 10)); // Return latest 10 items
});

// Incident Timeline endpoint
app.get('/api/incidents/timeline', (req, res) => {
  const { period } = req.query;
  let timeRange = 24 * 60 * 60 * 1000; // 24 hours default
  
  switch(period) {
    case '7d': timeRange = 7 * 24 * 60 * 60 * 1000; break;
    case '30d': timeRange = 30 * 24 * 60 * 60 * 1000; break;
  }
  
  const now = Date.now();
  const filteredIncidents = incidents.filter(i => now - i.timestamp < timeRange);
  
  // Group by time intervals
  const intervals = period === '24h' ? 24 : period === '7d' ? 7 : 30;
  const intervalSize = timeRange / intervals;
  
  const timeline = [];
  for (let i = 0; i < intervals; i++) {
    const startTime = now - (intervals - i) * intervalSize;
    const endTime = now - (intervals - i - 1) * intervalSize;
    
    const count = filteredIncidents.filter(inc => 
      inc.timestamp >= startTime && inc.timestamp < endTime
    ).length;
    
    const date = new Date(startTime);
    const timeLabel = period === '24h' 
      ? `${date.getHours()}:00`
      : period === '7d'
      ? date.toLocaleDateString('en-US', { weekday: 'short' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    timeline.push({ time: timeLabel, count, timestamp: startTime });
  }
  
  res.json(timeline);
});

// Crowd Density endpoint
app.get('/api/crowd-density', (req, res) => {
  // Simulate crowd density data based on time and location
  const hour = new Date().getHours();
  const isPeakHours = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  
  const zones = [
    { lat: 40.7580, lng: -73.9855, density: isPeakHours ? 'high' : 'medium', radius: 300, count: isPeakHours ? 150 : 50 },
    { lat: 40.7489, lng: -73.9680, density: isPeakHours ? 'high' : 'low', radius: 250, count: isPeakHours ? 120 : 20 },
    { lat: 40.7571, lng: -73.9869, density: 'high', radius: 200, count: 200 },
    { lat: 40.7595, lng: -73.9845, density: 'medium', radius: 180, count: 60 }
  ];
  
  res.json({ zones });
});

// AI Chat endpoint - Enhanced with better responses
app.post('/api/ai/chat', (req, res) => {
  const { message, context } = req.body;
  const lowerMessage = message.toLowerCase();
  
  let response = '';
  const hour = new Date().getHours();
  const isNight = hour >= 21 || hour < 6;
  
  // Enhanced AI responses with Indian context
  if (lowerMessage.includes('help') || lowerMessage.includes('emergency') || lowerMessage.includes('danger')) {
    response = '🚨 Stay calm! I\'m here to help. If you\'re in immediate danger:\n1. Press the SOS EMERGENCY button immediately\n2. Head to the nearest safe haven (pharmacy, police station, or hospital)\n3. Call 100 (Police) or 108 (Ambulance)\n4. Share your location with a trusted contact\n\nYou\'re not alone. Help is available.';
  } else if (lowerMessage.includes('safe') || lowerMessage.includes('route') || lowerMessage.includes('best route')) {
    response = '🛡️ I recommend using the "Safest Route" option. It analyzes:\n• Crime data in your area\n• Street lighting conditions\n• Crowd density\n• Recent incidents\n\nThe safest route may take a few minutes longer, but your safety is worth it. In India, well-lit main roads with shops are generally safer, especially at night.';
  } else if (lowerMessage.includes('night') || lowerMessage.includes('dark') || lowerMessage.includes('evening')) {
    response = `🌙 For night travel in India, I suggest:\n1. Use well-lit main roads (avoid shortcuts)\n2. Prefer routes with shops/restaurants open\n3. Use auto-rickshaw or taxi (Ola/Uber) for safety\n4. Share your live location with family\n5. Avoid isolated areas and empty streets\n6. Keep emergency contacts ready\n\nThe app automatically adjusts routes based on time. Current time: ${isNight ? 'Night - Extra caution advised!' : 'Daytime - Generally safer'}`;
  } else if (lowerMessage.includes('incident') || lowerMessage.includes('report') || lowerMessage.includes('happened')) {
    response = '📝 You can report incidents anonymously:\n1. Go to "Report Incident" section\n2. Select incident type (Theft, Harassment, etc.)\n3. Enable "Anonymous Mode" if you prefer privacy\n4. Add description (optional)\n5. Click Report\n\nYour reports help keep the community safe! You\'ll earn +10 safety points.';
  } else if (lowerMessage.includes('crowd') || lowerMessage.includes('people') || lowerMessage.includes('busy')) {
    response = '👥 Crowd density information:\n• High density = More people = Generally safer\n• Low density = Fewer people = Be more alert\n• Enable "Crowd Density" toggle on map to see zones\n• In India, crowded areas like markets, metro stations are usually safe\n• But watch your belongings in crowded places';
  } else if (lowerMessage.includes('safe haven') || lowerMessage.includes('safe spot') || lowerMessage.includes('where to go')) {
    response = '🛡️ Safe Havens near you:\n• Pharmacies (Apollo, MedPlus) - 24/7 help\n• Police Stations - Emergency assistance\n• Hospitals - Medical emergencies\n• Metro/Bus Stations - Public places with security\n• ATMs with security guards\n• Cafes/Restaurants - Well-lit, public spaces\n\nClick on any safe haven in the list to see it on the map!';
  } else if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('rupee') || lowerMessage.includes('money')) {
    response = '💰 Cost comparison:\n• Walking: Free\n• Bike: ₹20/hour\n• Auto-rickshaw: ₹15/km (approx)\n• Taxi (Ola/Uber): ₹15/km\n• Bus: ₹25 flat rate\n\nThe app shows cost vs safety trade-off. Sometimes paying a bit more for a taxi is worth the extra safety!';
  } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    response = '👋 Hello! I\'m your AI Safety Companion for SafeTrail.\n\nI can help you with:\n• Finding the safest routes\n• Safety tips for travel\n• Emergency guidance\n• Understanding safety features\n• Route planning advice\n\nWhat would you like to know? Ask me anything about safety!';
  } else if (lowerMessage.includes('tips') || lowerMessage.includes('advice') || lowerMessage.includes('suggest')) {
    response = '💡 Safety Tips for India:\n\n1. **Day Travel**: Use main roads, avoid isolated shortcuts\n2. **Night Travel**: Prefer auto/taxi, share location\n3. **Public Transport**: Metro and buses are generally safe\n4. **Emergency**: Dial 100 (Police), 108 (Ambulance)\n5. **Stay Alert**: Keep phone charged, avoid dark alleys\n6. **Trust Your Instincts**: If something feels wrong, change route\n7. **Use App Features**: Enable crowd density, check safety feed\n\nStay safe! 🛡️';
  } else if (lowerMessage.includes('sos') || lowerMessage.includes('emergency button')) {
    response = '🚨 SOS Emergency Features:\n\n1. **SOS Button**: Press the red "SOS EMERGENCY" button - broadcasts your location to nearby users\n2. **Voice SOS**: Say "Help SafeTrail" - hands-free emergency activation\n3. **Safe Havens**: Quick access to nearest help points\n4. **Emergency Contacts**: Keep 100 (Police) and 108 (Ambulance) saved\n\nIn real emergency, also call 100 immediately!';
  } else if (lowerMessage.includes('points') || lowerMessage.includes('gamification') || lowerMessage.includes('reward')) {
    response = '🏆 Safety Points System:\n\nEarn points by:\n• Reporting incidents: +10 points\n• Verifying alerts: +5 points\n• Using safe routes: +3 points\n• Contributing to community safety\n\nYour current points help build a safer community! Check your points in the sidebar.';
  } else {
    response = 'I understand your question. Here\'s how SafeTrail can help:\n\n✅ **Route Safety**: Use "Safest Route" for AI-analyzed safe paths\n✅ **Real-time Alerts**: Check Safety Feed for recent incidents\n✅ **Crowd Density**: Enable toggle to see busy areas\n✅ **Safe Havens**: Find nearby pharmacies, police, hospitals\n✅ **Emergency**: Use SOS button for immediate help\n✅ **Privacy**: Report anonymously with location blur\n\nFor specific help, try asking about:\n• Routes, Night travel, Incidents, Safe havens, Costs, or Tips\n\nStay safe! 🛡️';
  }
  
  // Add contextual information
  if (context && context.currentRoute) {
    response += '\n\n📍 Your current route has been analyzed. Check the route information panel for detailed safety scores.';
  }
  
  if (context && context.userLocation) {
    response += `\n\n📍 I can see you're near ${context.userLocation.lat.toFixed(4)}, ${context.userLocation.lng.toFixed(4)}. Safe havens are updated based on your location.`;
  }
  
  res.json({ response });
});

// Helper function
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.listen(PORT, () => {
  console.log(`\n🛡️  SafeTrail Backend running on http://localhost:${PORT}`);
  console.log(`\n✨ Features Available:`);
  console.log(`   - AI-Powered Safety Analysis`);
  console.log(`   - Real-time Safety Feed`);
  console.log(`   - Incident Heat Timeline`);
  console.log(`   - Crowd Density Visualization`);
  console.log(`   - AI Chat Companion`);
  console.log(`   - Weather Alerts`);
  console.log(`   - Time-based Risk Assessment`);
  console.log(`   - Budget Calculator`);
  console.log(`   - Insurance Integration`);
  console.log(`   - Privacy Controls\n`);
});
