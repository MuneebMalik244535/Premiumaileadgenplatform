"""
Redis Client & PubSub Wrapper for Scraper Progress Streaming.
"""
import os
import redis.asyncio as aioredis
from typing import AsyncGenerator

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

async def get_redis_client():
    return aioredis.from_url(REDIS_URL, decode_responses=True)

async def publish_log(channel: str, message: str):
    try:
        redis = await get_redis_client()
        await redis.publish(f"task_channel:{channel}", message)
        await redis.close()
    except Exception as e:
        print(f"[Redis Pub Error]: {e}")

async def subscribe_log(channel: str) -> AsyncGenerator[str, None]:
    redis = await get_redis_client()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"task_channel:{channel}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                yield message["data"]
    finally:
        await pubsub.unsubscribe(f"task_channel:{channel}")
        await redis.close()
