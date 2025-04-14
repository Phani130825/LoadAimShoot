// Handles storage initialization and common storage operations

// Initialize storage with default values
export function initStorage() {
    chrome.storage.local.set({
      stats: {
        totalFocusTime: 0,
        distractionsPrevented: 0,
        streaks: 0,
        focusMinutes: 0,
        distractions: 0,
        streak: 0
      },
      habits: [],
      distractionData: {},
      isFocusModeActive: false,
      currentHabit: null,
      blockedSites: [
        "facebook.com",
        "twitter.com",
        "instagram.com",
        "reddit.com",
        "youtube.com",
        "netflix.com",
        "tiktok.com"
      ],
      // Timer related settings
      timerActive: false,
      timeLeft: 25 * 60,
      totalTime: 25 * 60,
      focusStartTime: null
    });
  }
  
  // Helper function to display errors
  export function displayError(message) {
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