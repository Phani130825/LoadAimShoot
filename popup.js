let timer;
let totalTime = 25 * 60;
let timeLeft = totalTime;
let isActive = false;

const timerDisplay = document.getElementById("timerDisplay");
const statusText = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const habitSelect = document.getElementById("habitSelect");

document.addEventListener("DOMContentLoaded", () => {
    if (!chrome.storage) {
        console.error("Chrome storage API is not available");
        displayError("Extension storage is unavailable. Please try reloading the page.");
        return;
    }

    
    // Load all necessary data
    Promise.all([
        new Promise(resolve => chrome.storage.local.get("stats", resolve)),
        new Promise(resolve => chrome.storage.local.get("habits", resolve)),
        new Promise(resolve => chrome.storage.local.get("distractionData", resolve))
    ]).then(([statsData, habitsData, distractionData]) => {
        const stats = statsData.stats || {
            totalFocusTime: 0,
            distractionsPrevented: 0,
            streaks: 0
        };

        const habits = habitsData.habits || [];
        const distractions = distractionData.distractionData || {};

        renderStats(stats);
        loadHabits(); // Changed from renderHabits to loadHabits which is defined
        // Removed renderCharts as it's not needed in popup.js
    }).catch(error => {
        console.error("Error loading data:", error);
        displayError("Failed to load your data. Please try again later.");
    });

    // Check if focus mode is active
    chrome.storage.local.get(["isFocusModeActive", "currentHabit", "focusStartTime"], (data) => {
        isActive = data.isFocusModeActive || false;
        
        if (isActive) {
            // Focus mode is already active
            statusText.textContent = data.currentHabit ? 
                `${data.currentHabit.name} in progress...` : 
                "Focusing...";
            
            startBtn.disabled = true;
            stopBtn.disabled = false;
            
            // Calculate remaining time if it's a timed session
            if (data.focusStartTime) {
                const elapsedSeconds = Math.floor((Date.now() - data.focusStartTime) / 1000);
                timeLeft = Math.max(0, totalTime - elapsedSeconds);
                updateDisplay();
                
                // Start the timer to continue countdown
                if (timeLeft > 0) {
                    startTimer();
                }
            }
        } else {
            // Not active, reset UI
            statusText.textContent = "Ready";
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    });
});

function renderStats(data) {
    document.getElementById('todayFocus').textContent = data.focusMinutes || 0;
    document.getElementById('preventedCount').textContent = data.distractions || 0;
    document.getElementById('streakCount').textContent = data.streak || 0;
}
  
function displayError(message) {
    const status = document.getElementById('status');
    status.textContent = message || 'Error occurred';
    status.style.color = '#e53e3e';
    setTimeout(() => {
        status.textContent = 'Ready';
        status.style.color = '#4299e1';
    }, 3000);
}

function loadHabits() {
    chrome.storage.local.get("habits", ({ habits = [] }) => {
        // Clear existing options
        habitSelect.innerHTML = "";
        
        // Add default option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Pomodoro Focus (25m)";
        habitSelect.appendChild(defaultOption);
        
        // Add habits as options
        habits.forEach((habit, index) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = habit.name;
            habitSelect.appendChild(option);
        });
    });
}

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const seconds = (timeLeft % 60).toString().padStart(2, "0");
    timerDisplay.textContent = `${minutes}:${seconds}`;
}

function startTimer() {
    isActive = true;
    statusText.textContent = "Focusing...";
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    const selectedHabitIndex = habitSelect.value;
    
    if (selectedHabitIndex !== "") {
        chrome.storage.local.get("habits", ({ habits = [] }) => {
            const selectedHabit = habits[selectedHabitIndex];
            if (selectedHabit) {
                chrome.storage.local.set({ 
                    currentHabit: selectedHabit,
                    isFocusModeActive: true,
                    focusStartTime: Date.now()
                });
                
                statusText.textContent = `${selectedHabit.name} in progress...`;
                
                const [startHour, startMinute] = selectedHabit.start.split(":").map(Number);
                const [endHour, endMinute] = selectedHabit.end.split(":").map(Number);
                
                const startMinutes = startHour * 60 + startMinute;
                const endMinutes = endHour * 60 + endMinute;
                
                const durationMinutes = endMinutes < startMinutes ? 
                    (endMinutes + 24 * 60) - startMinutes : 
                    endMinutes - startMinutes;
                
                totalTime = durationMinutes * 60;
                timeLeft = totalTime;
                updateDisplay();
            }
        });
    } else {
        chrome.storage.local.set({ 
            isFocusModeActive: true,
            focusStartTime: Date.now(),
            currentHabit: null
        });
    }
    
    chrome.runtime.sendMessage({ action: "startFocusMode" });
    
    timer = setInterval(() => {
        timeLeft--;
        updateDisplay();
        if (timeLeft <= 0) {
            clearInterval(timer);
            chrome.runtime.sendMessage({ action: "endFocusMode" });
            statusText.textContent = "Break Time!";
            startBtn.disabled = false;
            stopBtn.disabled = true;
            isActive = false;
            
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icon.png",
                title: "Break Time!",
                message: "You've completed a focus session. Take a short break!",
            });
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
    timeLeft = totalTime;
    updateDisplay();
    statusText.textContent = "Stopped";
    startBtn.disabled = false;
    stopBtn.disabled = true;
    isActive = false;
    
    chrome.runtime.sendMessage({ action: "endFocusMode" });
    chrome.storage.local.set({ 
        isFocusModeActive: false,
        currentHabit: null
    });
}

startBtn.addEventListener("click", startTimer);
stopBtn.addEventListener("click", stopTimer);

document.getElementById("viewDashboard").onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
};

updateDisplay();