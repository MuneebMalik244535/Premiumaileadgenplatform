import os
import json
import time
import random
import re
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai

from proxy_manager import ProxyPoolManager

load_dotenv()

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")
GEMINI_API_KEY  = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("models/gemini-1.5-flash")
else:
    gemini_model = None

# Global default Proxy Pool Manager
proxy_manager = ProxyPoolManager()

# ── Known directory / listing sites ──────────────────────────────────────────
DIRECTORY_DOMAINS = [
    "clutch.co", "designrush.com", "techbehemoths.com", "upwork.com",
    "fiverr.com", "goodfirms.co", "g2.com", "bark.com", "sortlist.com",
    "superbcompanies.com", "f6s.com", "crunchbase.com", "tracxn.com",
    "linkedin.com", "yelp.com", "yellowpages.com", "trustpilot.com",
    "capterra.com", "softwareworld.co", "appfutura.com", "topdevelopers.co",
    "it-firms.com", "expertise.com", "upcity.com",
]

def is_directory(url: str) -> bool:
    """Return True if the URL belongs to a known listing/directory site."""
    try:
        host = urllib.parse.urlparse(url).netloc.lower().replace("www.", "")
        return any(d in host for d in DIRECTORY_DOMAINS)
    except Exception:
        return False


def fetch_page_content(url: str, timeout: int = 10, proxies: dict | None = None, manager: ProxyPoolManager | None = None) -> dict:
    """Fetch a page with rotating proxies, anti-bot user-agents, and contact-page extraction."""
    active_manager = manager or proxy_manager
    resp = active_manager.fetch_with_retry(url, max_retries=2, timeout=timeout)
    
    if not resp or resp.status_code != 200:
        return {"text": "", "contact_links": [], "emails": [], "html": ""}

    try:
        soup = BeautifulSoup(resp.text, "html.parser")
        contact_keywords = ["contact", "about", "reach", "support", "get-in-touch", "info", "hire"]
        contact_links, emails = [], []

        for a in soup.find_all("a", href=True):
            link_text = a.get_text().lower().strip()
            href = a["href"].lower()

            if href.startswith("mailto:"):
                email = href.replace("mailto:", "").split("?")[0].strip()
                if email and "@" in email and email not in emails:
                    emails.append(email)
                continue

            if any(kw in link_text or kw in href for kw in contact_keywords):
                full_url = urllib.parse.urljoin(url, a["href"])
                if full_url not in contact_links and "google.com" not in full_url:
                    contact_links.append(full_url)

        # Strip scripts/styles then get text
        for tag in soup(["script", "style", "noscript"]):
            tag.extract()
        text = soup.get_text(separator=" ", strip=True)

        return {
            "text": text[:10000],
            "contact_links": contact_links[:8],
            "emails": emails,
            "html": resp.text,
        }
    except Exception:
        return {"text": "", "contact_links": [], "emails": [], "html": ""}


def extract_emails_regex(text: str) -> list:
    """Extract all email-like strings from raw text."""
    pattern = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
    found = re.findall(pattern, text)
    invalid_ext = (".png", ".jpg", ".svg", ".gif", ".webp")
    invalid_prefix = ("noreply", "no-reply", "do-not-reply", "sentry", "postmaster", "mailer-daemon")
    valid = [
        e for e in found
        if not e.endswith(invalid_ext)
        and not any(e.lower().startswith(p) for p in invalid_prefix)
    ]
    return sorted(list(set(valid)))


def filter_emails_by_domain(emails: list, url: str) -> list:
    """Return emails whose domain looks related to the company's website."""
    try:
        host = urllib.parse.urlparse(url).netloc.lower().replace("www.", "")
        root = host.split(".")[0] if host else ""
        domain_emails = [e for e in emails if host in e or (root and root in e)]
        return domain_emails if domain_emails else emails
    except Exception:
        return emails


def mine_contact_pages(base_url: str, contact_links: list, proxies: dict | None = None) -> tuple[str, list]:
    """Visit up to 4 contact/about pages concurrently and accumulate text + emails."""
    combined_text = ""
    all_emails: list = []
    probes = ["/contact", "/contact-us", "/about", "/about-us", "/reach-us", "/get-in-touch"]
    probe_urls = [urllib.parse.urljoin(base_url, p) for p in probes]
    targets = list(dict.fromkeys(contact_links + probe_urls))[:4]

    with ThreadPoolExecutor(max_workers=len(targets) or 1) as executor:
        futures = [executor.submit(fetch_page_content, url, 8, proxies) for url in targets]
        for future in as_completed(futures):
            try:
                res = future.result()
                if res["text"]:
                    combined_text += "\n" + res["text"]
                    all_emails.extend(res["emails"])
                    regex_hits = extract_emails_regex(res["text"] + res["html"])
                    all_emails.extend(regex_hits)
            except Exception:
                pass

    return combined_text, list(set(all_emails))


