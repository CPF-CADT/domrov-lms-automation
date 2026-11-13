from rq import Queue, SimpleWorker
from config.redis_connection import RedisSingleton
import os

def start_worker():
    # Show where the worker runs
    print("Current working directory:", os.getcwd())

    redis_conn = RedisSingleton.get_instance()
    q = Queue("submission_queue", connection=redis_conn)
    worker = SimpleWorker([q], connection=redis_conn)

    print("Redis worker started")
    worker.work(with_scheduler=True)
