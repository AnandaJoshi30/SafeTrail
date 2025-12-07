@echo off
echo Testing SafeTrail API Endpoints...
echo.
echo Make sure the server is running first (run start.bat)
echo.
pause
echo.
echo Testing Geocoding...
curl "http://localhost:3000/api/geocode?query=New+York"
echo.
echo.
echo Testing Safety Heatmap...
curl "http://localhost:3000/api/safety/heatmap"
echo.
echo.
echo Testing Incidents...
curl "http://localhost:3000/api/incidents"
echo.
echo.
echo All tests complete!
pause
