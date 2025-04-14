// Dynamic handling of distracting tabs based on distraction scores
const DISTRACTION_THRESHOLD = 7;

// Track active tabs and their distraction levels
let tabDistractionsMap = new Map();

// Hide or mute distracting tabs based on their scores
function manageDistractingTabs() {
  chrome.storage.local.get("isFocusModeActive", ({ isFocusModeActive }) => {
    if (!isFocusModeActive) return;
    
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        const distractionLevel = tabDistractionsMap.get(tab.id) || 0;
        
        if (distractionLevel >= DISTRACTION_THRESHOLD) {
          if (distractionLevel >= 9) {
            // High distraction: mute and mark
            chrome.tabs.update(tab.id, { muted: true });
            chrome.action.setBadgeText({ tabId: tab.id, text: "⛔" });
          } else {
            // Medium distraction: just mark
            chrome.action.setBadgeText({ tabId: tab.id, text: "⚠️" });
          }
        }
      });
    });
  });
}

// Restore all tabs to normal state
function restoreAllTabs() {
  chrome.tabs.query({}, (tabs) => {
    for (let tab of tabs) {
      chrome.tabs.update(tab.id, { muted: false });
      chrome.action.setBadgeText({ tabId: tab.id, text: "" });
    }
  });
  
  // Clear the distraction map
  tabDistractionsMap.clear();
}

// Update a tab's distraction level
function updateTabDistraction(tabId, score) {
  tabDistractionsMap.set(tabId, score);
  
  // If in focus mode, manage this tab right away
  chrome.storage.local.get("isFocusModeActive", ({ isFocusModeActive }) => {
    if (isFocusModeActive) {
      const distractionLevel = tabDistractionsMap.get(tabId) || 0;
      
      if (distractionLevel >= DISTRACTION_THRESHOLD) {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) return; // Tab no longer exists
          
          if (distractionLevel >= 9) {
            // High distraction: mute and mark
            chrome.tabs.update(tabId, { muted: true });
            chrome.action.setBadgeText({ tabId: tabId, text: "⛔" });
            
            // Track prevention for stats
            incrementDistractionPrevented();
          } else {
            // Medium distraction: just mark
            chrome.action.setBadgeText({ tabId: tabId, text: "⚠️" });
          }
        });
      }
    }
  });
}

// Increment the distractions prevented counter
function incrementDistractionPrevented() {
  chrome.storage.local.get("stats", ({ stats = {} }) => {
    const updatedStats = {
      ...stats,
      distractionsPrevented: (stats.distractionsPrevented || 0) + 1
    };
    chrome.storage.local.set({ stats: updatedStats });
  });
}

// Export functions for use by other scripts
globalThis.manageDistractingTabs = manageDistractingTabs;
globalThis.restoreAllTabs = restoreAllTabs;
globalThis.updateTabDistraction = updateTabDistraction;