// Time offset tracking
let timeOffset = 0; // milliseconds to offset from real time
let routineData = null; // store routine data for highlighting

// Update clock every second
function updateClock() {
    const now = new Date(Date.now() + timeOffset);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds}`;

    // Update highlight
    highlightCurrentActivity();

    // Update trivia answer visibility
    updateTriviaAnswer();
}

// Convert time string (e.g., "7:05 AM") to minutes since midnight
function timeToMinutes(timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

// Highlight the current activity based on time
function highlightCurrentActivity() {
    if (!routineData) return;

    const now = new Date(Date.now() + timeOffset);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const items = document.querySelectorAll('#routine-list > div');

    // Find which activity we're currently in
    let activeIndex = -1;
    for (let i = 0; i < routineData.morningRoutine.length; i++) {
        const itemMinutes = timeToMinutes(routineData.morningRoutine[i].time);
        const nextItemMinutes = i < routineData.morningRoutine.length - 1
            ? timeToMinutes(routineData.morningRoutine[i + 1].time)
            : 24 * 60; // End of day

        if (currentMinutes >= itemMinutes && currentMinutes < nextItemMinutes) {
            activeIndex = i;
            break;
        }
    }

    // Update highlighting and completion status
    items.forEach((item, index) => {
        const nextItemMinutes = index < routineData.morningRoutine.length - 1
            ? timeToMinutes(routineData.morningRoutine[index + 1].time)
            : 24 * 60;

        const isPast = currentMinutes >= nextItemMinutes;
        const isCurrent = index === activeIndex;

        const paragraph = item.querySelector('p');

        // Remove all state classes
        item.classList.remove('current', 'completed', 'future');

        if (isCurrent) {
            // Current activity - highlight
            item.classList.add('current');

            // Remove checkmark if present
            if (paragraph && paragraph.textContent.includes('✓')) {
                paragraph.innerHTML = paragraph.innerHTML.replace('✓ ', '');
            }
        } else if (isPast) {
            // Past activity - grey out and add checkmark
            item.classList.add('completed');

            // Add checkmark if not already present
            if (paragraph && !paragraph.textContent.includes('✓')) {
                paragraph.innerHTML = '✓ ' + paragraph.innerHTML;
            }
        } else {
            // Future activity - normal
            item.classList.add('future');

            // Remove checkmark if present
            if (paragraph && paragraph.textContent.includes('✓')) {
                paragraph.innerHTML = paragraph.innerHTML.replace('✓ ', '');
            }
        }
    });
}

// Set custom time
function setCustomTime() {
    const input = document.getElementById('time-input').value;
    const match = input.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);

    if (match) {
        const [, hours, minutes, seconds] = match;
        const customTime = new Date();
        customTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);

        const realTime = new Date();
        timeOffset = customTime - realTime;

        updateClock();
    }
}

// Fetch joke of the day
function fetchJoke() {
    fetch('https://icanhazdadjoke.com/', {
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('joke-text').textContent = data.joke;
    })
    .catch(error => {
        console.error('Error fetching joke:', error);
        document.getElementById('joke-text').textContent = 'Could not load joke. Try again later!';
    });
}

// Fetch trivia question
let triviaAnswer = '';

function fetchTrivia() {
    fetch('https://opentdb.com/api.php?amount=1&category=9&difficulty=easy')
    .then(response => response.json())
    .then(data => {
        if (data.results && data.results.length > 0) {
            const question = data.results[0];
            // Decode HTML entities
            const parser = new DOMParser();
            const decodedQuestion = parser.parseFromString(question.question, 'text/html').body.textContent;
            const decodedAnswer = parser.parseFromString(question.correct_answer, 'text/html').body.textContent;

            document.getElementById('trivia-question').textContent = decodedQuestion;
            triviaAnswer = decodedAnswer;

            // Check if we should show the answer
            updateTriviaAnswer();
        }
    })
    .catch(error => {
        console.error('Error fetching trivia:', error);
        document.getElementById('trivia-question').textContent = 'Could not load trivia. Try again later!';
    });
}

// Update trivia answer visibility based on time
function updateTriviaAnswer() {
    const now = new Date(Date.now() + timeOffset);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const showAnswerTime = 7 * 60 + 20; // 7:20 AM

    const answerElement = document.getElementById('trivia-answer');
    if (currentMinutes >= showAnswerTime && triviaAnswer) {
        answerElement.textContent = `Answer: ${triviaAnswer}`;
        answerElement.style.display = 'block';
    } else {
        answerElement.style.display = 'none';
    }
}

// Start the clock
updateClock();
setInterval(updateClock, 1000);

// Fetch joke and trivia on load
fetchJoke();
fetchTrivia();

// Fetch and display the morning routine
fetch('morning-routine.json')
    .then(response => response.json())
    .then(data => {
        routineData = data; // Store for highlighting
        const routineList = document.getElementById('routine-list');

        data.morningRoutine.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.innerHTML = `
                <p>
                    <strong>${item.time}</strong>
                    <span class="icon">${item.icon}</span>
                    ${item.activity}
                </p>
            `;
            routineList.appendChild(itemDiv);
        });

        // Initial highlight
        highlightCurrentActivity();
    })
    .catch(error => {
        console.error('Error loading routine:', error);
        document.getElementById('routine-list').innerHTML = '<p>Error loading routine</p>';
    });

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
