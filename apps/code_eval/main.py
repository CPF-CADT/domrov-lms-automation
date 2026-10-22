from multiprocessing import Process
import os
import threading
import time

from server.grpc_server import start_grpc_server
from server.worker_service import start_worker
from utils.cache_cleanup import cleanup_evaluation_cache
from utils.evaluation_workspace import EVALUATION_CACHE_ROOT


def _cleanup_loop():
    interval = int(os.getenv("EVALUATION_CACHE_CLEANUP_INTERVAL_SECONDS", str(60 * 60)))
    while True:
        try:
            cleanup_evaluation_cache(EVALUATION_CACHE_ROOT)
        except Exception as error:
            from utils.structured_logging import event
            event("cleanup_failure", str(error))
        time.sleep(interval)


if __name__ == "__main__":
    threading.Thread(target=_cleanup_loop, daemon=True, name="evaluation-cache-cleanup").start()
    worker_process = Process(target=start_worker)
    worker_process.start()
    start_grpc_server()
