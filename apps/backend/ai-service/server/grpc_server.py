import grpc
from concurrent import futures


from grpc_services.submission_servicer import SubmissionServicer
from grpc_services.task_queue_servicer import TasksQueueServicer
from protos import tasks_pb2_grpc
from protos import submission_pb2_grpc


def start_grpc_server():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=5))
    submission_pb2_grpc.add_SubmissionServiceServicer_to_server(
        SubmissionServicer(), server
    )
    tasks_pb2_grpc.add_TasksQueueServicer_to_server(TasksQueueServicer(), server)
    server.add_insecure_port(
        # f"{os.getenv('CODE_EVAL_GRPC_HOST')}:{os.getenv('CODE_EVAL_GRPC_PORT')}"
        f"0.0.0.0:50051"
    )
    server.start()
    print("gRPC server running on port 50051")
    server.wait_for_termination()
