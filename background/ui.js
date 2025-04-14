// Handles UI rendering functions

export function renderStats(stats) {
    try {
      document.getElementById("totalFocusTime").textContent = `${stats.totalFocusTime} minutes`;
      document.getElementById("distractionsPrevented").textContent = stats.distractionsPrevented;
      document.getElementById("streaks").textContent = `${stats.streaks} days`;
    } catch (error) {
      console.error("Error rendering stats:", error);
    }
  }
  
  export function renderHabits(habits) {
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
  
  export function formatTime(timeString) {
    try {
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeString; // Return original string if formatting fails
    }
  }
  
  function displayError(message) {
    try {
      const errorContainer = document.getElementById("error-container");
      if (!errorContainer) {
        // Create error container if it doesn't exist
        const newErrorContainer = document.createElement("div");
        newErrorContainer.id = "error-container";
        newErrorContainer.style.cssText = "background-color: #fed7d7; color: #c53030; padding: 12px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #c53030;";
        document.body.insertBefore(newErrorContainer, document.body.firstChild);
        
        // Show error
        newErrorContainer.textContent = message;
        
        // Auto hide after 5 seconds
        setTimeout(() => {
          newErrorContainer.style.display = "none";
        }, 5000);
      } else {
        // Use existing error container
        errorContainer.textContent = message;
        errorContainer.style.display = "block";
        
        // Auto hide after 5 seconds
        setTimeout(() => {
          errorContainer.style.display = "none";
        }, 5000);
      }
    } catch (error) {
      // If even displaying the error fails, log to console
      console.error("Failed to display error message:", error);
      console.error("Original error:", message);
    }
  }