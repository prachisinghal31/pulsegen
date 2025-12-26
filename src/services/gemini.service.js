const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini API
let genAI = null;
let model = null;

function initializeGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set. Please set it in your .env file or environment.");
  }
  
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
    // Get model name from environment variable, default to gemini-2.5-flash
    const preferredModel = process.env.GEMINI_MODEL_NAME || "models/gemini-2.5-flash";
    
    // List of models to try in order - using available models from your API
    const modelsToTry = [
      preferredModel,
      // Best stable models (2.5 series - newest and most capable)
      "models/gemini-2.5-flash",
      "models/gemini-2.5-pro",
      // Latest stable versions (always up-to-date)
      "models/gemini-flash-latest",
      "models/gemini-pro-latest",
      // Stable 2.0 models
      "models/gemini-2.0-flash",
      "models/gemini-2.0-flash-exp",
      "models/gemini-2.0-flash-001",
      // Free-tier fallback models (if newer ones fail)
      "models/gemini-1.5-flash",
      "models/gemini-1.5-pro",
      // Preview models (if stable ones aren't available)
      "models/gemini-3-flash-preview",
      "models/gemini-3-pro-preview"
    ];
    
    let modelInitialized = false;
    let lastError = null;
    
    for (const modelName of modelsToTry) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        console.log(`✅ Initialized Gemini model: ${modelName}`);
        modelInitialized = true;
        break;
      } catch (err) {
        lastError = err;
        // Don't log error for first attempt if it's the preferred model
        if (modelName !== preferredModel || modelsToTry.indexOf(modelName) > 0) {
          console.log(`   ⚠️  Model "${modelName}" not available, trying next...`);
        }
      }
    }
    
    if (!modelInitialized) {
      const errorMsg = `Could not initialize any Gemini model. Tried: ${modelsToTry.join(", ")}. ` +
        `Please check your API key and set GEMINI_MODEL_NAME in .env to a valid model. ` +
        `Last error: ${lastError?.message || "Unknown error"}`;
      throw new Error(errorMsg);
    }
  }
  
  return model;
}

/**
 * Extract reviews from HTML using Gemini AI
 * @param {string} html - The HTML content to extract reviews from
 * @param {string} source - The source platform (g2, capterra, trustradius)
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @param {string} url - The URL of the page being scraped (optional)
 * @returns {Promise<Array>} Array of extracted reviews
 */
