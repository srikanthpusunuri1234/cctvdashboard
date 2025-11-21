const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable CORS to allow requests from your Flutter App or Laptop Browser
app.use(cors());

// Serve static frontend files (index.html, app.js, style.css) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// ==================================================================
// 🔧 CONFIGURATION (EDIT THIS SECTION)
// ==================================================================

// 1. ENTER YOUR VPS PUBLIC IP HERE
//    This is the IP address of the remote server where MediaMTX is running.
const VPS_IP = '13.235.XX.XX'; 

// 2. API URL (Port 9997)
//    This is where we ask "What cameras are online?"
//    NOTE: Ensure port 9997 is OPEN in your VPS firewall (sudo ufw allow 9997/tcp)
const MEDIAMTX_API_URL = `http://${VPS_IP}:9997/v3/paths/list`;

// 3. HLS Playback Base URL (Port 8888)
//    This is the URL base that the video player will use to pull the stream.
//    NOTE: Ensure port 8888 is OPEN in your VPS firewall.
const HLS_PUBLIC_BASE = `http://${VPS_IP}:8888`;

// ==================================================================

// --- API ENDPOINT ---
app.get('/api/cameras', async (req, res) => {
    try {
        console.log(`🔍 Fetching camera list from: ${MEDIAMTX_API_URL}`);
        
        // Fetch list of paths from MediaMTX API with a 3-second timeout
        const response = await axios.get(MEDIAMTX_API_URL, { timeout: 3000 });
        const items = response.data.items || [];

        // Filter and format the list
        const activeCameras = items
            .filter(item => item.ready) // Only include streams that are actually sending video
            .map(item => ({
                name: item.name, // e.g., "live/testcar"
                
                // Construct the full HLS URL for VLC or Web Player
                // Example: http://13.235.XX.XX:8888/live/testcar/index.m3u8
                url: `${HLS_PUBLIC_BASE}/${item.name}/index.m3u8`
            }));

        console.log(`✅ Success: Found ${activeCameras.length} active cameras.`);
        res.json({ success: true, cameras: activeCameras });

    } catch (error) {
        // Error Handling
        console.error("❌ Connection Error:", error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error("   -> CRITICAL: Cannot connect to Port 9997 on the remote server.");
            console.error("   -> CHECK 1: Is MediaMTX running on the VPS?");
            console.error("   -> CHECK 2: Is Port 9997 open in your VPS Firewall (ufw/AWS Security Group)?");
            console.error("   -> CHECK 3: Did you set 'api: yes' in mediamtx.yml?");
        }
        
        res.json({ 
            success: false, 
            message: "Could not fetch cameras. Check server connection.", 
            cameras: [] 
        });
    }
});

// Start the Node.js Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`🚀 CCTV Dashboard Backend is running!`);
    console.log(`📡 API Endpoint:   http://localhost:${PORT}/api/cameras`);
    console.log(`🖥️  Web Interface: http://localhost:${PORT}/`);
    console.log(`--------------------------------------------------`);
});