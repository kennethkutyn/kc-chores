const routineCheckboxCounters = {};

function appendRoutineItem(listId, activity, icon = '⭐️') {
    const routineList = document.getElementById(listId);
    if (!routineList || !activity) return;

    if (!routineCheckboxCounters[listId]) {
        routineCheckboxCounters[listId] = 0;
    }

    const checkboxId = `${listId}-checkbox-${routineCheckboxCounters[listId]++}`;
    const itemDiv = document.createElement('div');
    itemDiv.innerHTML = `
        <label class="routine-entry" for="${checkboxId}">
            <input type="checkbox" id="${checkboxId}">
            <span class="icon">${icon || '⭐️'}</span>
            <span class="activity">${activity}</span>
        </label>
    `;
    routineList.appendChild(itemDiv);

    const checkbox = itemDiv.querySelector('input[type="checkbox"]');
    if (checkbox) {
        checkbox.addEventListener('change', evaluateCompletion);
    }
}

function renderRoutine(listId, dataPath) {
    return fetch(dataPath)
        .then(response => response.json())
        .then(data => {
            const routineList = document.getElementById(listId);
            if (!routineList) return;

            data.morningRoutine.forEach(item => {
                appendRoutineItem(listId, item.activity, item.icon);
            });
        })
        .catch(error => {
            console.error(`Error loading routine from ${dataPath}:`, error);
            const routineList = document.getElementById(listId);
            if (routineList) {
                routineList.innerHTML = '<p>Error loading routine</p>';
            }

            throw error;
        });
}

const routinePromises = [
    renderRoutine('routine-list', 'morning-routine.json'),
    renderRoutine('routine-list-celeste', 'morning-routine Celeste.json')
];

Promise.allSettled(routinePromises).then(() => {
    evaluateCompletion();
});

setupAddItemButtons();

function setupAddItemButtons() {
    const buttons = document.querySelectorAll('.add-item-btn');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const listId = button.dataset.target;
            if (!listId) return;

            const newActivity = prompt('Enter a new routine item:');
            if (!newActivity) return;

            const trimmedActivity = newActivity.trim();
            if (!trimmedActivity) return;

            appendRoutineItem(listId, trimmedActivity, '⭐️');
            evaluateCompletion();
        });
    });
}

function evaluateCompletion() {
    const checkboxes = document.querySelectorAll('.routine-entry input[type="checkbox"]');
    if (!checkboxes.length) return;

    const allChecked = Array.from(checkboxes).every(box => box.checked);
    if (allChecked) {
        startFireworks();
    } else {
        stopFireworks();
    }
}

const fireworksCanvas = document.getElementById('fireworks-canvas');
const fireworksCtx = fireworksCanvas ? fireworksCanvas.getContext('2d') : null;
let fireworksParticles = [];
let fireworksAnimationId = null;
let fireworksActive = false;

function resizeFireworksCanvas() {
    if (!fireworksCanvas) return;
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
}

function createFireworkBurst() {
    if (!fireworksCanvas) return;

    const x = Math.random() * fireworksCanvas.width;
    const y = Math.random() * fireworksCanvas.height * 0.6;
    const color = `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;
    const particleCount = 30 + Math.floor(Math.random() * 20);

    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = Math.random() * 4 + 2;

        fireworksParticles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color,
            decay: Math.random() * 0.02 + 0.005
        });
    }
}

function animateFireworks() {
    if (!fireworksCtx || !fireworksActive) return;

    fireworksAnimationId = requestAnimationFrame(animateFireworks);
    fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);

    if (fireworksParticles.length < 200 && Math.random() < 0.2) {
        createFireworkBurst();
    }

    fireworksParticles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.02;
        particle.alpha -= particle.decay;
    });

    fireworksParticles = fireworksParticles.filter(p => p.alpha > 0);

    fireworksParticles.forEach(particle => {
        fireworksCtx.globalAlpha = Math.max(particle.alpha, 0);
        fireworksCtx.fillStyle = particle.color;
        fireworksCtx.beginPath();
        fireworksCtx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        fireworksCtx.fill();
    });

    fireworksCtx.globalAlpha = 1;
}

function startFireworks() {
    if (!fireworksCanvas || fireworksActive) return;
    fireworksActive = true;
    fireworksCanvas.classList.add('active');
    resizeFireworksCanvas();
    window.addEventListener('resize', resizeFireworksCanvas);
    fireworksParticles = [];
    animateFireworks();
}

function stopFireworks() {
    if (!fireworksCanvas) return;
    fireworksActive = false;
    fireworksCanvas.classList.remove('active');
    window.removeEventListener('resize', resizeFireworksCanvas);

    if (fireworksAnimationId) {
        cancelAnimationFrame(fireworksAnimationId);
        fireworksAnimationId = null;
    }

    if (fireworksCtx) {
        fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    }

    fireworksParticles = [];
}

// Keep screen awake on iPad
let wakeLock = null;
const statusDiv = document.getElementById('wake-status');

function updateStatus(message) {
    console.log(message);
    if (statusDiv) {
        statusDiv.innerHTML += message + '<br>';
    }
}

async function initKeepAwake() {
    const video = document.getElementById('keep-awake-video');

    updateStatus('Initializing keep-awake...');

    // Try Wake Lock API first (most reliable for modern browsers)
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            updateStatus('✓ Wake Lock API active');

            wakeLock.addEventListener('release', () => {
                updateStatus('Wake Lock released');
            });

            // Re-acquire wake lock when page becomes visible
            document.addEventListener('visibilitychange', async () => {
                if (wakeLock !== null && document.visibilityState === 'visible') {
                    try {
                        wakeLock = await navigator.wakeLock.request('screen');
                        updateStatus('✓ Wake Lock re-acquired');
                    } catch (err) {
                        updateStatus('✗ Wake Lock re-acquire failed: ' + err.message);
                    }
                }
            });
        } catch (err) {
            updateStatus('✗ Wake Lock API failed: ' + err.message);
        }
    } else {
        updateStatus('✗ Wake Lock API not supported');
    }

    // Also try video approach as backup
    updateStatus('Trying video approach...');

    // Create a silent video using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;

    const ctx = canvas.getContext('2d');

    // Draw something that changes to keep it "active"
    let frame = 0;
    function drawFrame() {
        ctx.fillStyle = frame % 2 === 0 ? 'black' : '#010101';
        ctx.fillRect(0, 0, 100, 100);
        frame++;
        requestAnimationFrame(drawFrame);
    }
    drawFrame();

    // Create a video stream from the canvas
    const stream = canvas.captureStream(25);
    video.srcObject = stream;

    // Try to play the video
    try {
        await video.play();
        updateStatus('✓ Video is playing');
        updateStatus('Video paused: ' + video.paused);
        updateStatus('Video muted: ' + video.muted);
    } catch (err) {
        updateStatus('✗ Video autoplay failed: ' + err.message);
        updateStatus('Touch screen to enable video');

        // If autoplay fails, try again on user interaction
        document.addEventListener('touchstart', async () => {
            try {
                await video.play();
                updateStatus('✓ Video playing after touch');
            } catch (e) {
                updateStatus('✗ Still could not play: ' + e.message);
            }
        }, { once: true });
    }

    // Monitor video status
    setInterval(() => {
        if (video.paused) {
            updateStatus('⚠ Video paused, trying to resume...');
            video.play().catch(e => updateStatus('✗ Resume failed: ' + e.message));
        }
    }, 5000);
}

// Initialize keep awake functionality
initKeepAwake();
