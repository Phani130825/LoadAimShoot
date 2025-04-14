// Make sure the script runs after DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check if we're in a Chrome extension environment
  const isExtensionEnvironment = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  
  // Check if we're on the dashboard page
  const isDashboardPage = document.getElementById("habit-form") && document.getElementById("habits-list");
  
  // Create a storage API that works in both Chrome extension and regular browser environments
  const storage = {
    get: function(key, callback) {
      if (isExtensionEnvironment) {
        chrome.storage.local.get(key, callback);
      } else {
        try {
          const data = {};
          if (typeof key === 'string') {
            data[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } else if (Array.isArray(key)) {
            key.forEach(k => {
              data[k] = JSON.parse(localStorage.getItem(k) || 'null');
            });
          } else {
            Object.keys(key).forEach(k => {
              data[k] = JSON.parse(localStorage.getItem(k) || 'null');
            });
          }
          setTimeout(() => callback(data), 0);
        } catch (error) {
          console.error("Storage error:", error);
          setTimeout(() => callback({}), 0);
        }
      }
    },
    set: function(items, callback) {
      if (isExtensionEnvironment) {
        chrome.storage.local.set(items, callback);
      } else {
        // Fallback to localStorage for browser testing
        try {
          Object.keys(items).forEach(key => {
            localStorage.setItem(key, JSON.stringify(items[key]));
          });
          if (callback) setTimeout(callback, 0);
        } catch (error) {
          console.error("Storage error:", error);
          if (callback) setTimeout(callback, 0);
        }
      }
    }
  };
  
  // Only initialize dashboard if we're on the dashboard page
  if (isDashboardPage) {
    console.log("Dashboard page detected, initializing...");
    initializeDashboard(storage);
  } else {
    console.log("Not on dashboard page, skipping dashboard initialization");
  }
});

// Declare form submit handler at global scope so it can be referenced consistently
let currentFormSubmitHandler;

function initializeDashboard(storage) {
  const habitForm = document.getElementById("habit-form");
  const habitsList = document.getElementById("habits-list");
  const statsElements = {
    totalFocusTime: document.getElementById("totalFocusTime"),
    distractionsPrevented: document.getElementById("distractionsPrevented"),
    streaks: document.getElementById("streaks")
  };
  
  // Load all necessary data
  Promise.all([
    new Promise(resolve => storage.get("stats", resolve)),
    new Promise(resolve => storage.get("habits", resolve)),
    new Promise(resolve => storage.get("distractionData", resolve))
  ]).then(([statsData, habitsData, distractionData]) => {
    const stats = statsData.stats || {
      totalFocusTime: 0,
      distractionsPrevented: 0,
      streaks: 0
    };
    
    habitForm.addEventListener("submit", currentFormSubmitHandler);
  
    // ADD THIS LINE to set up storage change listener
    setupStorageChangeListener(storage);
    const habits = habitsData.habits || [];
    const distractions = distractionData.distractionData || {};
    
    renderStats(stats, statsElements);
    renderHabits(habits, habitsList, storage);
    
    // Only render charts if Chart.js is available and elements exist
    const focusCanvas = document.getElementById("focusChart");
    const distractionCanvas = document.getElementById("distractionsChart");
    
    if (window.Chart && focusCanvas && distractionCanvas) {
      renderCharts(stats, distractions);
    } else if (!window.Chart) {
      console.error("Chart.js is not available");
    } else {
      console.error("Chart canvas elements missing");
    }
  }).catch(error => {
    console.error("Error loading data:", error);
  });

  // Define the default form submit handler
  currentFormSubmitHandler = (e) => {
    e.preventDefault();
    
    const habitName = document.getElementById("habit-name").value;
    const habitStart = document.getElementById("habit-start").value;
    const habitEnd = document.getElementById("habit-end").value;
    
    if (habitName && habitStart && habitEnd) {
      addNewHabit(habitName, habitStart, habitEnd, storage);
      
      // Reset form
      e.target.reset();
    } else {
      console.error("Please fill in all habit fields");
    }
  };
  
  // Set up habit form submission with the tracked handler
  habitForm.addEventListener("submit", currentFormSubmitHandler);
}

