# Alpha-Orion Telemetry Flush Script
#
# Purpose:
# This script connects to the Redis instance and performs a destructive purge
# of specific telemetry streams that were polluted by "dirty mock" data during
# the architectural transformation phase.
#
# Action:
# It deletes the Redis keys corresponding to the `opportunities` and
# `blockchain_stream` streams, effectively resetting them to a clean state.
#
# Pre-requisites:
# - Python 3.8+
# - `redis-py` library installed (`pip install redis`)
# - `REDIS_URL` environment variable must be set to your Redis instance URL.
#   Example: export REDIS_URL="redis://:password@hostname:port/0"
#
# Execution:
# python scripts/flush_redis_telemetry.py

import os
import redis

def flush_telemetry_streams():
    """
    Connects to Redis and deletes the specified stream keys to clear mock data.
    """
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        print("🔴 ERROR: REDIS_URL environment variable not set. Aborting.")
        exit(1)

    print(f"Connecting to Redis at {redis.from_url(redis_url).connection_pool.connection_kwargs.get('host')}:{redis.from_url(redis_url).connection_pool.connection_kwargs.get('port')}...")

    try:
        r = redis.from_url(redis_url, decode_responses=True)
        r.ping()
        print("✅ Connection successful.")
    except redis.exceptions.ConnectionError as e:
        print(f"🔴 ERROR: Could not connect to Redis. {e}")
        exit(1)

    streams_to_flush = ["opportunities", "blockchain_stream"]
    print(f"Executing destructive purge of the following streams: {', '.join(streams_to_flush)}")

    deleted_count = r.delete(*streams_to_flush)

    print(f"✅ Purge complete. {deleted_count} stream(s) deleted.")
    print("System is ready for Variant Execution Kernel activation.")

if __name__ == "__main__":
    flush_telemetry_streams()