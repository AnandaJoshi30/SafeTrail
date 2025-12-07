const API_BASE = 'http://localhost:3000/api';

// User authentication state
let currentUser = null;
let map, currentLocationMarker, routeLayer, userLocation;
let heatmapCircles = [], incidentMarkers = [], sosMarkers = [], safeHavenMarkers = [];
let fastestRouteData = null, safestRouteData = null;
let userPoints = 0;
let voiceRecognition = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupAuthListeners();
});

// Authentication
function checkAuth() {
    const user = localStorage.getItem('safetrail_user');
    if (user) {
        currentUser = JSON.parse(user);
        document.getElementById('authModal').classList.add('hidden');
        document.getElementById('userName').textContent = currentUser.name;
        initializeApp();
    } else {
        document.getElementById('authModal').classList.remove('hidden');
    }
}

function setupAuthListeners() {
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
        });
    });

    // Login
    document.getElementById('loginBtn').addEventListener('click', () => {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (email && password) {
            currentUser = { name: email.split('@')[0], email };
            localStorage.setItem('safetrail_user', JSON.stringify(currentUser));
            checkAuth();
        }
    });

    // Signup
    document.getElementById('signupBtn').addEventListener('click', () => {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirm = document.getElementById('signupConfirm').value;
        
        if (name && email && password && password === confirm) {
            currentUser = { name, email };
            localStorage.setItem('safetrail_user', JSON.stringify(currentUser));
            checkAuth();
        } else {
            alert('Please fill all fields and ensure passwords match');
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('safetrail_user');
        location.reload();
    });
}

// Initialize main app
async function initializeApp() {
    // Apply saved theme on load
    const savedTheme = localStorage.getItem('safetrail_theme') || 'light';
    applyTheme(savedTheme);
    
    // Initialize map
    map = L.map('map').setView([40.7580, -73.9855], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    await loadSafetyHeatmap();
    await loadIncidents();
    await loadSOSAlerts();
    checkTimeBasedRisks();
    getWeatherAlerts();
    
    // Get user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            if (currentLocationMarker) map.removeLayer(currentLocationMarker);
            
            currentLocationMarker = L.marker([userLocation.lat, userLocation.lng], {
                icon: L.divIcon({
                    className: 'current-location-marker',
                    html: '<div style="background: #4299e1; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
                    iconSize: [20, 20]
                })
            }).addTo(map);
            
            map.setView([userLocation.lat, userLocation.lng], 13);
        });
    }

    setupEventListeners();
    
    // Initialize timeline after a short delay to ensure canvas is ready
    setTimeout(() => {
        initializeTimeline();
        window.addEventListener('resize', () => {
            updateTimelineSize();
            loadHeatTimeline();
        });
    }, 500);
    
    setInterval(() => {
        loadIncidents();
        loadSOSAlerts();
        checkTimeBasedRisks();
        if (crowdDensityEnabled) {
            loadCrowdDensity();
        }
    }, 30000);
}

// Event listeners - Enhanced version below

// Calculate routes with AI
async function calculateRoutes(displayType) {
    const fromText = document.getElementById('fromInput').value;
    const toText = document.getElementById('toInput').value;
    
    if (!fromText || !toText) {
        alert('Please enter both start and destination');
        return;
    }
    
    const from = fromText.includes(',') ? 
        { lat: parseFloat(fromText.split(',')[0]), lng: parseFloat(fromText.split(',')[1]) } :
        await geocode(fromText);
    
    const to = await geocode(toText);
    
    if (!from || !to) {
        alert('Could not find locations');
        return;
    }
    
    // Get both routes
    fastestRouteData = await getRoute(from, to, 'fastest');
    safestRouteData = await getRoute(from, to, 'safest');
    
    if (fastestRouteData && safestRouteData) {
        displayRoute(displayType === 'fastest' ? fastestRouteData : safestRouteData, displayType);
        displayRouteComparison();
        performAIAnalysis(from, to);
        updateBudget();
        
        // Save to history
        saveRouteToHistory(fromText, toText, displayType === 'fastest' ? fastestRouteData : safestRouteData);
    }
}

// Save route to history
function saveRouteToHistory(from, to, route) {
    const history = JSON.parse(localStorage.getItem('safetrail_history') || '[]');
    const transport = document.querySelector('input[name="transport"]:checked').value;
    const cost = calculateCost(route.distance, route.duration, transport);
    
    history.push({
        from,
        to,
        distance: (route.distance / 1000).toFixed(2),
        duration: Math.round(route.duration / 60),
        cost: parseFloat(cost).toFixed(2),
        timestamp: Date.now()
    });
    
    // Keep only last 50 routes
    if (history.length > 50) {
        history.shift();
    }
    
    localStorage.setItem('safetrail_history', JSON.stringify(history));
}

