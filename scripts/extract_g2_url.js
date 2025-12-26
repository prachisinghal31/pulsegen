const path = require('path');
const { fetchHTML } = require('../src/utils/request.utils');
const { extractReviewsWithGemini } = require('../src/services/gemini.service');

(async () => {
  try {
    const company = 'zoom-workplace';
    const url = `https://www.g2.com/products/${company}/reviews`;
    console.log(`📄 Fetching: ${url}`);
    const html = await fetchHTML(url);
    console.log(`📦 Page fetched (${html.length} bytes)`);

    // No date filtering — extract all and then take top 10
    const start = new Date('1970-01-01');
    const end = new Date('3000-01-01');

    let reviews = await extractReviewsWithGemini(html, 'g2', start, end, url);

    console.log(`✅ Extracted ${reviews.length} reviews`);

    reviews = (reviews || []).slice();
    reviews.sort((a, b) => {
      const da = a && a.date ? new Date(a.date) : new Date(0);
      const db = b && b.date ? new Date(b.date) : new Date(0);
      return db - da;
    });

    const top = reviews.slice(0, 10);

    const fs = require('fs');
    const outputDir = path.resolve(__dirname, '..', 'output');
    const filePath = path.join(outputDir, `${company}_g2_top10.json`);

    if (top.length === 0) {
      console.log('⚠️  No reviews found');
    } else {
      console.log(`📋 Top ${top.length} reviews (most recent first):`);
      top.forEach((r, i) => {
        const dateStr = r && r.date ? (typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0, 10)) : 'Unknown date';
        const title = r.title || 'No title';
        const reviewer = r.reviewer || 'Anonymous';
        const rating = (typeof r.rating !== 'undefined') ? r.rating : 'N/A';
        console.log(`${i + 1}) [${dateStr}] ${title} — ${reviewer} — rating: ${rating}`);
        console.log(`   ${r.review || ''}\n`);
      });

      // Ensure output directory exists and write JSON file
      try {
        fs.mkdirSync(outputDir, { recursive: true });
        const payload = top.map(r => ({
          title: r.title || '',
          review: r.review || '',
          date: r.date ? (typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0,10)) : null,
          rating: typeof r.rating !== 'undefined' ? r.rating : null,
          reviewer: r.reviewer || 'Anonymous',
          source: r.source || 'G2'
        }));
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
        console.log(`✅ Saved top ${top.length} reviews to: ${filePath}`);
      } catch (err) {
        console.error('❌ Failed to write JSON file:', err.message || err);
      }
    }
  } catch (err) {
    console.error('❌ Extraction failed:', err.message || err);
    process.exit(1);
  }
})();