async function extractReviewsWithGemini(html, source, startDate, endDate, url = null) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // List of models to try in order - using available models from your API
  const preferredModel = process.env.GEMINI_MODEL_NAME || "models/gemini-2.5-flash";
  const modelsToTry = [
    preferredModel,
    // Best stable models (2.5 series - newest and most capable)
    "models/gemini-2.5-flash",
    "models/gemini-2.5-pro",
    // Latest stable versions (always up-to-date)
    "models/gemini-flash-latest",
    "models/gemini-pro-latest",
    // Stable 2.0 models
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-exp",
    "models/gemini-2.0-flash-001",
    // Free-tier fallback models (if newer ones fail)
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro",
    // Preview models (if stable ones aren't available)
    "models/gemini-3-flash-preview",
    "models/gemini-3-pro-preview"
  ];
  
  let model = null;
  let modelName = null;
  
  // Try to find a working model
  for (const modelToTry of modelsToTry) {
    try {
      model = genAI.getGenerativeModel({ model: modelToTry });
      modelName = modelToTry;
      break;
    } catch (err) {
      // Continue to next model
      continue;
    }
  }
  
  if (!model) {
    throw new Error(`Could not initialize any Gemini model. Tried: ${modelsToTry.join(", ")}. Please check your API key and available models.`);
  }
  
  console.log(`🤖 Using Gemini model: ${modelName}`);
  
  try {
    
    // Clean HTML - remove scripts, styles, and other non-content elements
    const cheerio = require("cheerio");
    const $ = cheerio.load(html);
    
    // Remove script and style tags
    $("script, style, noscript, iframe, svg").remove();
    
    // Get clean HTML
    const cleanHTML = $.html();
    
    // Limit HTML size to avoid token limits (Gemini has context limits)
    const maxHTMLLength = 500000; // ~500KB
    const truncatedHTML = cleanHTML.length > maxHTMLLength 
      ? cleanHTML.substring(0, maxHTMLLength) + "... [truncated]"
      : cleanHTML;
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Build URL context for the prompt
    const urlContext = url ? `\n\nPage URL: ${url}\n\nCan you extract all the reviews from this page?` : "";
    
    const prompt = `You are a web scraping assistant. I need you to extract all product reviews from the following HTML content from ${source.toUpperCase()}.${urlContext}

TASK: Extract ALL reviews visible on this page.

Instructions:
0. can you extract all the reviewxs from the page.
1. Carefully examine the HTML and find ALL review entries on the page
2. For each review, extract the following information:
   - title: The review title/headline (if available)
   - review: The full review text/body content
   - date: The review date (must be in YYYY-MM-DD format)
   - rating: The rating as a number (0-5 scale, e.g., 4.5, 5.0)
   - reviewer: The reviewer's name, username, or identifier

4. Be thorough - extract EVERY review visible on the page, don't miss any
5. Parse dates in various formats and convert them to YYYY-MM-DD:
   - "January 15, 2023" → "2023-01-15"
   - "Jan 15, 2023" → "2023-01-15"
   - "15 Jan 2023" → "2023-01-15"
   - "2023-01-15" → "2023-01-15"
   - "1/15/2023" → "2023-01-15"
6. Extract ratings as decimal numbers:
   - "4.5 out of 5" → 4.5
   - "5 stars" → 5.0
   - "4/5" → 4.0
   - "★★★★☆" → 4.0

7. Return the results as a JSON array with this EXACT structure:
[
  {
    "title": "Review title or empty string if no title",
    "review": "Full review text content",
    "date": "YYYY-MM-DD",
    "rating": 4.5,
    "reviewer": "Reviewer name or 'Anonymous' if not available"
  }
]

8. If no reviews are found that match the date range, return an empty array: []
9. Return ONLY valid JSON array, no additional text, explanations, or markdown formatting

HTML Content:
${truncatedHTML}

Now extract all reviews from this page and return them as a JSON array.`;

    console.log(`🤖 Using Gemini AI to extract reviews from ${source.toUpperCase()}...`);

    // Quick local-first extraction to avoid unnecessary Gemini calls and reduce rate limits
    function localParseHTML(htmlContent) {
      try {
        const cheerioLocal = require('cheerio');
        const { isDateInRange, parseDate } = require('../utils/date.utils');
        const $local = cheerioLocal.load(htmlContent);
        const found = [];

        let cards = $local('.review, .review-card, [data-testid="review"], article.review, .review-item');
        if (!cards.length) cards = $local('article, [class*="review"]');

        cards.each((_, el) => {
          try {
            const dateStr = $local(el).find('time[datetime]').attr('datetime') || $local(el).find('time').attr('datetime') || $local(el).find('time').text().trim() || $local(el).find('.date, .review-date, [class*="date"]').text().trim() || '';
            const parsed = parseDate(dateStr);
            if (!parsed || !isDateInRange(parsed, startDate, endDate)) return;

            const title = $local(el).find('h3, h2, .review-title, [class*="title"]').first().text().trim() || $local(el).find('strong, b').first().text().trim() || '';
            const reviewText = $local(el).find('.review-text, .review-body, .review-content, p').not(':has(img)').not('.reviewer, .author, .meta').first().text().trim() || $local(el).find('.content, .description').text().trim() || '';

            let rating = $local(el).find('.rating, [class*="rating"]').text().match(/\d+\.?\d*/)?.[0] || $local(el).find('[data-rating]').attr('data-rating') || $local(el).find('.stars').attr('data-rating') || '';
            rating = parseFloat(rating) || 0;

            const reviewer = $local(el).find('.reviewer, .author, .user-name, .reviewer-name').text().trim() || 'Anonymous';

            if (title || reviewText) {
              found.push({
                title: title || 'No title',
                review: reviewText || 'No review text',
                date: parsed,
                rating: rating || 0,
                reviewer,
                source: source.charAt(0).toUpperCase() + source.slice(1)
              });
            }
          } catch (err) {
            // ignore individual card parse errors
          }
        });

        return found;
      } catch (err) {
        return [];
      }
    }

    // Try local parse first
    try {
      const localResults = localParseHTML(cleanHTML);
      if (localResults && localResults.length > 0) {
        console.log(`✅ Local parsing found ${localResults.length} reviews — skipping Gemini`);
        return localResults;
      }
    } catch (e) {
      // ignore and proceed to Gemini
    }

    let result;
    let retryCount = 0;
    // Allow configuration via env vars
    const maxRetries = parseInt(process.env.GEMINI_MAX_RETRIES, 10) || 6;
    const baseBackoffMs = parseInt(process.env.GEMINI_BACKOFF_BASE_MS, 10) || 5000;
    const maxBackoffMs = parseInt(process.env.GEMINI_MAX_BACKOFF_MS, 10) || 60000;
    const fallbackEnabled = (String(process.env.GEMINI_FALLBACK_TO_CHEERIO || "true").toLowerCase() === "true");

    // Helper: compute exponential backoff with jitter
    function computeBackoff(retry) {
      const exp = baseBackoffMs * Math.pow(2, retry);
      const jitter = Math.floor(Math.random() * 1000);
      return Math.min(maxBackoffMs, exp + jitter);
    }

    // Helper: try to extract Retry-After from error if available
    function getRetryAfterMs(err) {
      try {
        const headers = err?.response?.headers || err?.headers || {};
        const ra = headers['retry-after'] || headers['Retry-After'] || headers['retry_after'];
        if (ra) {
          // Could be an integer seconds or an HTTP-date
          const secs = parseInt(ra, 10);
          if (!Number.isNaN(secs)) return secs * 1000;
          const date = Date.parse(ra);
          if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
        }
      } catch (e) {
        // ignore
      }

      // fallback to parsing message
      const msg = String(err?.message || "");
      const match = msg.match(/retry in (\d+\.?\d*)s/i) || msg.match(/RetryDelay["']:\s*"(\d+)s"/i);
      if (match) return Math.ceil(parseFloat(match[1])) * 1000;
      return null;
    }

    while (retryCount < maxRetries) {
      try {
        result = await model.generateContent(prompt);
        break; // success
      } catch (modelError) {
        const errorMsg = String(modelError?.message || "");
        const status = modelError?.response?.status || modelError?.status || modelError?.statusCode || null;

        // Detect rate limiting (429) or quota issues
        const isRateLimit = status === 429 || /rate limit|rate-limited|quota exceeded|quota/i.test(errorMsg);
        // Detect transient network/server errors
        const isNetworkError = /fetch failed|network error|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|502|503|504|Failed to fetch/i.test(errorMsg) || [502,503,504].includes(status);

        if (isRateLimit || isNetworkError) {
          const retryAfterMs = getRetryAfterMs(modelError) || computeBackoff(retryCount);
          retryCount++;

          if (retryCount < maxRetries) {
            const reason = isRateLimit ? 'Rate limit' : 'Network/server error';
            console.log(`⏳ ${reason}. Waiting ${Math.ceil(retryAfterMs/1000)}s before retry ${retryCount}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, retryAfterMs));
            continue; // retry
          }

          console.error(`❌ ${isRateLimit ? 'Rate limit' : 'Network error'} exceeded after ${maxRetries} retries.`);

          // If configured, attempt a local cheerio fallback instead of failing hard
          if (fallbackEnabled) {
            try {
              console.log(`🔁 Falling back to local HTML parsing (cheerio) for ${source} page.`);
              const fallbackReviews = localParseHTML(cleanHTML);

              console.log(`✅ Fallback parsed ${fallbackReviews.length} reviews`);
              return fallbackReviews;

            } catch (fallbackErr) {
              console.error(`❌ Fallback parsing failed: ${fallbackErr.message}`);
              throw new Error(`${isRateLimit ? 'Rate limit' : 'Network error'} exceeded and fallback parsing failed: ${fallbackErr.message}`);
            }
          }

          // No fallback or fallback disabled — throw original error
          throw new Error(`${isRateLimit ? 'Rate limit' : 'Network error'} exceeded after ${maxRetries} retries. Please wait and try again later.`);
        }

        // Handle model not found errors (404)
        if (/not found|404/i.test(errorMsg)) {
          console.log(`⚠️  Model "${modelName}" not found, trying alternatives...`);

          for (const altModel of modelsToTry) {
            if (altModel === modelName) continue;
            try {
              console.log(`   Trying model: ${altModel}...`);
              const altGenAI = new GoogleGenerativeAI(apiKey);
              const altModelInstance = altGenAI.getGenerativeModel({ model: altModel });
              result = await altModelInstance.generateContent(prompt);
              console.log(`   ✅ Successfully used model: ${altModel}`);
              modelName = altModel;
              break; // exit retry loop
            } catch (altErr) {
              console.log(`   ❌ ${altModel} also failed`);
              if (altModel === modelsToTry[modelsToTry.length - 1]) {
                throw new Error(`All models failed. Last error: ${altErr.message}`);
              }
            }
          }
          break; // exit retry loop
        }

        // For other errors, throw immediately
        throw modelError;
      }
    }
    
    if (!result) {
      throw new Error("Failed to get response from Gemini API after all retries");
    }
    const response = await result.response;
    const text = response.text();
    
    // Clean the response text - remove markdown code blocks if present
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }
    
    // Parse JSON response
    let reviews = [];
    try {
      reviews = JSON.parse(jsonText);
      
      // Validate reviews structure
      if (!Array.isArray(reviews)) {
        console.warn("⚠️  Gemini returned non-array response, attempting to fix...");
        reviews = [];
      }
      
      // Filter reviews by date range
      const { isDateInRange, parseDate } = require("../utils/date.utils");
      reviews = reviews.filter(review => {
        if (!review.date) return false;
        const date = parseDate(review.date);
        return date && isDateInRange(date, startDate, endDate);
      });
      
      // Add source to each review
      reviews = reviews.map(review => ({
        ...review,
        source: source.charAt(0).toUpperCase() + source.slice(1),
        rating: parseFloat(review.rating) || 0,
        date: parseDate(review.date) || review.date
      }));
      
      console.log(`✅ Gemini extracted ${reviews.length} reviews`);
      
    } catch (parseError) {
      console.error(`❌ Error parsing Gemini response: ${parseError.message}`);
      console.error(`Response text: ${text.substring(0, 500)}...`);
      reviews = [];
    }
    
    return reviews;
    
  } catch (error) {
    console.error(`❌ Gemini API error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  extractReviewsWithGemini,
  initializeGemini
};