// Display route comparison
function displayRouteComparison() {
    if (!fastestRouteData || !safestRouteData) return;
    
    const transport = document.querySelector('input[name="transport"]:checked').value;
    
    // Fastest route
    const fastDist = (fastestRouteData.distance / 1000).toFixed(2);
    const fastDur = Math.round(fastestRouteData.duration / 60);
    const fastCost = calculateCost(fastestRouteData.distance, fastestRouteData.duration, transport);
    
    document.getElementById('fastestDistance').textContent = `Distance: ${fastDist} km`;
    document.getElementById('fastestDuration').textContent = `Duration: ${fastDur} min`;
    document.getElementById('fastestCost').textContent = `Cost: ₹${fastCost}`;
    
    // Safest route
    const safeDist = (safestRouteData.distance / 1000).toFixed(2);
    const safeDur = Math.round(safestRouteData.duration / 60);
    const safeCost = calculateCost(safestRouteData.distance, safestRouteData.duration, transport);
    
    document.getElementById('safestDistance').textContent = `Distance: ${safeDist} km`;
    document.getElementById('safestDuration').textContent = `Duration: ${safeDur} min`;
    document.getElementById('safestCost').textContent = `Cost: ₹${safeCost}`;
    
    // Cost-Safety Tradeoff
    const costDiff = parseFloat(safeCost) - parseFloat(fastCost);
    const timeDiff = safeDur - fastDur;
    let tradeoffText = '';
    
    if (costDiff > 0 && timeDiff > 0) {
        tradeoffText = `Safest route costs ₹${costDiff.toFixed(2)} more and takes ${timeDiff} min longer, but significantly reduces risk. Worth it for your safety!`;
    } else if (costDiff === 0) {
        tradeoffText = `Same cost! Choose safest route for better protection at no extra charge.`;
    } else {
        tradeoffText = `Safest route is also economical. Best of both worlds!`;
    }
    
    document.getElementById('tradeoffText').textContent = tradeoffText;
    
    const routeInfo = document.getElementById('routeInfo');
    routeInfo.classList.remove('hidden');
    routeInfo.classList.add('visible');
    
    // Award points for using safe route
    if (safestRouteData) {
        addPoints(3, 'Used safe route');
    }
}

