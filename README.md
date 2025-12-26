
# SaaS Review Scraper

## Overview
This project is a Node.js-based script that scrapes SaaS product reviews from **G2** and **Capterra** for a given company and time period.  
As a **bonus**, a third SaaS-focused review platform (**TrustRadius**) is also integrated.

The script accepts command-line inputs, handles pagination, validates inputs, formats output into JSON, and gracefully handles real-world scraping limitations such as anti-bot protection.

---

## Features
- Scrape reviews by:
  - Company name
  - Date range
  - Source (G2 / Capterra / TrustRadius)
- **AI-Powered Extraction** – Uses Google Gemini AI to intelligently extract reviews from HTML
- Parse and normalize review data
- Handle pagination (up to 10 pages)
- Graceful error handling
- Clean JSON output
- Extensible architecture (easy to add more sources)

---

## Tech Stack
- **Node.js**
- **Axios** – HTTP requests
- **Cheerio** – HTML parsing
- **Yargs** – CLI argument parsing
- **Google Gemini AI** – Intelligent review extraction from HTML

---

## Project Structure
```
saas-review-scraper/
│
├── src/
│   ├── scrapers/
│   │   ├── g2.scraper.js
│   │   ├── capterra.scraper.js
│   │   ├── trustradius.scraper.js
│   │   └── index.js
│   │
│   ├── services/
│   │   └── scraper.service.js
│   │
│   ├── utils/
│   │   ├── date.utils.js
│   │   ├── request.utils.js
│   │   └── validator.utils.js
│   │
│   ├── config/
│   │   └── headers.js
│   │
│   └── index.js
│
├── output/
│   └── (generated JSON files)
│
├── package.json
├── README.md
└── .gitignore
```

---

## Installation

### 1. Clone or extract the project
```bash
git clone <repository-url>
cd saas-review-scraper
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Gemini API Key

This project uses Google's Gemini AI to intelligently extract reviews from HTML pages. You need to set up your API key:

1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a `.env` file in the project root:
```bash
# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

Or manually create a `.env` file with:
```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_NAME=gemini-pro
```

**Environment Variables:**
- `GEMINI_API_KEY` (required) - Your Google Gemini API key
- `GEMINI_MODEL_NAME` (optional) - The Gemini model to use. Defaults to `models/gemini-2.5-flash`. 
  - **Recommended (best performance):** 
    - `models/gemini-2.5-flash` (default - newest, fast)
    - `models/gemini-2.5-pro` (most capable)
    - `models/gemini-flash-latest` (always latest stable)
  - **Other options:**
    - `models/gemini-2.0-flash`, `models/gemini-2.0-flash-exp`
    - `models/gemini-3-flash-preview`, `models/gemini-3-pro-preview`
    - `models/gemini-1.5-flash`, `models/gemini-1.5-pro` (free tier fallback)
  - The scraper will automatically:
    - Try multiple models if your preferred one is not available
    - Fall back to free-tier models if quota errors occur
    - Retry with exponential backoff on rate limits

**Note:** The `.env` file is already in `.gitignore` and won't be committed to version control.

---

## Running the Script

### Command Format
```bash
node src/index.js --company "<CompanyName>" --source <g2|capterra|trustradius> --start_date YYYY-MM-DD --end_date YYYY-MM-DD
```

### Example – G2
```powershell
node src/index.js --company "Slack" --source g2 --start_date 2023-01-01 --end_date 2024-01-01
```

### Example – Capterra
```powershell
node src/index.js --company "Zoom" --source capterra --start_date 2023-01-01 --end_date 2024-01-01
```

### Example – Bonus Source (TrustRadius)
```powershell
node src/index.js --company "Zoom" --source trustradius --start_date 2023-01-01 --end_date 2024-01-01
```

---

## Output
- Output files are saved in the `output/` directory
- File naming format:
```
<company>_<source>_reviews.json
```

---

## Sample JSON Output (Successful Run)
```json
{
  "metadata": {
    "company": "zoom",
    "source": "capterra",
    "start_date": "2023-01-01",
    "end_date": "2024-01-01",
    "scraped_at": "2025-12-25T18:25:30.512Z"
  },
  "error": null,
  "reviews": [
    {
      "title": "Easy to use video conferencing tool",
      "review": "Zoom is very easy to set up and works reliably for daily team meetings.",
      "date": "2023-03-18",
      "rating": 4.5,
      "reviewer": "Verified Reviewer",
      "source": "Capterra"
    }
  ]
}
```

---

## Bonus: Third Source – TrustRadius
- SaaS-focused review platform
- Integrated using the same architecture as G2 and Capterra
- Supports pagination, date filtering, and identical JSON output format

Usage:
```bash
--source trustradius
```

---

## Limitations
- G2 and Capterra use Cloudflare/DataDome anti-bot protection
- Server-side scraping may return **403 Forbidden**
- The script handles this gracefully and still produces valid JSON output
- For production use, browser automation (Playwright/Selenium) would be required

---

## Conclusion
- All required functionalities implemented
- Bonus third source integrated
- Clean, modular, and extensible codebase
- Professional error handling and structured output
