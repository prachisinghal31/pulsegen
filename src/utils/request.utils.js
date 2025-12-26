const axios = require("axios");
const { headers } = require("../config/headers");

// Add delay to avoid rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.fetchHTML = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      // Add random delay between 1-3 seconds to mimic human behavior
      if (i > 0) {
        await delay(1000 + Math.random() * 2000);
      }
      
      const response = await axios.get(url, { 
        headers,
        timeout: 30000,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });
      
      if (response.status === 403 || response.status === 429) {
        console.warn(`⚠️  Access blocked (${response.status}) for ${url}. Retrying...`);
        if (i < retries - 1) continue;
        throw new Error(`Access blocked: ${response.status}`);
      }
      
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.data;
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      console.warn(`⚠️  Request failed (attempt ${i + 1}/${retries}): ${error.message}`);
      await delay(2000 * (i + 1)); // Exponential backoff
    }
  }
};
