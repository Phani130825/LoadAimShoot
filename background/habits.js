// Handles habits management and related alarms

import { formatTime } from './ui.js';
import { displayError } from './storage.js';

export function addNewHabit(name, start, end) {
  if (!chrome.storage) {
    console.error("Chrome storage API is not available");
    displayError("Cannot save habit: storage unavailable");
    return;
  }
  
  chrome.storage.local.get("habits", ({ habits = [] }) => {
    const updatedHabits = [...habits, { name, start, end }];
    chrome.storage.local.set({ habits: updatedHabits }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving habit:", chrome.runtime.lastError);
        displayError("Failed to save habit");
        return;
      }
      renderHabits(updatedHabits);
      setupHabitAlarms();
    });
  });
}

export function deleteHabit(index) {
  if (!chrome.storage) {
    console.error("Chrome storage API is not available");
    displayError("Cannot delete habit: storage unavailable");
    return;
  }
  
  chrome.storage.local.get("habits", ({ habits = [] }) => {
    const updatedHabits = habits.filter((_, i) => i !== index);
    chrome.storage.local.set({ habits: updatedHabits }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error deleting habit:", chrome.runtime.lastError);
        displayError("Failed to delete habit");
        return;
      }
      renderHabits(updatedHabits);
      setupHabitAlarms();
    });
  });
}

export function editHabit(habit, index) {
  try {
    // Populate form with habit data
    document.getElementById("habit-name").value = habit.name;
    document.getElementById("habit-start").value = habit.start;
    document.getElementById("habit-end").value = habit.end;
    
    // Change form submission behavior temporarily
    const form = document.getElementById("habit-form");
    const originalSubmitHandler = form.onsubmit;
    
    form.onsubmit = (e) => {
      e.preventDefault();
      
      const habitName = document.getElementById("habit-name").value;
      const habitStart = document.getElementById("habit-start").value;
      const habitEnd = document.getElementById("habit-end").value;
      
      if (!habitName || !habitStart || !habitEnd) {
        displayError("Please fill in all habit fields");
        return;
      }
      
      if (!chrome.storage) {
        console.error("Chrome storage API is not available");
        displayError("Cannot update habit: storage unavailable");
        return;
      }
      
      chrome.storage.local.get("habits", ({ habits = [] }) => {
        habits[index] = { name: habitName, start: habitStart, end: habitEnd };
        chrome.storage.local.set({ habits }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error updating habit:", chrome.runtime.lastError);
            displayError("Failed to update habit");
            return;
          }
          renderHabits(habits);
          form.reset();
          form.onsubmit = originalSubmitHandler;
          setupHabitAlarms();
        });
      });
    };
  } catch (error) {
    console.error("Error setting up habit edit:", error);
    displayError("Failed to edit habit");
  }
}

export function setupHabitAlarms() {
  if (!chrome.alarms) {
    console.error("Alarms API is unavailable");
    return;
  }
  
  chrome.storage.local.get("habits", ({ habits = [] }) => {
    // Clear existing habit alarms
    chrome.alarms.getAll((alarms) => {
      alarms.forEach(alarm => {
        if (alarm.name.startsWith("habit-")) {
          chrome.alarms.clear(alarm.name);
        }
      });
      
      // Create new alarms for each habit
      habits.forEach((habit, index) => {
        try {
          const [startHours, startMinutes] = habit.start.split(":").map(Number);
          const [endHours, endMinutes] = habit.end.split(":").map(Number);
          
          // Setup daily alarms
          const now = new Date();
          const startTime = new Date(now);
          startTime.setHours(startHours, startMinutes, 0);
          
          const endTime = new Date(now);
          endTime.setHours(endHours, endMinutes, 0);
          
          // Create alarms
          chrome.alarms.create(`habit-start-${index}`, {
            when: startTime.getTime(),
            periodInMinutes: 60 * 24 // Daily
          });
          
          chrome.alarms.create(`habit-end-${index}`, {
            when: endTime.getTime(),
            periodInMinutes: 60 * 24 // Daily
          });
        } catch (error) {
          console.error(`Error setting up alarm for habit ${habit.name}:`, error);
        }
      });
    });
  });
}

function renderHabits(habits) {
  try {
    const habitsList = document.getElementById("habits-list");
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
        deleteHabit(index);
      });
    });
    
    document.querySelectorAll(".edit-habit").forEach(button => {
      button.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        editHabit(habits[index], index);
      });
    });
  } catch (error) {
    console.error("Error rendering habits:", error);
    displayError("Failed to display habits list");
  }
}