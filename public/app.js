const grid = document.getElementById('cctv-grid');
const countLabel = document.getElementById('camera-count');
const loading = document.getElementById('loading');

// Store active HLS instances to clean them up properly
const activeHlsPlayers = {}; 

async function fetchCameras() {
    try {
        const res = await fetch('/api/cameras');
        const data = await res.json();

        if (data.success) {
            updateGrid(data.cameras);
            loading.classList.add('hidden');
        }
    } catch (e) {
        console.error("Connection lost to command center", e);
    }
}

function updateGrid(cameras) {
    countLabel.innerText = `${cameras.length} Active Feeds`;

    // 1. Detect active IDs
    const activeIds = cameras.map(c => c.name);

    // 2. Remove offline cameras from DOM
    document.querySelectorAll('.camera-card').forEach(card => {
        const id = card.getAttribute('data-id');
        if (!activeIds.includes(id)) {
            // Destroy HLS instance if it exists
            if (activeHlsPlayers[id]) {
                activeHlsPlayers[id].destroy();
                delete activeHlsPlayers[id];
            }
            card.remove();
        }
    });

    // 3. Add new cameras
    cameras.forEach(cam => {
        // If card doesn't exist, create it
        if (!document.querySelector(`.camera-card[data-id="${cam.name}"]`)) {
            createCameraCard(cam);
        }
    });
}

function createCameraCard(cam) {
    const card = document.createElement('div');
    card.className = 'camera-card';
    card.setAttribute('data-id', cam.name);

    card.innerHTML = `
        <div class="cam-label">${cam.name.toUpperCase()}</div>
        <div class="live-badge">LIVE</div>
        <video id="vid-${cam.name}" autoplay muted controls></video>
    `;

    grid.appendChild(card);

    // Initialize HLS Player for this specific camera
    const video = document.getElementById(`vid-${cam.name}`);
    
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(cam.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(e => console.log("Autoplay blocked:", e));
        });
        // Store reference to destroy later
        activeHlsPlayers[cam.name] = hls;
    } 
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native Safari support
        video.src = cam.url;
        video.addEventListener('loadedmetadata', () => {
            video.play();
        });
    }
}

// Auto-refresh every 5 seconds to check for new cars
setInterval(fetchCameras, 5000);
fetchCameras();