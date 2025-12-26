const { fetchHTML } = require("../utils/request.utils");
const { extractReviewsWithGemini } = require("../services/gemini.service");

module.exports = async function scrapeTrustRadius(company, start, end) {
  const reviews = [];
  let page = 1;
  let consecutiveEmptyPages = 0;
  const maxEmptyPages = 2;
  const maxPages = 10;

  console.log(`🔍 Scraping TrustRadius reviews for: ${company} (max ${maxPages} pages)`);

  while (consecutiveEmptyPages < maxEmptyPages && page <= maxPages) {
    try {
      // TrustRadius uses query parameter for pagination
      const url = page === 1
        ? `https://www.trustradius.com/products/${company}/reviews/all`
        : `https://www.trustradius.com/products/${company}/reviews?page=${page}`;
      console.log(`📄 Fetching page ${page}...`);
      
      const html = await fetchHTML(url);
      
      // Use Gemini AI to extract reviews
      const pageReviews = await extractReviewsWithGemini(html, "trustradius", start, end, url);
      
      if (!pageReviews || pageReviews.length === 0) {
        consecutiveEmptyPages++;
        console.log(`⚠️  No reviews found on page ${page}`);
        if (consecutiveEmptyPages >= maxEmptyPages) {
          console.log(`✅ Finished scraping. No more pages found.`);
          break;
        }
        page++;
        continue;
      }

      consecutiveEmptyPages = 0;
      reviews.push(...pageReviews);
      console.log(`✅ Found ${pageReviews.length} reviews on page ${page}`);
      page++;
      
      // Add delay between pages
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
      
      // Stop if we've reached max pages
      if (page > maxPages) {
        console.log(`✅ Reached maximum page limit (${maxPages})`);
        break;
      }
      
    } catch (error) {
      console.error(`❌ Error on page ${page}: ${error.message}`);
      if (error.message.includes("blocked") || error.message.includes("403") || error.message.includes("GEMINI_API_KEY")) {
        throw error;
      }
      consecutiveEmptyPages++;
      if (consecutiveEmptyPages >= maxEmptyPages || page >= maxPages) break;
      page++;
    }
  }

  console.log(`✅ Total reviews collected: ${reviews.length}`);
  return reviews;
};