// AI Analysis with persona
async function performAIAnalysis(from, to) {
    try {
        const persona = document.getElementById('userPersona').value;
        const response = await fetch(`${API_BASE}/ai/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fastestRoute: fastestRouteData,
                safestRoute: safestRouteData,
                from, to,
                time: new Date().getHours(),
                persona: persona
            })
        });
        
        const analysis = await response.json();
        
        document.getElementById('aiRecommendation').textContent = analysis.recommendation;
        document.getElementById('riskLevel').style.width = analysis.riskScore + '%';
        document.getElementById('riskPercentage').textContent = analysis.riskScore + '%';
        
        // Safety factors
        document.getElementById('lightingScore').textContent = analysis.lighting || 'Good';
        document.getElementById('crowdScore').textContent = analysis.crowd || 'Moderate';
        document.getElementById('crimeScore').textContent = analysis.crime || 'Low';
        
        // Crowd density alert
        if (analysis.crowdDensity === 'low') {
            document.getElementById('crowdAlert').classList.remove('hidden');
            document.getElementById('crowdText').textContent = 'Low crowd density detected. Stay alert.';
        } else {
            document.getElementById('crowdAlert').classList.add('hidden');
        }
    } catch (error) {
        console.error('AI analysis failed:', error);
    }
}

// Calculate cost (in Indian Rupees)
function calculateCost(distance, duration, transport) {
    const km = distance / 1000;
    const hours = duration / 3600;
    
    switch(transport) {
        case 'walk': return '0.00';
        case 'bike': return (hours * 20).toFixed(2); // ₹20/hr
        case 'taxi': return (km * 15).toFixed(2); // ₹15/km
        case 'bus': return '25.00'; // ₹25 flat
        default: return '0.00';
    }
}

// Update budget
function updateBudget() {
    if (!fastestRouteData) return;
    
    const transport = document.querySelector('input[name="transport"]:checked').value;
    const cost = calculateCost(fastestRouteData.distance, fastestRouteData.duration, transport);
    document.getElementById('budgetAmount').textContent = '₹' + cost;
}

// Check time-based risks
function checkTimeBasedRisks() {
    const hour = new Date().getHours();
    const timeAlert = document.getElementById('timeAlert');
    const timeText = document.getElementById('timeText');
    
    if (hour >= 21 || hour < 6) {
        timeAlert.classList.remove('hidden');
        timeText.textContent = 'High-risk time: After 9 PM. Extra caution advised.';
    } else {
        timeAlert.classList.add('hidden');
    }
}

// Weather alerts
async function getWeatherAlerts() {
    try {
        const response = await fetch(`${API_BASE}/weather`);
        const weather = await response.json();
        
        const weatherAlert = document.getElementById('weatherAlert');
        const weatherText = document.getElementById('weatherText');
        
        if (weather.rain || weather.condition === 'rain') {
            weatherAlert.classList.remove('hidden');
            weatherText.textContent = `Rain expected: ${weather.description}. Roads may be slippery.`;
        } else {
            weatherAlert.classList.add('hidden');
        }
    } catch (error) {
        console.error('Weather fetch failed:', error);
    }
}

// Display route
function displayRoute(route, type) {
    if (routeLayer) map.removeLayer(routeLayer);
    
    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
    
    routeLayer = L.polyline(coords, {
        color: type === 'safest' ? '#48bb78' : '#667eea',
        weight: 6,
        opacity: 0.8
    }).addTo(map);
    
    map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
}

// Geocode
async function geocode(address) {
    try {
        const response = await fetch(`${API_BASE}/geocode?query=${encodeURIComponent(address)}`);
        const data = await response.json();
        return data[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
    } catch (error) {
        console.error('Geocoding failed:', error);
        return null;
    }
}

// Get route
async function getRoute(start, end, type) {
    try {
        const startCoords = `${start.lng},${start.lat}`;
        const endCoords = `${end.lng},${end.lat}`;
        
        const response = await fetch(`${API_BASE}/route/${type}?start=${startCoords}&end=${endCoords}`);
        const data = await response.json();
        
        return data.routes && data.routes.length > 0 ? data.routes[0] : null;
    } catch (error) {
        console.error('Routing failed:', error);
        return null;
    }
}

// Load safety heatmap
async function loadSafetyHeatmap() {
    try {
        const response = await fetch(`${API_BASE}/safety/heatmap`);
        const data = await response.json();
        
        heatmapCircles.forEach(circle => map.removeLayer(circle));
        heatmapCircles = [];
        
        data.zones.forEach(zone => {
            const circle = L.circle([zone.lat, zone.lng], {
                color: 'red',
                fillColor: '#ff0000',
                fillOpacity: 0.2,
                radius: zone.radius
            }).addTo(map);
            
            circle.bindPopup(`<b>High Risk Zone</b><br>Stay alert in this area`);
            heatmapCircles.push(circle);
        });
    } catch (error) {
        console.error('Failed to load heatmap:', error);
    }
}

// Load incidents
async function loadIncidents() {
    try {
        const response = await fetch(`${API_BASE}/incidents`);
        const incidents = await response.json();
        
        incidentMarkers.forEach(marker => map.removeLayer(marker));
        incidentMarkers = [];
        
        incidents.forEach(incident => {
            const marker = L.marker([incident.lat, incident.lng], {
                icon: L.divIcon({
                    className: 'incident-marker',
                    html: '<div style="background: #ed8936; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>',
                    iconSize: [15, 15]
                })
            }).addTo(map);
            
            marker.bindPopup(`<b>${incident.type.toUpperCase()}</b><br>${incident.description || 'No description'}<br><small>${new Date(incident.timestamp).toLocaleString()}</small>`);
            incidentMarkers.push(marker);
        });
    } catch (error) {
        console.error('Failed to load incidents:', error);
    }
}

// Load SOS alerts
async function loadSOSAlerts() {
    try {
        const response = await fetch(`${API_BASE}/sos`);
        const alerts = await response.json();
        
        sosMarkers.forEach(marker => map.removeLayer(marker));
        sosMarkers = [];
        
        alerts.forEach(alert => {
            const marker = L.marker([alert.lat, alert.lng], {
                icon: L.divIcon({
                    className: 'sos-marker',
                    html: '<div style="background: #f56565; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; animation: pulse 1s infinite;"></div>',
                    iconSize: [20, 20]
                })
            }).addTo(map);
            
            marker.bindPopup(`<b>🚨 SOS ALERT</b><br>User: ${alert.userId}<br><small>${new Date(alert.timestamp).toLocaleString()}</small>`);
            sosMarkers.push(marker);
        });
    } catch (error) {
        console.error('Failed to load SOS alerts:', error);
    }
}

// Report incident
async function reportIncident() {
    const center = map.getCenter();
    const type = document.getElementById('incidentType').value;
    const description = document.getElementById('incidentDesc').value;
    
    try {
        const response = await fetch(`${API_BASE}/incidents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type, lat: center.lat, lng: center.lng, description,
                userId: currentUser.email
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Incident reported successfully!');
            document.getElementById('incidentDesc').value = '';
            await loadIncidents();
        }
    } catch (error) {
        alert('Failed to report incident');
    }
}