# ── DYNAMIC AGENT AUTOSCALER (KUBERNETES HPA STYLE FOR AGENTS) ────────────────

class AgentAutoscaler:
    """
    ☸️ Dynamic Agent Autoscaler (HPA for AI Swarms)
    Monitors lead workload pressure and dynamically provisions reserve burst agents.
    """
    def __init__(self, base_workers: int = 5, max_burst_workers: int = 50, log_fn=None):
        self.base_workers = base_workers
        self.max_burst_workers = max_burst_workers
        self.log = log_fn or (lambda x: None)

    def provision_agents(self, workload_count: int, agent_type: str) -> int:
        if workload_count <= 0:
            return 1

        needed = min(workload_count, self.max_burst_workers)
        
        if needed <= self.base_workers:
            self.log(f"☸️ [Autoscaler] Normal Workload ({workload_count} items). Active: {needed} Base {agent_type}s.")
        else:
            reserve_burst = needed - self.base_workers
            self.log(
                f"☸️ [Autoscaler] 🚨 WORKLOAD SPIKE DETECTED ({workload_count} items)! "
                f"Auto-Scaling {agent_type} Swarm: {self.base_workers} Base Agents + 🚀 {reserve_burst} Reserve Burst Agents (Total Active: {needed} Agents)."
            )

        return needed


# ── MULTI-AGENT SWARM SYSTEM ──────────────────────────────────────────────────

class SearchAgent:
    """🔍 Agent 1: Search & Discovery Orchestrator"""
    def __init__(self, serpapi_key: str, log_fn):
        self.serpapi_key = serpapi_key
        self.log = log_fn

    def execute_search(self, query: str, num_results: int = 10) -> list:
        self.log(f"🤖 [SearchAgent] Executing query discovery for: '{query}'")
        if not self.serpapi_key:
            self.log("❌ [SearchAgent] SERPAPI_API_KEY missing.")
            return []

        params = {
            "q": query, "num": num_results,
            "api_key": self.serpapi_key,
            "engine": "google", "gl": "us", "hl": "en",
        }
        try:
            resp = requests.get("https://serpapi.com/search", params=params, timeout=15)
            resp.raise_for_status()
            results = resp.json().get("organic_results", [])
            leads = [
                {
                    "title":   r.get("title", "No Title"),
                    "link":    r.get("link"),
                    "snippet": r.get("snippet", ""),
                }
                for r in results if r.get("link")
            ]
            self.log(f"✅ [SearchAgent] Discovered {len(leads)} raw target URLs.")
            return leads
        except Exception as e:
            self.log(f"❌ [SearchAgent] Search error: {e}")
            return []


class DirectoryAgent:
    """📂 Agent 2: Specialized Directory & Listing Extractor Agent"""
    def __init__(self, serpapi_key: str, log_fn):
        self.serpapi_key = serpapi_key
        self.log = log_fn

    def extract_agencies(self, page_text: str, directory_url: str, html: str = "") -> list:
        if gemini_model and page_text.strip():
            prompt = f"""Directory site ({directory_url}). Extract names of up to 6 individual companies/agencies listed. Return JSON array of strings e.g. ["Agency A", "Agency B"]. Text:\n{page_text[:5000]}"""
            try:
                response = gemini_model.generate_content(prompt)
                content = response.text.strip()
                if "```" in content:
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                names = json.loads(content.strip())
                if isinstance(names, list) and names:
                    return [str(n).strip() for n in names if n]
            except Exception:
                pass
        return []

    def resolve_official_site(self, agency_name: str) -> str | None:
        params = {
            "q": f"{agency_name} official website", "num": 3,
            "api_key": self.serpapi_key, "engine": "google", "gl": "us", "hl": "en"
        }
        try:
            resp = requests.get("https://serpapi.com/search", params=params, timeout=10)
            results = resp.json().get("organic_results", [])
            for r in results:
                url = r.get("link", "")
                if url and not is_directory(url):
                    return url
        except Exception:
            pass
        return None


