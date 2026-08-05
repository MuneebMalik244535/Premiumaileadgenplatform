# CLI Lead Generation Agent 🎯

An autonomous CLI tool that searches Google via a real Chromium browser, scrapes lead data, qualifies it with Gemini AI, and exports a styled PDF report.

## Requirements

```
Python 3.10+
```

## Setup

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

Create a `.env` file (see `.env.example`):

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Usage

```bash
python cli.py
```

Then type your natural language query, for example:

```
Software development agencies in London
Fintech startups in Kenya
Marketing agencies in New York
```

## What happens

1. **Chromium browser opens** → navigates to Google Search automatically.
2. **Scrapes up to 20 results** → extracts titles, links, and snippets.
3. **Fetches each website** → extracts visible contact info from homepage text.
4. **Gemini AI qualifies each lead** → extracts Name, Email, Phone, Address, and assigns a relevance Score (0–100).
5. **Generates `leads_report.pdf`** → styled PDF with color-coded score badges (green ≥70, orange ≥40, red <40).

> **Note on CAPTCHA**: Google sometimes shows a CAPTCHA on automated searches.
> The browser is **headed** (visible), so you can solve it manually and press Enter to continue.

## Output

- `leads_report.pdf` — The full qualified leads report.
- Console summary of the top 5 leads.