// Send SOS
async function sendSOS() {
    if (!confirm('Send SOS emergency broadcast?')) return;
    
    const location = userLocation || map.getCenter();
    
    try {
        const response = await fetch(`${API_BASE}/sos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lat: location.lat, lng: location.lng,
                userId: currentUser.email
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('🚨 SOS Emergency broadcast sent! Help is on the way.');
            await loadSOSAlerts();
        }
    } catch (error) {
        alert('Failed to send SOS');
    }
}


// Gamification - User Points
function loadUserPoints() {
    const saved = localStorage.getItem('safetrail_points');
    userPoints = saved ? parseInt(saved) : 0;
    document.getElementById('userPoints').textContent = userPoints;
}

function addPoints(points, reason) {
    userPoints += points;
    localStorage.setItem('safetrail_points', userPoints);
    document.getElementById('userPoints').textContent = userPoints;
    
    // Show notification
    showNotification(`+${points} points: ${reason}`, 'success');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : '#f56565'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Voice-Activated SOS
function setupVoiceSOS() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Voice recognition not supported in this browser. Try Chrome.');
        return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceRecognition = new SpeechRecognition();
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = false;
    
    voiceRecognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        
        if (transcript.includes('help') && transcript.includes('safetrail')) {
            sendSOS();
            voiceRecognition.stop();
        }
    };
    
    voiceRecognition.start();
    showNotification('Voice SOS activated. Say "Help SafeTrail" to trigger emergency.', 'success');
    
    document.getElementById('voiceSOS').textContent = '🎤 Listening...';
    document.getElementById('voiceSOS').style.background = '#22c55e';
    
    setTimeout(() => {
        if (voiceRecognition) {
            voiceRecognition.stop();
            document.getElementById('voiceSOS').innerHTML = '<i class="fas fa-microphone"></i> Voice SOS';
            document.getElementById('voiceSOS').style.background = '#9333ea';
        }
    }, 30000); // Listen for 30 seconds
}

// Load Safe Havens - Dynamic based on current location
async function loadSafeHavens() {
    try {
        // Get user location for dynamic safe havens
        const location = userLocation || map.getCenter();
        const response = await fetch(`${API_BASE}/safe-havens?lat=${location.lat}&lng=${location.lng}`);
        const havens = await response.json();
        
        const list = document.getElementById('safeHavensList');
        list.innerHTML = '';
        
        // Clear existing markers
        safeHavenMarkers.forEach(marker => map.removeLayer(marker));
        safeHavenMarkers = [];
        
        havens.forEach(haven => {
            // Add to list
            const item = document.createElement('div');
            item.className = 'safe-haven-item';
            item.innerHTML = `
                <i class="fas fa-${haven.icon}"></i>
                <div class="safe-haven-info">
                    <strong>${haven.name}</strong>
                    <small>${haven.distance} • ${haven.type}</small>
                </div>
            `;
            item.onclick = () => {
                map.setView([haven.lat, haven.lng], 16);
            };
            list.appendChild(item);
            
            // Add marker to map
            const marker = L.marker([haven.lat, haven.lng], {
                icon: L.divIcon({
                    className: 'safe-haven-marker',
                    html: `<div style="background: #22c55e; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">🏪</div>`,
                    iconSize: [25, 25]
                })
            }).addTo(map);
            
            marker.bindPopup(`<b>🛡️ Safe Haven</b><br><strong>${haven.name}</strong><br>${haven.type}<br><small>Verified safe spot</small>`);
            safeHavenMarkers.push(marker);
        });
    } catch (error) {
        console.error('Failed to load safe havens:', error);
        document.getElementById('safeHavensList').innerHTML = '<p class="loading-text">No safe spots nearby</p>';
    }
}

// Enhanced incident reporting with points and privacy controls
async function reportIncident() {
    const center = map.getCenter();
    const type = document.getElementById('incidentType').value;
    const description = document.getElementById('incidentDesc').value;
    const anonymous = document.getElementById('anonymousMode').checked;
    const blurLocation = document.getElementById('locationBlur').checked;
    
    let lat = center.lat;
    let lng = center.lng;
    
    // Apply location blur if enabled
    if (blurLocation) {
        const blurRadius = 0.001; // ~100m
        lat += (Math.random() - 0.5) * blurRadius * 2;
        lng += (Math.random() - 0.5) * blurRadius * 2;
    }
    
    try {
        const response = await fetch(`${API_BASE}/incidents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type, lat, lng, description,
                userId: anonymous ? 'anonymous' : currentUser.email,
                anonymous: anonymous,
                blurred: blurLocation
            })
        });
        
        const data = await response.json();
        if (data.success) {
            addPoints(10, 'Reported incident');
            showNotification('Incident reported! +10 points', 'success');
            document.getElementById('incidentDesc').value = '';
            await loadIncidents();
            await loadSafetyFeed();
        }
    } catch (error) {
        showNotification('Failed to report incident', 'error');
    }
}

