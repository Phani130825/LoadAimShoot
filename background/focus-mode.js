// Handles focus mode and website blocking functionality
import { updateFocusStats } from './stats.js';

// Function to update your blocking rules based on user settings
export async function updateBlockingRules() {
  try {
    const data = await chrome.storage.local.get(["isFocusModeActive"]);
    
    // Enable or disable the ruleset based on focus mode
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: data.isFocusModeActive ? ["ruleset_1"] : [],
      disableRulesetIds: data.isFocusModeActive ? [] : ["ruleset_1"]
    });
    
    console.log(`Blocking rules ${data.isFocusModeActive ? "enabled" : "disabled"}`);
  } catch (error) {
    console.error("Error updating blocking rules:", error);
  }
}

// Update distraction stats when blocked page is shown
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.url.startsWith(chrome.runtime.getURL("blocked.html"))) {
    // Get the referring URL (the site that was blocked)
    const tabInfo = await chrome.tabs.get(details.tabId);
    const referrer = new URL(tabInfo.url).hostname.replace('www.', '');
    
    // Update stats
    const data = await chrome.storage.local.get(["distractionData", "stats"]);
    const distractionData = data.distractionData || {};
    distractionData[referrer] = (distractionData[referrer] || 0) + 1;
    
    const stats = data.stats || {};
    stats.distractionsPrevented = (stats.distractionsPrevented || 0) + 1;
    stats.distractions = (stats.distractions || 0) + 1;
    
    await chrome.storage.local.set({ distractionData, stats });
  }
}, {url: [{urlContains: "blocked.html"}]});

export function endFocusMode() {
  chrome.storage.local.get(["focusStartTime", "stats"], (data) => {
    if (data.focusStartTime) {
      const focusDuration = Math.floor((Date.now() - data.focusStartTime) / 1000 / 60);
      
      const stats = data.stats || {};
      stats.totalFocusTime = (stats.totalFocusTime || 0) + focusDuration;
      stats.focusMinutes = (stats.focusMinutes || 0) + focusDuration;
      
      // Update streak if needed
      const lastActiveDate = new Date(data.focusStartTime).toDateString();
      const today = new Date().toDateString();
      
      if (!stats.lastActiveDay || stats.lastActiveDay !== today) {
        if (stats.lastActiveDay) {
          const lastDate = new Date(stats.lastActiveDay);
          const dayDiff = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
          
          if (dayDiff === 1) {
            // Consecutive day
            stats.streaks = (stats.streaks || 0) + 1;
            stats.streak = (stats.streak || 0) + 1;
          } else if (dayDiff > 1) {
            // Streak broken
            stats.streaks = 1;
            stats.streak = 1;
          }
        } else {
          // First day with activity
          stats.streaks = 1;
          stats.streak = 1;
        }
        stats.lastActiveDay = today;
      }
      
      chrome.storage.local.set({ 
        stats,
        isFocusModeActive: false,
        focusStartTime: null,
        timerActive: false
      });
    }
  });
}

// Handle focus mode messages from popup
export function handleFocusMessages(message, sender, sendResponse) {
  if (message.action === "toggleFocusMode") {
    chrome.storage.local.get(["isFocusModeActive"], (data) => {
      const newState = !data.isFocusModeActive;
      chrome.storage.local.set({ isFocusModeActive: newState }, () => {
        updateBlockingRules();
        sendResponse({ success: true, isFocusModeActive: newState });
      });
    });
    return true;
  }
  
  if (message.action === "updateBlockedSites") {
    chrome.storage.local.set({ blockedSites: message.sites }, () => {
      updateBlockingRules();
      sendResponse({ success: true });
    });
    return true;
  }
  
  return false;
}