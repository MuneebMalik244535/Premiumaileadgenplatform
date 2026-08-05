import os
import json
from scraper_service import LeadScraper
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def verify():
    print("🚀 Starting Verification: AI agency in Karachi")
    
    # Initialize scraper with console logging
    scraper = LeadScraper(log_callback=lambda x: print(f"[LOG] {x}"))
    
    # Run the lead generation for 3 results to save time/tokens/credits
    query = "top AI agency in Karachi"
    num_results = 3
    
    try:
        leads = scraper.run(query, num_results=num_results)
        
        print("\n--- Summary ---")
        print(f"Total leads generated: {len(leads)}")
        
        for i, lead in enumerate(leads):
            print(f"\nLead #{i+1}:")
            print(f"  Name: {lead.get('name')}")
            print(f"  Score: {lead.get('score')}")
            print(f"  Email: {lead.get('email')}")
            print(f"  Link: {lead.get('link')}")
            print(f"  Snippet: {lead.get('snippet')[:100]}...")
            
        if len(leads) > 0:
            print("\n✅ Verification Successful!")
        else:
            print("\n❌ Verification Failed: No leads found.")
            
    except Exception as e:
        print(f"\n❌ Verification Failed with error: {e}")

if __name__ == "__main__":
    verify()