// Safety Feed
async function loadSafetyFeed() {
    try {
        const response = await fetch(`${API_BASE}/safety-feed`);
        const feed = await response.json();
        
        const feedContainer = document.getElementById('safetyFeed');
        feedContainer.innerHTML = '';
        
        if (feed.length === 0) {
            feedContainer.innerHTML = '<p class="loading-text">No recent safety updates</p>';
            return;
        }
        
        feed.forEach(item => {
            const feedItem = document.createElement('div');
            feedItem.className = `feed-item ${item.type}`;
            
            const timeAgo = getTimeAgo(new Date(item.timestamp));
            const typeLabel = item.type === 'incident' ? 'Incident' : 
                             item.type === 'alert' ? 'Alert' : 'Safety Tip';
            
            feedItem.innerHTML = `
                <div class="feed-header">
                    <span class="feed-type">${typeLabel}</span>
                    <span class="feed-time">${timeAgo}</span>
                </div>
                <div class="feed-content">${item.content}</div>
                ${item.location ? `<div class="feed-location"><i class="fas fa-map-marker-alt"></i> ${item.location}</div>` : ''}
            `;
            
            feedItem.onclick = () => {
                if (item.lat && item.lng) {
                    map.setView([item.lat, item.lng], 15);
                }
            };
            
            feedContainer.appendChild(feedItem);
        });
    } catch (error) {
        console.error('Failed to load safety feed:', error);
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Incident Heat Timeline
let timelineCanvas, timelineCtx;
let currentTimelinePeriod = '24h';

async function initializeTimeline() {
    timelineCanvas = document.getElementById('timelineCanvas');
    if (!timelineCanvas) return;
    
    timelineCtx = timelineCanvas.getContext('2d');
    updateTimelineSize();
    
    // Timeline period buttons
    document.querySelectorAll('.timeline-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.timeline-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimelinePeriod = btn.dataset.period;
            loadHeatTimeline();
        });
    });
    
    loadHeatTimeline();
    setInterval(loadHeatTimeline, 60000); // Update every minute
}

function updateTimelineSize() {
    if (!timelineCanvas) return;
    const container = timelineCanvas.parentElement;
    timelineCanvas.width = container.clientWidth;
    timelineCanvas.height = container.clientHeight;
}

async function loadHeatTimeline() {
    if (!timelineCanvas || !timelineCtx) return;
    
    try {
        const response = await fetch(`${API_BASE}/incidents/timeline?period=${currentTimelinePeriod}`);
        const data = await response.json();
        
        drawTimeline(data);
    } catch (error) {
        console.error('Failed to load timeline:', error);
    }
}

function drawTimeline(data) {
    if (!timelineCtx) return;
    
    const width = timelineCanvas.width;
    const height = timelineCanvas.height;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Clear canvas
    timelineCtx.clearRect(0, 0, width, height);
    
    if (!data || data.length === 0) {
        timelineCtx.fillStyle = '#999';
        timelineCtx.font = '14px Arial';
        timelineCtx.textAlign = 'center';
        timelineCtx.fillText('No data available', width / 2, height / 2);
        return;
    }
    
    // Draw axes
    timelineCtx.strokeStyle = '#e0e0e0';
    timelineCtx.lineWidth = 1;
    timelineCtx.beginPath();
    timelineCtx.moveTo(padding, padding);
    timelineCtx.lineTo(padding, height - padding);
    timelineCtx.lineTo(width - padding, height - padding);
    timelineCtx.stroke();
    
    // Find max incidents for scaling
    const maxIncidents = Math.max(...data.map(d => d.count), 1);
    
    // Draw heat bars
    const barWidth = chartWidth / data.length;
    data.forEach((point, index) => {
        const x = padding + index * barWidth;
        const barHeight = (point.count / maxIncidents) * chartHeight;
        const y = height - padding - barHeight;
        
        // Color based on intensity
        const intensity = point.count / maxIncidents;
        const r = Math.floor(255 * intensity);
        const g = Math.floor(100 * (1 - intensity));
        const b = 0;
        
        timelineCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        timelineCtx.fillRect(x, y, barWidth - 2, barHeight);
    });
    
    // Draw labels
    timelineCtx.fillStyle = '#666';
    timelineCtx.font = '11px Arial';
    timelineCtx.textAlign = 'center';
    data.forEach((point, index) => {
        if (index % Math.ceil(data.length / 6) === 0) {
            const x = padding + index * barWidth + barWidth / 2;
            timelineCtx.fillText(point.time, x, height - 5);
        }
    });
}

// AI Chat Companion
let chatOpen = false;
let chatHistory = [];

