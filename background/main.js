// Main entry point for all background functionality
// Initializes all modules and sets up event listeners

// Import all modules
import { initStorage } from './storage.js';
import { startBackgroundTimer, stopBackgroundTimer, handleTimerMessages } from './timer.js';
import { updateBlockingRules, handleFocusMessages } from './focus-mode.js';
import { cleanupOldData } from './stats.js';
import { setupHabitAlarms } from './habits.js';



// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startFocusMode") {
      // Handle focus mode start
      sendResponse({success: true});
    } else if (message.action === "endFocusMode") {
      // Handle focus mode end
      sendResponse({success: true});
    }
    return true; // Required to use sendResponse asynchronously
  });

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage with default values
  initStorage();
  console.log("Focus-Time Browser extension installed");
});

// Listen for storage changes that could affect blocking
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isFocusModeActive || changes.blockedSites) {
    updateBlockingRules();
  }
});

// Initialize the blocking rules when the extension starts
updateBlockingRules();

// Handle message routing from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Timer-related messages
  if (message.action === "startFocusMode" || 
      message.action === "endFocusMode" || 
      message.action === "stopTimer" ||
      message.action === "getTimerState") {
    return handleTimerMessages(message, sender, sendResponse);
  }
  
  // Focus mode messages
  if (message.action === "toggleFocusMode" ||
      message.action === "updateBlockedSites") {
    return handleFocusMessages(message, sender, sendResponse);
  }
  
  return false;
});

// Run periodic maintenance tasks
// Clean up old data once per day 
chrome.alarms.create('dailyCleanup', { periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyCleanup') {
    cleanupOldData();
  }
});



  
// Make sure habit alarms are set up
setupHabitAlarms();