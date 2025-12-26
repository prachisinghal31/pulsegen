require("dotenv").config();
const yargs = require("yargs");
const fs = require("fs");
const path = require("path");
const runScraper = require("./services/scraper.service");
const { validateInput } = require("./utils/validator.utils");

const outputDir = path.join(__dirname, "..", "output");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}


const args = yargs
  .option("company", { demandOption: true, type: "string", describe: "Company slug or name (e.g., zoom-workplace)" })
  .option("source", { demandOption: true, choices: ["g2", "capterra", "trustradius"], describe: "Source site to scrape" })
  .option("start_date", { demandOption: false, type: "string", describe: "Start date (YYYY-MM-DD). Optional." })
  .option("end_date", { demandOption: false, type: "string", describe: "End date (YYYY-MM-DD). Optional." })
  .argv;

const company = args.company.toLowerCase().replace(/\s+/g, "-");

// If dates are not provided, default to a very wide range to include all reviews
const start = args.start_date ? new Date(args.start_date) : new Date('1970-01-01');
const end = args.end_date ? new Date(args.end_date) : new Date('3000-01-01');

validateInput(company, start, end);

(async () => {
  let reviews = [];
  let errorInfo = null;

  try {
    console.log(`\n🚀 Starting scraper for ${args.source.toUpperCase()}`);
    console.log(`📅 Date range: ${args.start_date} to ${args.end_date}\n`);
    reviews = await runScraper(args.source, company, start, end);
  } catch (err) {
    console.error(`\n❌ Scraping error: ${err.message}`);
    errorInfo = {
      message: err.message || "Scraping failed",
      source: args.source,
      company,
      status: err.response?.status || err.status || "UNKNOWN",
      reason: err.response?.status === 403 || err.response?.status === 429 
        ? "Cloudflare / DataDome protection" 
        : err.message || "Unknown error",
      timestamp: new Date().toISOString(),
      details: err.response?.data ? "Response received but may be blocked" : undefined
    };
  }

  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const outputPath = path.join(
    outputDir,
    `${company}_${args.source}_reviews.json`
  );

  const finalOutput = {
    metadata: {
      company,
      source: args.source,
      start_date: args.start_date,
      end_date: args.end_date,
      scraped_at: new Date().toISOString()
    },
    error: errorInfo,
    reviews
  };

  fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));

  console.log("✅ Output saved to:", outputPath);
  console.log("📝 Reviews collected:", reviews.length);

  if (errorInfo) {
    console.log("⚠️ Note:", errorInfo.message);
  }
})();