function initializeAIChat() {
    const openBtn = document.getElementById('openChat');
    const closeBtn = document.getElementById('closeChat');
    const sendBtn = document.getElementById('sendChat');
    const chatInput = document.getElementById('chatInput');
    const chat = document.getElementById('aiChat');
    
    openBtn.addEventListener('click', () => {
        chat.classList.remove('hidden');
        openBtn.classList.add('hidden');
        chatOpen = true;
        chatInput.focus();
    });
    
    closeBtn.addEventListener('click', () => {
        chat.classList.add('hidden');
        openBtn.classList.remove('hidden');
        chatOpen = false;
    });
    
    sendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    
    // Disable input while processing
    input.disabled = true;
    const sendBtn = document.getElementById('sendChat');
    sendBtn.disabled = true;
    
    // Add user message
    addChatMessage(message, 'user');
    input.value = '';
    
    // Show typing indicator
    const typingId = addChatMessage('Typing...', 'bot', true);
    
    // Get AI response
    try {
        const response = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                context: {
                    userLocation,
                    currentRoute: safestRouteData,
                    persona: document.getElementById('userPersona')?.value || 'general',
                    time: new Date().getHours()
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove typing indicator
        const typingMsg = document.querySelector(`[data-typing-id="${typingId}"]`);
        if (typingMsg) typingMsg.remove();
        
        // Add formatted response (preserve line breaks)
        if (data && data.response) {
            addChatMessage(data.response.replace(/\n/g, '<br>'), 'bot');
        } else {
            addChatMessage('I received your message but got an unexpected response. Please try again.', 'bot');
        }
    } catch (error) {
        console.error('Chat error:', error);
        const typingMsg = document.querySelector(`[data-typing-id="${typingId}"]`);
        if (typingMsg) typingMsg.remove();
        addChatMessage('I apologize, but I\'m having trouble connecting right now. Please check your internet connection and try again. Error: ' + error.message, 'bot');
    } finally {
        // Re-enable input
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

function addChatMessage(text, sender, isTyping = false) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    
    if (isTyping) {
        const typingId = 'typing-' + Date.now();
        messageDiv.setAttribute('data-typing-id', typingId);
        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="fas fa-robot"></i>
                <p><em>${text}</em></p>
            </div>
        `;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return typingId;
    }
    
    const icon = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '';
    messageDiv.innerHTML = `
        <div class="message-content">
            ${icon}
            <p>${text}</p>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return null;
}

// Crowd Density Visualization
let crowdDensityLayer = null;
let crowdDensityEnabled = false;

async function loadCrowdDensity() {
    if (!crowdDensityEnabled) return;
    
    try {
        const response = await fetch(`${API_BASE}/crowd-density`);
        const data = await response.json();
        
        // Clear existing layer
        if (crowdDensityLayer) {
            crowdDensityLayer.clearLayers();
        } else {
            crowdDensityLayer = L.layerGroup().addTo(map);
        }
        
        data.zones.forEach(zone => {
            const color = zone.density === 'high' ? '#22c55e' : 
                         zone.density === 'medium' ? '#f59e0b' : '#f56565';
            const opacity = zone.density === 'high' ? 0.3 : 
                           zone.density === 'medium' ? 0.2 : 0.1;
            
            const circle = L.circle([zone.lat, zone.lng], {
                color: color,
                fillColor: color,
                fillOpacity: opacity,
                radius: zone.radius || 200
            }).addTo(crowdDensityLayer);
            
            circle.bindPopup(`<b>Crowd Density: ${zone.density.toUpperCase()}</b><br>${zone.count || 0} people nearby`);
        });
    } catch (error) {
        console.error('Failed to load crowd density:', error);
    }
}

// Insurance Integration
let insuranceConnected = false;

function initializeInsurance() {
    const connectBtn = document.getElementById('connectInsurance');
    const claimBtn = document.getElementById('fileClaim');
    
    // Check if insurance is already connected
    const saved = localStorage.getItem('safetrail_insurance');
    if (saved) {
        insuranceConnected = true;
        updateInsuranceUI(true);
    }
    
    connectBtn.addEventListener('click', () => {
        // Simulate insurance connection
        const provider = prompt('Enter insurance provider name:');
        if (provider) {
            localStorage.setItem('safetrail_insurance', JSON.stringify({ provider, connected: true }));
            insuranceConnected = true;
            updateInsuranceUI(true);
            showNotification('Insurance connected successfully!', 'success');
        }
    });
    
    claimBtn.addEventListener('click', () => {
        if (confirm('File an insurance claim for the last reported incident?')) {
            window.open('https://example.com/insurance-claim', '_blank');
            showNotification('Opening insurance claim form...', 'success');
        }
    });
}

function updateInsuranceUI(connected) {
    const statusEl = document.getElementById('insuranceStatus');
    const connectBtn = document.getElementById('connectInsurance');
    const claimBtn = document.getElementById('fileClaim');
    
    if (connected) {
        statusEl.textContent = 'Connected';
        connectBtn.classList.add('hidden');
        claimBtn.classList.remove('hidden');
    } else {
        statusEl.textContent = 'Not Connected';
        connectBtn.classList.remove('hidden');
        claimBtn.classList.add('hidden');
    }
}

// Enhanced Event listeners with all new features
function setupEventListeners() {
    document.getElementById('useCurrentLocation').addEventListener('click', () => {
        if (userLocation) {
            document.getElementById('fromInput').value = `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
        } else {
            alert('Location not available. Please enable location services.');
        }
    });

    document.getElementById('fastestRoute').addEventListener('click', () => calculateRoutes('fastest'));
    document.getElementById('safestRoute').addEventListener('click', () => calculateRoutes('safest'));

    // Budget calculator
    document.querySelectorAll('input[name="transport"]').forEach(radio => {
        radio.addEventListener('change', updateBudget);
    });

    document.getElementById('reportIncident').addEventListener('click', reportIncident);
    document.getElementById('sosButton').addEventListener('click', sendSOS);
    document.getElementById('voiceSOS').addEventListener('click', setupVoiceSOS);
    
    // Persona change
    document.getElementById('userPersona').addEventListener('change', () => {
        if (fastestRouteData && safestRouteData) {
            displayRouteComparison();
            performAIAnalysis(null, null);
        }
    });
    
    // Load user points
    loadUserPoints();
    loadSafeHavens();
    
    // New features
    initializeAIChat();
    initializeInsurance();
    
    // Crowd density toggle
    document.getElementById('toggleCrowdDensity').addEventListener('click', () => {
        crowdDensityEnabled = !crowdDensityEnabled;
        const btn = document.getElementById('toggleCrowdDensity');
        if (crowdDensityEnabled) {
            btn.classList.add('active');
            loadCrowdDensity();
            setInterval(loadCrowdDensity, 30000);
        } else {
            btn.classList.remove('active');
            if (crowdDensityLayer) {
                crowdDensityLayer.clearLayers();
            }
        }
    });
    
    // Load safety feed
    loadSafetyFeed();
    setInterval(loadSafetyFeed, 60000); // Update every minute
    
    // Navigation functionality
    setupNavigation();
    
    // Update safe havens when map moves
    map.on('moveend', () => {
        if (userLocation) {
            loadSafeHavens();
        }
    });
}

// Navigation functionality
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Handle page navigation
            switch(page) {
                case 'map':
                    showMapPage();
                    break;
                case 'history':
                    showHistoryPage();
                    break;
                case 'favorites':
                    showFavoritesPage();
                    break;
                case 'settings':
                    showSettingsPage();
                    break;
            }
        });
    });
}

function showMapPage() {
    document.querySelector('.main-content').style.display = 'flex';
    hideAllPages();
}

function showHistoryPage() {
    hideAllPages();
    const historyPage = document.getElementById('historyPage') || createHistoryPage();
    historyPage.style.display = 'block';
    loadRouteHistory();
}

function showFavoritesPage() {
    hideAllPages();
    const favoritesPage = document.getElementById('favoritesPage') || createFavoritesPage();
    favoritesPage.style.display = 'block';
    loadFavorites();
}

function showSettingsPage() {
    hideAllPages();
    const settingsPage = document.getElementById('settingsPage') || createSettingsPage();
    settingsPage.style.display = 'block';
}

function hideAllPages() {
    document.querySelectorAll('.page-content').forEach(page => {
        page.style.display = 'none';
    });
    document.querySelector('.main-content').style.display = 'none';
}

function createHistoryPage() {
    const page = document.createElement('div');
    page.id = 'historyPage';
    page.className = 'page-content';
    page.innerHTML = `
        <div class="page-container">
            <h2><i class="fas fa-history"></i> Route History</h2>
            <div id="routeHistoryList" class="history-list">
                <p class="loading-text">Loading history...</p>
            </div>
        </div>
    `;
    document.querySelector('.container').appendChild(page);
    return page;
}

function createFavoritesPage() {
    const page = document.createElement('div');
    page.id = 'favoritesPage';
    page.className = 'page-content';
    page.innerHTML = `
        <div class="page-container">
            <h2><i class="fas fa-star"></i> Favorite Locations</h2>
            <div id="favoritesList" class="favorites-list">
                <p class="loading-text">No favorites yet. Add locations from the map!</p>
            </div>
        </div>
    `;
    document.querySelector('.container').appendChild(page);
    return page;
}

function createSettingsPage() {
    const page = document.createElement('div');
    page.id = 'settingsPage';
    page.className = 'page-content';
    
    // Load saved theme
    const savedTheme = localStorage.getItem('safetrail_theme') || 'light';
    
    page.innerHTML = `
        <div class="page-container">
            <h2><i class="fas fa-cog"></i> Settings</h2>
            <div class="settings-section">
                <h3>Privacy</h3>
                <label class="setting-item">
                    <input type="checkbox" id="shareLocation" checked>
                    <span>Share location for safe havens</span>
                </label>
                <label class="setting-item">
                    <input type="checkbox" id="anonymousByDefault">
                    <span>Anonymous mode by default</span>
                </label>
            </div>
            <div class="settings-section">
                <h3>Notifications</h3>
                <label class="setting-item">
                    <input type="checkbox" id="incidentAlerts" checked>
                    <span>Incident alerts</span>
                </label>
                <label class="setting-item">
                    <input type="checkbox" id="safetyTips" checked>
                    <span>Safety tips</span>
                </label>
            </div>
            <div class="settings-section">
                <h3>Appearance</h3>
                <label class="setting-item">
                    <span>Theme:</span>
                    <select id="themeSelect">
                        <option value="light" ${savedTheme === 'light' ? 'selected' : ''}>Light</option>
                        <option value="dark" ${savedTheme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="auto" ${savedTheme === 'auto' ? 'selected' : ''}>Auto</option>
                    </select>
                </label>
            </div>
        </div>
    `;
    document.querySelector('.container').appendChild(page);
    
    // Setup theme change listener after DOM is ready
    setTimeout(() => {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                const theme = e.target.value;
                applyTheme(theme);
            });
        }
    }, 100);
    
    return page;
}

// Apply theme function (defined early so it can be used anywhere)
function applyTheme(theme) {
    const body = document.body;
    const html = document.documentElement;
    
    // Remove existing theme classes
    body.classList.remove('theme-light', 'theme-dark');
    html.classList.remove('theme-light', 'theme-dark');
    
    // Determine actual theme
    let actualTheme = theme;
    if (theme === 'auto') {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        actualTheme = prefersDark ? 'dark' : 'light';
    }
    
    // Apply theme
    body.classList.add(`theme-${actualTheme}`);
    html.classList.add(`theme-${actualTheme}`);
    
    // Save theme preference
    localStorage.setItem('safetrail_theme', theme);
    
    // Update theme selector if it exists
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = theme;
    }
    
    // Update map if it exists
    if (map) {
        // Refresh map tiles for better visibility in dark mode
        map.invalidateSize();
    }
}

function loadRouteHistory() {
    const history = JSON.parse(localStorage.getItem('safetrail_history') || '[]');
    const list = document.getElementById('routeHistoryList');
    
    if (history.length === 0) {
        list.innerHTML = '<p class="loading-text">No route history yet.</p>';
        return;
    }
    
    list.innerHTML = history.reverse().map(route => `
        <div class="history-item">
            <div class="history-route">
                <strong>${route.from} → ${route.to}</strong>
                <small>${new Date(route.timestamp).toLocaleString()}</small>
            </div>
            <div class="history-details">
                <span>Distance: ${route.distance} km</span>
                <span>Duration: ${route.duration} min</span>
                <span>Cost: ₹${route.cost}</span>
            </div>
        </div>
    `).join('');
}

function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem('safetrail_favorites') || '[]');
    const list = document.getElementById('favoritesList');
    
    if (favorites.length === 0) {
        list.innerHTML = '<p class="loading-text">No favorites yet. Right-click on map to add favorites!</p>';
        return;
    }
    
    list.innerHTML = favorites.map(fav => `
        <div class="favorite-item">
            <i class="fas fa-map-marker-alt"></i>
            <div class="favorite-info">
                <strong>${fav.name}</strong>
                <small>${fav.address || `${fav.lat.toFixed(4)}, ${fav.lng.toFixed(4)}`}</small>
            </div>
            <button class="btn-favorite-remove" onclick="removeFavorite(${fav.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function removeFavorite(id) {
    const favorites = JSON.parse(localStorage.getItem('safetrail_favorites') || '[]');
    const updated = favorites.filter(f => f.id !== id);
    localStorage.setItem('safetrail_favorites', JSON.stringify(updated));
    loadFavorites();
}

// Save route to history
function saveRouteToHistory(from, to, route) {
    const history = JSON.parse(localStorage.getItem('safetrail_history') || '[]');
    const transport = document.querySelector('input[name="transport"]:checked').value;
    const cost = calculateCost(route.distance, route.duration, transport);
    
    history.push({
        from,
        to,
        distance: (route.distance / 1000).toFixed(2),
        duration: Math.round(route.duration / 60),
        cost: parseFloat(cost).toFixed(2),
        timestamp: Date.now()
    });
    
    // Keep only last 50 routes
    if (history.length > 50) {
        history.shift();
    }
    
    localStorage.setItem('safetrail_history', JSON.stringify(history));
}
