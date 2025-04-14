// Handles chart rendering

import { generateWeeklyData } from './stats.js';

export function renderCharts(stats, distractions) {
  try {
    // Daily focus overview chart
    const focusCanvas = document.getElementById("focusChart");
    if (!focusCanvas) {
      console.error("Focus chart canvas not found");
      return;
    }
    
    const focusCtx = focusCanvas.getContext("2d");
    if (!focusCtx) {
      console.error("Could not get 2D context for focus chart");
      return;
    }
    
    new Chart(focusCtx, {
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
  
    const distractionsCanvas = document.getElementById("distractionsChart");
    if (!distractionsCanvas) {
      console.error("Distractions chart canvas not found");
      return;
    }
    
    const distractionsCtx = distractionsCanvas.getContext("2d");
    if (!distractionsCtx) {
      console.error("Could not get 2D context for distractions chart");
      return;
    }
    
    // Load the actual distraction data from storage
    chrome.storage.local.get(["distractionData"], (data) => {
      const distractionData = data.distractionData || {};
      
      const distractionLabels = Object.keys(distractionData).length > 0 
        ? Object.keys(distractionData) 
        : ["youtube.com", "facebook.com", "twitter.com", "instagram.com", "reddit.com"];
      
      const distractionValues = Object.keys(distractionData).length > 0
        ? Object.values(distractionData)
        : [8, 5, 7, 9, 12];
      
      new Chart(distractionsCtx, {
        type: "pie",
        data: {
          labels: distractionLabels,
          datasets: [{
            data: distractionValues,
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
    });
  } catch (error) {
    console.error("Error rendering charts:", error);
    displayError("Failed to load charts");
  }
}