class WebScraperAgent:
    """🕷️ Agent 3: Deep Web Miner Worker Pool Agent"""
    def __init__(self, directory_agent: DirectoryAgent, log_fn, proxies: list):
        self.directory_agent = directory_agent
        self.log = log_fn
        self.proxies = proxies

    def _get_proxy(self) -> dict | None:
        if not self.proxies:
            return None
        p = random.choice(self.proxies)
        return {"http": p, "https": p}

    def process_lead(self, lead: dict) -> list[dict]:
        url = lead["link"]
        proxy = self._get_proxy()
        self.log(f"🕷️ [WebScraperAgent] Crawling site: {url[:50]}")
        page = fetch_page_content(url, proxies=proxy)
        all_emails = list(page["emails"]) + extract_emails_regex(page["text"] + page["html"])

        if is_directory(url):
            self.log(f"📂 [DirectoryAgent] Processing directory listing: {url[:50]}")
            agency_names = self.directory_agent.extract_agencies(page["text"], url, html=page["html"])

            if not agency_names:
                lead["homepage_text"] = page["text"]
                lead["direct_emails"] = list(set(all_emails))
                return [lead]

            sub_leads = []
            with ThreadPoolExecutor(max_workers=min(6, len(agency_names))) as executor:
                future_to_name = {
                    executor.submit(self.directory_agent.resolve_official_site, name): name 
                    for name in agency_names[:5]
                }
                for future in as_completed(future_to_name):
                    name = future_to_name[future]
                    official_url = future.result()
                    if official_url:
                        sub_lead = {
                            "title": name,
                            "link": official_url,
                            "snippet": f"Found via directory: {url}",
                        }
                        sub_lead = self._enrich_single_url(sub_lead)
                        sub_leads.append(sub_lead)

            return sub_leads if sub_leads else [lead]
        else:
            return [self._enrich_single_url(lead)]

    def _enrich_single_url(self, lead: dict) -> dict:
        url = lead["link"]
        proxy = self._get_proxy()
        page = fetch_page_content(url, proxies=proxy)
        raw_emails = list(page["emails"]) + extract_emails_regex(page["text"] + page["html"])

        if not raw_emails:
            extra_text, extra_emails = mine_contact_pages(url, page["contact_links"], proxies=proxy)
            page["text"] += "\n" + extra_text
            raw_emails.extend(extra_emails)

        filtered = filter_emails_by_domain(raw_emails, url)
        lead["homepage_text"] = page["text"][:10000]
        lead["direct_emails"] = filtered
        return lead


class AIQualifierAgent:
    """🤖 Agent 4: Parallel Gemini AI Lead Scoring & Extraction Agent"""
    def __init__(self, log_fn):
        self.log = log_fn

    def qualify_lead(self, lead: dict, query: str) -> dict:
        raw_content = lead.get("homepage_text", "")
        direct_emails = lead.get("direct_emails", [])
        email_hints = ", ".join(direct_emails[:5]) if direct_emails else "Unknown"

        if not gemini_model:
            lead.update({
                "name": lead["title"], "score": 0,
                "email": direct_emails[0] if direct_emails else "N/A",
                "phone": "N/A", "address": "N/A",
            })
            return lead

        prompt = f"""Extract B2B contact info for: "{query}"
Company: {lead['title']}
Website: {lead['link']}
Snippet: {lead.get('snippet', '')}
Website Text: {raw_content[:4000]}
Direct Emails: {email_hints}

Instructions:
- Direct Emails are priority for email field.
- Score 0-100 based on relevance.
- Return ONLY valid JSON: {{"name": "...", "score": 85, "email": "...", "phone": "...", "address": "..."}}
- If field unknown, use "N/A".
"""
        try:
            response = gemini_model.generate_content(prompt)
            content = response.text.strip()
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            parsed = json.loads(content.strip())
            lead.update({
                "name": str(parsed.get("name", lead["title"])),
                "score": int(parsed.get("score", 0)),
                "email": str(parsed.get("email", direct_emails[0] if direct_emails else "N/A")),
                "phone": str(parsed.get("phone", "N/A")),
                "address": str(parsed.get("address", "N/A")),
            })
        except Exception:
            lead.update({
                "name": lead["title"], "score": 0,
                "email": direct_emails[0] if direct_emails else "N/A",
                "phone": "N/A", "address": "N/A",
            })
        return lead


def safe_print(msg: str):
    try:
        print(f"[*] {msg}")
    except UnicodeEncodeError:
        print(f"[*] {msg.encode('ascii', errors='replace').decode('ascii')}")

