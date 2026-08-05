import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_serpapi():
    api_key = os.getenv("SERPAPI_API_KEY")
    if not api_key:
        print("❌ Error: SERPAPI_API_KEY not found in .env file.")
        return

    print(f"Testing SerpAPI key: {api_key[:5]}...{api_key[-5:]}")
    
    # SerpAPI search parameters
    params = {
        "q": "Coffee shops in New York",
        "location": "Austin, Texas, United States",
        "hl": "en",
        "gl": "us",
        "google_domain": "google.com",
        "api_key": api_key
    }

    try:
        response = requests.get("https://serpapi.com/search", params=params)
        
        if response.status_code == 200:
            data = response.json()
            if "search_metadata" in data and data["search_metadata"].get("status") == "Success":
                print("✅ SerpAPI Key is working properly!")
                print(f"Results found: {len(data.get('organic_results', []))}")
                # Print the first result title as confirmation
                if data.get('organic_results'):
                    print(f"First result: {data['organic_results'][0].get('title')}")
            else:
                print("❌ SerpAPI search failed. Response content:")
                print(data)
        elif response.status_code == 401:
            print("❌ Invalid SerpAPI API Key.")
        else:
            print(f"❌ SerpAPI request failed with status code: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    test_serpapi()
