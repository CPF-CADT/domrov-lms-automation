Of course. Here is the detailed overview of your Terraform infrastructure in Markdown format:

# Terraform Infrastructure Overview

This document provides a detailed breakdown of the AWS infrastructure provisioned by this Terraform project. The goal is to create a scalable, secure, and automated environment for a containerized application.

### 1. Networking (`vpc.tf`)

The foundation of the infrastructure is a custom Virtual Private Cloud (VPC), which provides a logically isolated section of the AWS Cloud.

*   **`aws_vpc`**: Creates the main VPC with a `10.0.0.0/16` CIDR block.
*   **`aws_subnet`**:
    *   **Public Subnets (`public_a`, `public_b`):** Two public subnets are created in different Availability Zones (`ap-southeast-1a`, `ap-southeast-1b`). These are designated for internet-facing resources like the Application Load Balancer. They have `map_public_ip_on_launch` set to `true`.
    *   **Private Subnets (`private_a`, `private_b`):** Two private subnets are also created across the same two Availability Zones. These will host the application's EC2 instances, isolating them from direct internet access to enhance security.
*   **`aws_internet_gateway`**: An Internet Gateway is attached to the VPC to allow communication between resources in the VPC and the internet.
*   **`aws_route_table` & `aws_route_table_association`**:
    *   A **public route table** is created with a route to the Internet Gateway (`0.0.0.0/0`). This route table is associated with the public subnets.
    *   A **private route table** is created without a route to the Internet Gateway. This is associated with the private subnets, preventing resources within them from being directly accessible from the internet.

### 2. Security (security.tf & `iam.tf`)

Security is managed through a combination of network firewalls and identity-based permissions.

*   **`aws_security_group`**:
    *   **Load Balancer SG (`lb_sg`):** This security group is attached to the Application Load Balancer. It allows inbound traffic on port 80 (HTTP) from anywhere (`0.0.0.0/0`).
    *   **Application SG (`app_sg`):** This is attached to the EC2 instances. It is configured to only allow inbound traffic from the load balancer's security group, ensuring that all requests are funneled through the ALB. It also allows SSH access from a specified IP for maintenance.
*   **`aws_iam_role` & `aws_iam_role_policy_attachment`**:
    *   **ECS Task Execution Role:** Grants the ECS agent permission to make AWS API calls on your behalf (e.g., to pull images from ECR).
    *   **ECS Instance Role:** This role is attached to the EC2 instances, allowing them to connect to the ECS cluster and run ECS tasks.
*   **`aws_iam_instance_profile`**: Wraps the EC2 instance role so it can be attached to the EC2 instances via the launch template.

### 3. Compute (compute.tf & `autoscaling.tf`)

This layer defines the servers that will run the application containers.

*   **`aws_launch_template` (`ecs_launch_template`):**
    *   Acts as a blueprint for the EC2 instances.
    *   It specifies the Amazon Machine Image (AMI) to use (an ECS-optimized AMI is automatically looked up).
    *   It attaches the correct IAM instance profile and security groups.
    *   It includes a `user_data` script that runs on instance launch to register the instance with the specified ECS cluster.
*   **`aws_autoscaling_group` (`ecs_asg`):**
    *   This resource ensures that a desired number of EC2 instances are always running.
    *   It is configured to launch instances across the two private subnets for high availability.
    *   It automatically scales the number of instances between a minimum of 1 and a maximum of 4 based on future scaling policies (not yet defined).

### 4. Container Orchestration (`ecs.tf`)

Amazon Elastic Container Service (ECS) is used to deploy, manage, and scale the containerized application.

*   **`aws_ecs_cluster`**: Creates a logical cluster to group the EC2 container instances.
*   **`aws_ecs_task_definition`**:
    *   This is the core blueprint for the application.
    *   It defines the container to be run, referencing a Docker image specified in the `app_image` variable.
    *   It sets CPU and memory allocations for the container.
    *   It uses `bridge` network mode, which is appropriate for the EC2 launch type.
*   **`aws_ecs_service`**:
    *   This service is responsible for running and maintaining a specified number of instances of the task definition on the cluster.
    *   It is configured with a `desired_count` of 2, meaning ECS will always try to keep two copies of the container running.
    *   Crucially, it links the service to the Application Load Balancer's target group, so new containers are automatically registered to receive traffic.

### 5. Traffic Management (`load_balancer.tf`)

This layer makes the application accessible from the internet and distributes traffic.

*   **`aws_lb` (Application Load Balancer):**
    *   An ALB is created in the public subnets to serve as the single entry point for all incoming traffic.
*   **`aws_lb_target_group`**:
    *   This group acts as a target for the load balancer. The ECS service automatically registers its container tasks with this group.
    *   It includes a health check configuration, so the load balancer can automatically detect and stop sending traffic to unhealthy containers.
*   **`aws_lb_listener`**:
    *   A listener is attached to the load balancer to check for incoming connections on port 80 (HTTP).
    *   It is configured with a default action to forward all received traffic to the target group.