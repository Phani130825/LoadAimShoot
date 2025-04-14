(function () {
    const domain = window.location.hostname;
    const distractionScore = getDistractionScore(domain);
    chrome.runtime.sendMessage({ domain, distractionScore });
  
    let scrollCount = 0;
    window.addEventListener("scroll", () => {
      scrollCount++;
    });
  
    function getDistractionScore(domain) {
      const highDistractions = ["youtube.com", "instagram.com", "reddit.com"];
      if (highDistractions.some(d => domain.includes(d))) return 10;
      if (domain.includes("docs")) return 1;
      return 5;
    }
  })();