function setupStorageChangeListener(storage) {
  // Only set up the listener if we're in the extension environment
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        // Check if stats or distractionData changed
        if (changes.stats || changes.distractionData) {
          console.log("Storage changed, updating dashboard...");
          
          // Get the updated data
          Promise.all([
            new Promise(resolve => storage.get("stats", resolve)),
            new Promise(resolve => storage.get("distractionData", resolve))
          ]).then(([statsData, distractionData]) => {
            const stats = statsData.stats || {
              totalFocusTime: 0,
              distractionsPrevented: 0,
              streaks: 0
            };
            
            const distractions = distractionData.distractionData || {};
            
            // Update the UI with new data
            const statsElements = {
              totalFocusTime: document.getElementById("totalFocusTime"),
              distractionsPrevented: document.getElementById("distractionsPrevented"),
              streaks: document.getElementById("streaks")
            };
            
            renderStats(stats, statsElements);
            
            // Only render charts if Chart.js is available and elements exist
            const focusCanvas = document.getElementById("focusChart");
            const distractionCanvas = document.getElementById("distractionsChart");
            
            if (window.Chart && focusCanvas && distractionCanvas) {
              renderCharts(stats, distractions);
            }
          }).catch(error => {
            console.error("Error updating dashboard after storage change:", error);
          });
        }
      }
    });
  }
}


function renderStats(stats, elements) {
  // Safely update stats elements if they exist
  if (elements.totalFocusTime) {
    elements.totalFocusTime.textContent = `${stats.totalFocusTime} minutes`;
  }
  
  if (elements.distractionsPrevented) {
    elements.distractionsPrevented.textContent = stats.distractionsPrevented;
  }
  
  if (elements.streaks) {
    elements.streaks.textContent = `${stats.streaks} days`;
  }
}

function renderHabits(habits, habitsList, storage) {
  // Make sure habitsList exists
  if (!habitsList) {
    console.error("Habits list element not found");
    return;
  }
  
  habitsList.innerHTML = "";
  
  if (habits.length === 0) {
    habitsList.innerHTML = "<p>No habits defined yet. Add your first focus habit below!</p>";
    return;
  }
  
  habits.forEach((habit, index) => {
    const habitElement = document.createElement("div");
    habitElement.className = "habit-item";
    habitElement.innerHTML = `
      <div class="habit-info">
        <h3>${habit.name}</h3>
        <div class="habit-time">${formatTime(habit.start)} - ${formatTime(habit.end)}</div>
      </div>
      <div class="habit-controls">
        <button class="edit-habit" data-index="${index}">✏️</button>
        <button class="delete-habit" data-index="${index}">🗑️</button>
      </div>
    `;
    habitsList.appendChild(habitElement);
  });
  
  // Add event listeners for edit and delete buttons
  document.querySelectorAll(".delete-habit").forEach(button => {
    button.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      deleteHabit(index, storage);
    });
  });
  
  document.querySelectorAll(".edit-habit").forEach(button => {
    button.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      editHabit(habits[index], index, storage);
    });
  });
}

