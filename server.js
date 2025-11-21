const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ==================================================================
// 🔧 CONFIGURATION
// ==================================================================

// 1. YOUR VPS IP (For Playback URLs)
//    Use the Public IP (what you see when you run `curl ifconfig.me`)
const VPS_PUBLIC_IP = '10.186.145.89'; 

// 2. API SETTINGS (Internal)
//    Since this script runs ON the VPS, we use localhost for the API call.
const API_URL = 'http://127.0.0.1:9997/v3/paths/list';
const API_USER = 'sri';
const API_PASS = 'sri';

// 3. PLAYBACK BASE URL
const HLS_BASE = `http://${VPS_PUBLIC_IP}:8888`;

// ==================================================================

app.get('/api/cameras', async (req, res) => {
    try {
        const config = {
            timeout: 3000,
            auth: { username: API_USER, password: API_PASS }
        };

        const response = await axios.get(API_URL, config);
        const items = response.data.items || [];

        console.log(`API Check: Found ${items.length} total paths.`);

        const activeCameras = items.map(item => {
            // Debug log for every item found
            console.log(` - Path: ${item.name} | Ready: ${item.ready} | Bytes: ${item.bytesReceived}`);
            
            // We return ALL items that have bytes received, even if "ready" flag flakiness occurs
            if (!item.ready && item.bytesReceived === 0) return null;

            return {
                name: item.name,
                url: `${HLS_BASE}/${item.name}/index.m3u8`
            };
        }).filter(Boolean); // Remove nulls

        res.json({ success: true, cameras: activeCameras });

    } catch (error) {
        console.error("Error:", error.message);
        res.json({ success: false, cameras: [] });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});