from redis import RedisError
from rq import Queue, Retry
from config.redis_connection import RedisSingleton
import grpc
from job_handler.tasks import process_submission
from protos import tasks_pb2, tasks_pb2_grpc

class TasksQueueServicer(tasks_pb2_grpc.TasksQueueServicer):

    def __init__(self):
        self.q = Queue("submission_queue", connection=RedisSingleton.get_instance())

    def AddQueue(self, request, context):
        submission_id = request.submission_id.strip()

        if not submission_id:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "submission_id is required")

        try:
            self.q.enqueue(
                process_submission,
                submission_id,
                retry=Retry(max=3),
            )

            return tasks_pb2.TasksResponse(
                success=True,
                message="Task queued successfully",
            )

        except RedisError as e:
            context.abort(grpc.StatusCode.UNAVAILABLE, f"Redis unavailable: {str(e)}")

        except Exception as e:
            context.abort(grpc.StatusCode.INTERNAL, f"Failed to enqueue task: {str(e)}")
