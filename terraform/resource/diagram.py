from diagrams import Cluster, Diagram, Edge
from diagrams.aws.compute import EC2, AutoScaling
from diagrams.aws.database import ElastiCache, RDS
from diagrams.aws.network import ELB, Route53, CloudFront
from diagrams.aws.storage import S3
from diagrams.aws.general import Users

graph_attr = {"fontsize": "20", "bgcolor": "white"}

with Diagram(
    "Domrov LMS - Simplified Architecture",
    show=False,
    direction="LR",
    filename="domrov_architecture_v3",
    graph_attr=graph_attr,
):

    user = Users("Students/Instructors")
    dns = Route53("Route 53")

    with Cluster("AWS Cloud (Region: ap-southeast-1)"):

        # --- FRONTEND ---
        with Cluster("Frontend Static Hosting"):
            cf = CloudFront("CloudFront CDN")
            s3_frontend = S3("S3 - Frontend Assets")

        # --- NETWORK & COMPUTE ---
        with Cluster("Public Subnet"):
            alb = ELB("ALB")

        with Cluster("Private Subnet"):
            # Unified Service Layer
            with Cluster("Unified App Cluster"):
                app_nodes = [EC2("App Node 1"), EC2("App Node 2")]
                asg = AutoScaling("ASG")

            # --- DATA LAYER ---
            db_primary = RDS("RDS PostgreSQL")
            redis = ElastiCache("Redis")
            s3_data = S3("S3 - User Files")

    # --- USER FLOW ---
    user >> dns >> cf >> s3_frontend
    dns >> alb >> app_nodes

    # --- DATA ACCESS ---
    app_nodes >> db_primary
    app_nodes >> redis
    app_nodes >> s3_data