class LeadScraper:
    def __init__(self, log_callback=None):
        self.log_callback = log_callback or safe_print
        self.results_file = "leads.json"
        self.serpapi_key  = SERPAPI_API_KEY
        
        raw_proxies = os.getenv("PROXY_LIST", "")
        self.proxies = [p.strip() for p in raw_proxies.split(",") if p.strip()]
        self.proxy_manager = ProxyPoolManager(proxy_list=self.proxies, log_fn=self.log)

        # Initialize Specialized Agents
        self.search_agent = SearchAgent(self.serpapi_key, self.log)
        self.directory_agent = DirectoryAgent(self.serpapi_key, self.log)
        self.scraper_agent = WebScraperAgent(self.directory_agent, self.log, self.proxies)
        self.ai_agent = AIQualifierAgent(self.log)

        # Initialize Dynamic Agent Autoscaler (Base: 5, Max Burst: 50)
        self.autoscaler = AgentAutoscaler(base_workers=5, max_burst_workers=50, log_fn=self.log)

    def log(self, message: str):
        self.log_callback(message)

    def run(self, query: str, num_results: int = 10):
        start_time = time.time()
        self.log(f"🚀 [Orchestrator] Launching Dynamic Autoscaling Agent Swarm for: '{query}'")

        # 1. SearchAgent discovers target URLs
        raw_leads = self.search_agent.execute_search(query, num_results)
        if not raw_leads:
            self.log("⚠️ [Orchestrator] No search targets found.")
            return []

        # 2. Dynamic Agent Autoscaling for WebScraperAgent Pool
        active_crawler_agents = self.autoscaler.provision_agents(len(raw_leads), "WebScraperAgent")
        enriched_leads_flat = []

        with ThreadPoolExecutor(max_workers=active_crawler_agents) as executor:
            future_to_lead = {executor.submit(self.scraper_agent.process_lead, lead): lead for lead in raw_leads}
            for future in as_completed(future_to_lead):
                try:
                    res_list = future.result()
                    enriched_leads_flat.extend(res_list)
                except Exception as e:
                    self.log(f"⚠️ [WebScraperAgent] Crawl worker exception: {e}")

        # 3. Dynamic Agent Autoscaling for AIQualifierAgent Pool
        active_ai_agents = self.autoscaler.provision_agents(len(enriched_leads_flat), "AIQualifierAgent")
        all_qualified = []

        with ThreadPoolExecutor(max_workers=active_ai_agents) as executor:
            future_to_enriched = {
                executor.submit(self.ai_agent.qualify_lead, enriched, query): enriched 
                for enriched in enriched_leads_flat
            }
            for future in as_completed(future_to_enriched):
                try:
                    qualified = future.result()
                    all_qualified.append(qualified)
                except Exception as e:
                    self.log(f"⚠️ [AIQualifierAgent] AI worker exception: {e}")

        # 4. Aggregation & Deduplication
        all_qualified.sort(key=lambda x: x.get("score", 0), reverse=True)
        all_qualified = self._deduplicate(all_qualified)

        elapsed = round(time.time() - start_time, 2)
        found_emails = sum(1 for l in all_qualified if l.get("email", "N/A") != "N/A")
        self.log(f"\n⚡ [Orchestrator] Autoscaled Swarm Completed in {elapsed}s! Found {len(all_qualified)} leads ({found_emails} with emails).")

        return all_qualified

    def _deduplicate(self, leads: list) -> list:
        seen, unique = set(), []
        for lead in leads:
            try:
                domain = urllib.parse.urlparse(lead.get("link", "")).netloc.lower()
            except Exception:
                domain = lead.get("link", "")
            if domain and domain not in seen:
                seen.add(domain)
                unique.append(lead)
        return unique

    def generate_pdf(self, leads: list, filename: str = "leads_report.pdf") -> str:
        from fpdf import FPDF
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("helvetica", "B", 16)
        pdf.cell(0, 10, "AI Lead Generation Report", ln=True, align="C")
        pdf.ln(10)

        for lead in leads:
            pdf.set_font("helvetica", "B", 12)
            pdf.cell(0, 8, f"{lead.get('name', 'N/A')} — Score: {lead.get('score', 0)}", ln=True)
            pdf.set_font("helvetica", "", 10)
            pdf.cell(0, 6, f"Email:   {lead.get('email', 'N/A')}", ln=True)
            pdf.cell(0, 6, f"Phone:   {lead.get('phone', 'N/A')}", ln=True)
            pdf.cell(0, 6, f"Address: {lead.get('address', 'N/A')}", ln=True)
            pdf.cell(0, 6, f"Website: {lead.get('link', 'N/A')}", ln=True)
            pdf.ln(4)

        pdf.output(filename)
        return filename
