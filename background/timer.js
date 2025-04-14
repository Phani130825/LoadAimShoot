// Handles timer functionality for focus sessions
import { endFocusMode } from './focus-mode.js';

let timerInterval = null;

export function startBackgroundTimer(duration, habitData = null) {
  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  // Set initial timer state
  const startTime = Date.now();
  const totalTime = duration;
  
  chrome.storage.local.set({ 
    timerActive: true,
    timeLeft: totalTime,
    totalTime: totalTime,
    focusStartTime: startTime,
    isFocusModeActive: true,
    currentHabit: habitData
  });
  
  // Start the timer
  timerInterval = setInterval(() => {
    chrome.storage.local.get(['timeLeft', 'focusStartTime', 'totalTime'], (data) => {
      if (!data.timeLeft || !data.focusStartTime) {
        clearInterval(timerInterval);
        timerInterval = null;
        return;
      }
      
      // Calculate time left based on elapsed time
      const elapsedSeconds = Math.floor((Date.now() - data.focusStartTime) / 1000);
      const newTimeLeft = Math.max(0, data.totalTime - elapsedSeconds);
      
      // Update storage with new time
      chrome.storage.local.set({ timeLeft: newTimeLeft });
      
      // Broadcast timer update to any open popup
      chrome.runtime.sendMessage({ 
        action: "timerUpdate", 
        timeLeft: newTimeLeft 
      });
      
      // Check if timer has finished
      if (newTimeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        
        // End focus mode and update stats
        endFocusMode();
        
        // Send notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon.png",
          title: "Break Time!",
          message: "You've completed a focus session. Take a short break!",
        });
        
        // Notify popup that timer is complete
        chrome.runtime.sendMessage({ 
          action: "timerComplete" 
        });
      }
    });
  }, 1000);
}

export function stopBackgroundTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  endFocusMode();
  
  chrome.storage.local.set({
    timerActive: false,
    timeLeft: 25 * 60,
    totalTime: 25 * 60,
    isFocusModeActive: false,
    currentHabit: null
  });
  
  // Notify popup that timer was stopped
  chrome.runtime.sendMessage({ 
    action: "timerStopped" 
  });
}

// Handle timer-related messages from popup
export function handleTimerMessages(message, sender, sendResponse) {
  if (message.action === "startFocusMode") {
    // Start focus mode with timer
    if (message.habitIndex !== undefined && message.habitIndex !== "") {
      // Start habit-based session
      chrome.storage.local.get("habits", ({ habits = [] }) => {
        const selectedHabit = habits[message.habitIndex];
        if (selectedHabit) {
          // Calculate duration from habit times
          const [startHour, startMinute] = selectedHabit.start.split(":").map(Number);
          const [endHour, endMinute] = selectedHabit.end.split(":").map(Number);
          
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;
          
          // Handle cases where end time is on the next day
          const durationMinutes = endMinutes < startMinutes ? 
              (endMinutes + 24 * 60) - startMinutes : 
              endMinutes - startMinutes;
          
          startBackgroundTimer(durationMinutes * 60, selectedHabit);
        } else {
          // Fallback to standard Pomodoro if habit not found
          startBackgroundTimer(25 * 60);
        }
      });
    } else {
      // Standard Pomodoro session (25 minutes)
      startBackgroundTimer(25 * 60);
    }
    
    sendResponse({ success: true });
    return true;
  } 
  else if (message.action === "endFocusMode" || message.action === "stopTimer") {
    // Stop the timer and end focus mode
    stopBackgroundTimer();
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === "getTimerState") {
    // Return current timer state to popup
    chrome.storage.local.get(["timerActive", "timeLeft", "totalTime", "isFocusModeActive", "currentHabit"], (data) => {
      sendResponse({
        timerActive: data.timerActive || false,
        timeLeft: data.timeLeft || 25 * 60,
        totalTime: data.totalTime || 25 * 60,
        isFocusModeActive: data.isFocusModeActive || false,
        currentHabit: data.currentHabit || null
      });
    });
    return true; // Keep the message channel open for async response
  }
  
  return false;
}