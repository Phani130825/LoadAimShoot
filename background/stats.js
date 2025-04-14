// Handles statistics and data cleaning functionality

export function cleanupOldData() {
    if (!chrome.storage) {
      console.error("Storage API is unavailable for cleanup");
      return;
    }
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    chrome.storage.local.get(["distractionData", "focusHistory"], (data) => {
      if (chrome.runtime.lastError) {
        console.error("Error accessing storage for cleanup:", chrome.runtime.lastError);
        return;
      }
      
      // Clean up old distraction data
      const distractionData = data.distractionData || {};
      // Keep track of only recent distractions
      
      // Clean up old focus history
      const focusHistory = data.focusHistory || [];
      const updatedFocusHistory = focusHistory.filter(entry => entry.timestamp > thirtyDaysAgo);
      
      // Save cleaned data
      chrome.storage.local.set({
        focusHistory: updatedFocusHistory
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving cleaned data:", chrome.runtime.lastError);
        }
      });
    });
  }
  
  export function updateFocusStats(focusDuration) {
    chrome.storage.local.get(["stats"], ({ stats = {} }) => {
      stats.totalFocusTime = (stats.totalFocusTime || 0) + focusDuration;
      stats.focusMinutes = (stats.focusMinutes || 0) + focusDuration;
      
      chrome.storage.local.set({ stats });
    });
  }
  
  // Function to generate example weekly data for charts
  export function generateWeeklyData(totalTime) {
    try {
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
    } catch (error) {
      console.error("Error generating weekly data:", error);
      return [0, 0, 0, 0, 0, 0, 0]; // Return empty data on error
    }
  }