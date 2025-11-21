const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// CONFIGURATION
const MEDIAMTX_API = 'http://127.0.0.1:9997/v3/paths/list'; // Local access to MediaMTX API
const STREAM_BASE_URL = 'http://YOUR_PUBLIC_IP:8888'; // <--- REPLACE THIS WITH YOUR VPS PUBLIC IP

// API: Get list of active cameras
app.get('/api/cameras', async (req, res) => {
    try {
        // Ask MediaMTX what is currently streaming
        const response = await axios.get(MEDIAMTX_API);
        const paths = response.data.items;

        // Filter for paths that have active publishers (actual cameras pushing data)
        const activeCameras = paths
            .filter(item => item.ready) // Only ready streams
            .map(item => ({
                name: item.name, // e.g., "live/testcar"
                // Construct the HLS URL for the frontend
                url: `${STREAM_BASE_URL}/${item.name}/index.m3u8`
            }));

        res.json({ success: true, cameras: activeCameras });
    } catch (error) {
        console.error("Error fetching from MediaMTX:", error.message);
        res.json({ success: false, cameras: [] });
    }
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`CCTV Dashboard running at http://localhost:${PORT}`);
});