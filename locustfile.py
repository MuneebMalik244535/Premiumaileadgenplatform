"""
⚡ Enterprise Load Testing & Performance Benchmark Suite (Locust)
Simulates high-concurrency enterprise workloads (1,000+ to 10,000+ concurrent users)
testing throughput (RPS), P95/P99 latency, and rate limiting resilience.

Usage:
  locust -f locustfile.py --headless -u 100 -r 20 --run-time 30s --host http://localhost:8000
"""
import random
import json
from locust import HttpUser, task, between, events

class LeadGenSaaSUser(HttpUser):
    """
    Simulates authentic Enterprise SaaS user behavior against backend APIs.
    """
    wait_time = between(0.05, 0.2) # High concurrency throughput simulation
    token = None

    def on_start(self):
        """
        Executes tenant registration & authentication on user spawn.
        """
        user_id = random.randint(1000, 999999)
        payload = {
            "organization_name": f"Benchmark Org {user_id}",
            "email": f"loaduser_{user_id}@benchmark.com",
            "password": "loadtest_password_123",
            "full_name": f"Benchmark User {user_id}"
        }
        response = self.client.post("/api/auth/register", json=payload)
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.headers = {}

    @task(5)
    def test_healthz_endpoint(self):
        """
        Tests high-frequency healthz endpoint throughput.
        """
        self.client.get("/api/healthz", name="/api/healthz")

    @task(4)
    def test_get_leads(self):
        """
        Tests tenant-isolated lead query performance.
        """
        if hasattr(self, "headers"):
            self.client.get("/api/leads?limit=50", headers=self.headers, name="/api/leads")

    @task(2)
    def test_metrics_endpoint(self):
        """
        Tests Prometheus metrics scrape endpoint performance.
        """
        self.client.get("/metrics", name="/metrics")

    @task(1)
    def test_scrape_endpoint(self):
        """
        Tests lead scrape trigger endpoint with Redis rate-limiting enforcement.
        """
        if hasattr(self, "headers"):
            queries = ["AI Startups San Francisco", "Fintech Lead Gen NYC", "B2B SaaS Companies", "Cybersecurity Vendors"]
            query = random.choice(queries)
            with self.client.post(
                "/api/scrape",
                json={"query": query},
                headers=self.headers,
                name="/api/scrape",
                catch_response=True
            ) as response:
                if response.status_code in [200, 429]: # 429 rate limit is expected under heavy load
                    response.success()
                else:
                    response.failure(f"Unexpected status code: {response.status_code}")


@events.test_stop.listener
def on_test_stop(environment, **kwargs):
    """
    Prints summary performance benchmark SLAs upon load test completion.
    """
    print("\n" + "="*80)
    print("⚡ LEAD GENERATOR ENTERPRISE LOAD TEST BENCHMARK SUMMARY")
    print("="*80)
    total_reqs = environment.stats.total.num_requests
    total_fails = environment.stats.total.num_failures
    rps = environment.stats.total.total_rps
    avg_latency = environment.stats.total.avg_response_time
    p95_latency = environment.stats.total.get_response_time_percentile(0.95)
    p99_latency = environment.stats.total.get_response_time_percentile(0.99)
    
    print(f"Total Requests:       {total_reqs:,}")
    print(f"Total Failures:       {total_fails:,} ({total_fails/max(1, total_reqs)*100:.2f}%)")
    print(f"Throughput (RPS):     {rps:,.2f} req/sec")
    print(f"Avg Response Time:    {avg_latency:.2f} ms")
    print(f"P95 Latency:          {p95_latency:.2f} ms")
    print(f"P99 Latency:          {p99_latency:.2f} ms")
    print("="*80 + "\n")
