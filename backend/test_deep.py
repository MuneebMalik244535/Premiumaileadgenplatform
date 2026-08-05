import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scraper_service import LeadScraper

def log(msg):
    print(msg, flush=True)

scraper = LeadScraper(log_callback=log)
# Run for 5 initial results to keep credit usage reasonable
leads = scraper.run("top AI agency in Karachi Pakistan", num_results=5)

print("\n" + "="*60)
print(f"FINAL RESULTS: {len(leads)} unique leads")
print("="*60)
for i, l in enumerate(leads, 1):
    email = l.get('email', 'N/A')
    phone = l.get('phone', 'N/A')
    flag  = "✅" if email != "N/A" else "❌"
    print(f"\n{flag} Lead #{i}: {l.get('name')}")
    print(f"   Email  : {email}")
    print(f"   Phone  : {phone}")
    print(f"   Score  : {l.get('score')}")
    print(f"   Website: {l.get('link')}")

emails_found = sum(1 for l in leads if l.get('email','N/A') != 'N/A')
print(f"\n📊 Total emails found: {emails_found}/{len(leads)}")
