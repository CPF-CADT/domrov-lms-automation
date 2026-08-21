from multiprocessing import Process

from server.grpc_server import start_grpc_server
from server.worker_service import start_worker


if __name__ == "__main__":
    worker_process = Process(target=start_worker)
    worker_process.start()
    start_grpc_server()
