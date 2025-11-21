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
const VPS_IP = '13.235.XX.XX'; 

// 2. MEDIA MTX CREDENTIALS (Required for 401 Fix)
//    Check your mediamtx.yml file for these.
//    If you haven't set them, try 'admin' and your password, or check the 'authInternalUsers' section.
const API_USER = '';  // Leave empty if no user
const API_PASS = '';  // Leave empty if no pass

// 3. API URL (Port 9997)
const MEDIAMTX_API_URL = `http://${VPS_IP}:9997/v3/paths/list`;

// 4. HLS Playback Base URL (Port 8888)
const HLS_PUBLIC_BASE = `http://${VPS_IP}:8888`;

// ==================================================================

// --- API ENDPOINT ---
app.get('/api/cameras', async (req, res) => {
    try {
        console.log(`🔍 Fetching camera list from: ${MEDIAMTX_API_URL}`);
        
        // Prepare Auth Config
        let axiosConfig = { timeout: 3000 };
        if (API_USER && API_PASS) {
            axiosConfig.auth = {
                username: API_USER,
                password: API_PASS
            };
        }

        // Fetch list of paths from MediaMTX API with Auth
        const response = await axios.get(MEDIAMTX_API_URL, axiosConfig);
        const items = response.data.items || [];

        // Filter and format the list
        const activeCameras = items
            .filter(item => item.ready) // Only include streams that are actually sending video
            .map(item => ({
                name: item.name, // e.g., "live/testcar"
                
                // Construct the full HLS URL
                url: `${HLS_PUBLIC_BASE}/${item.name}/index.m3u8`
            }));

        console.log(`✅ Success: Found ${activeCameras.length} active cameras.`);
        res.json({ success: true, cameras: activeCameras });

    } catch (error) {
        // Error Handling
        console.error("❌ Connection Error:", error.message);
        
        if (error.response && error.response.status === 401) {
            console.error("   -> CRITICAL: 401 Unauthorized.");
            console.error("   -> ACTION: You must set API_USER and API_PASS in server.js.");
            console.error("   -> HINT: Check 'mediamtx.yml' for 'authInternalUsers'.");
        } else if (error.code === 'ECONNREFUSED') {
            console.error("   -> CRITICAL: Cannot connect to Port 9997.");
            console.error("   -> CHECK: Is Port 9997 open in your VPS Firewall?");
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