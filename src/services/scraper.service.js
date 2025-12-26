const scrapers = require("../scrapers");

module.exports = async function runScraper(source, company, start, end) {
  if (!scrapers[source]) {
    throw new Error("Unsupported source");
  }
  return scrapers[source](company, start, end);
};
