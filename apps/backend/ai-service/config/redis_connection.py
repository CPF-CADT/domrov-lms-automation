# redis_connection.py
import os
from redis import Redis


class RedisSingleton:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = Redis.from_url(
                os.getenv("REDIS_URL"), decode_responses=False
            )
        return cls._instance
