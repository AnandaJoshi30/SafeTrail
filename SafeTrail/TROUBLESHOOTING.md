# 🔧 Troubleshooting Connection Issues

## ✅ Server Status: RUNNING
Your server is running correctly on port 3000!

## Quick Fixes:

### 1. **Hard Refresh Your Browser**
- **Chrome/Edge**: Press `Ctrl + Shift + R` or `Ctrl + F5`
- **Firefox**: Press `Ctrl + Shift + R`
- This clears cached connection errors

### 2. **Try Different URLs**
Try these in order:
```
http://localhost:3000
http://127.0.0.1:3000
http://0.0.0.0:3000
```

### 3. **Check Windows Firewall**
1. Open Windows Security
2. Go to Firewall & network protection
3. Click "Allow an app through firewall"
4. Make sure Node.js is allowed for Private networks

### 4. **Try Incognito/Private Mode**
- Open a new incognito/private window
- Navigate to `http://localhost:3000`
- This bypasses browser cache and extensions

### 5. **Check Browser Console**
1. Press `F12` to open Developer Tools
2. Go to Console tab
3. Look for any error messages
4. Share the errors if you see any

### 6. **Try Different Browser**
- If using Chrome, try Edge or Firefox
- Sometimes browser extensions can block localhost

### 7. **Verify Server is Running**
Open PowerShell and run:
```powershell
Get-NetTCPConnection -LocalPort 3000
```
You should see "Listen" state.

### 8. **Restart the Server**
If nothing works, restart:
1. Stop current server (close terminal or Ctrl+C)
2. Navigate to SafeTrail folder
3. Run: `node server.js`
4. Wait for: "🛡️ SafeTrail Backend running on http://localhost:3000"

## Still Not Working?

Check if another application is using port 3000:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
```

If needed, change the port in `server.js`:
```javascript
const PORT = process.env.PORT || 3001;  // Change to 3001
```

Then access: `http://localhost:3001`