function formatTime(timeString) {
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function addNewHabit(name, start, end, storage) {
  storage.get("habits", ({ habits = [] }) => {
    const updatedHabits = [...habits, { name, start, end }];
    storage.set({ habits: updatedHabits }, () => {
      const habitsList = document.getElementById("habits-list");
      if (habitsList) {
        renderHabits(updatedHabits, habitsList, storage);
      }
    });
  });
}

function deleteHabit(index, storage) {
  storage.get("habits", ({ habits = [] }) => {
    const updatedHabits = habits.filter((_, i) => i !== index);
    storage.set({ habits: updatedHabits }, () => {
      const habitsList = document.getElementById("habits-list");
      if (habitsList) {
        renderHabits(updatedHabits, habitsList, storage);
      }
    });
  });
}

function editHabit(habit, index, storage) {
  // Get required elements
  const habitNameInput = document.getElementById("habit-name");
  const habitStartInput = document.getElementById("habit-start");
  const habitEndInput = document.getElementById("habit-end");
  const form = document.getElementById("habit-form");
  
  // Check if elements exist
  if (!habitNameInput || !habitStartInput || !habitEndInput || !form) {
    console.error("Form elements not found");
    return;
  }
  
  // Populate form with habit data
  habitNameInput.value = habit.name;
  habitStartInput.value = habit.start;
  habitEndInput.value = habit.end;
  
  // Remove current submit handler
  form.removeEventListener("submit", currentFormSubmitHandler);
  
  // Create new edit handler
  const editSubmitHandler = (e) => {
    e.preventDefault();
    
    const habitName = habitNameInput.value;
    const habitStart = habitStartInput.value;
    const habitEnd = habitEndInput.value;
    
    if (!habitName || !habitStart || !habitEnd) {
      console.error("Please fill in all habit fields");
      return;
    }
    
    storage.get("habits", ({ habits = [] }) => {
      habits[index] = { name: habitName, start: habitStart, end: habitEnd };
      storage.set({ habits }, () => {
        const habitsList = document.getElementById("habits-list");
        if (habitsList) {
          renderHabits(habits, habitsList, storage);
        }
        form.reset();
        
        // Clean up: remove edit handler and restore original handler
        form.removeEventListener("submit", editSubmitHandler);
        
        // Create a new default handler and update the reference
        currentFormSubmitHandler = (e) => {
          e.preventDefault();
          
          const habitName = document.getElementById("habit-name").value;
          const habitStart = document.getElementById("habit-start").value;
          const habitEnd = document.getElementById("habit-end").value;
          
          if (habitName && habitStart && habitEnd) {
            addNewHabit(habitName, habitStart, habitEnd, storage);
            
            // Reset form
            e.target.reset();
          } else {
            console.error("Please fill in all habit fields");
          }
        };
        
        // Add the new default handler
        form.addEventListener("submit", currentFormSubmitHandler);
      });
    });
  };
  
  // Update current form handler reference
  currentFormSubmitHandler = editSubmitHandler;
  
  // Add the new edit handler
  form.addEventListener("submit", currentFormSubmitHandler);
}

let focusChartInstance = null;
let distractionsChartInstance = null;

function renderCharts(stats, distractions) {
  const focusCanvas = document.getElementById("focusChart");
  const distractionCanvas = document.getElementById("distractionsChart");
  
  if (!focusCanvas || !distractionCanvas) {
    console.error("Chart canvas elements not found");
    return;
  }

  if (!window.Chart) {
    console.error("Chart.js is not available");
    return;
  }

  if (focusChartInstance) focusChartInstance.destroy();
  if (distractionsChartInstance) distractionsChartInstance.destroy();

  const focusCtx = focusCanvas.getContext("2d");
  const distractionsCtx = distractionCanvas.getContext("2d");

  focusChartInstance = new Chart(focusCtx, {
    type: "bar",
    data: {
      labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      datasets: [{
        label: "Focus Minutes",
        data: generateWeeklyData(stats.totalFocusTime),
        backgroundColor: "#4299e1"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Minutes"
          }
        }
      }
    }
  });

  distractionsChartInstance = new Chart(distractionsCtx, {
    type: "pie",
    data: {
      labels: Object.keys(distractions).length > 0 
        ? Object.keys(distractions) 
        : ["youtube.com", "facebook.com", "twitter.com", "instagram.com", "reddit.com"],
      datasets: [{
        data: Object.values(distractions).length > 0
          ? Object.values(distractions)
          : [8, 5, 7, 9, 12],
        backgroundColor: [
          "#f56565", "#ed8936", "#ecc94b", "#48bb78", "#4299e1", "#9f7aea", "#ed64a6"
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "right"
        }
      }
    }
  });
}

// Helper function to generate example weekly data
function generateWeeklyData(totalTime) {
  const today = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
  const data = [0, 0, 0, 0, 0, 0, 0];
  
  // Distribute total time across past days of the week
  let remainingTime = totalTime;
  for (let i = 0; i < 7; i++) {
    // Start from today and go backwards
    const dayIndex = (today - i + 7) % 7;
    if (remainingTime <= 0) break;
    
    // For demo purposes, generate some reasonable daily totals
    const dailyTime = Math.min(remainingTime, Math.round(Math.random() * 60) + 30);
    data[dayIndex] = dailyTime;
    remainingTime -= dailyTime;
  }
  
  // Reorder array to start with Monday
  const mondayFirst = [...data.slice(1), data[0]];
  return mondayFirst;
}