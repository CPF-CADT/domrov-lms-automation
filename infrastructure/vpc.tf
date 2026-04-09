provider "aws" {
  region = "ap-southeast-1"
}

# 1. Create VPC
resource "aws_vpc" "my_vpc" {
  cidr_block = "10.0.0.0/16"
  tags = { Name = "domrov-vpc" }
}

# 2. Public Subnets (For the ALB)
resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.my_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "ap-southeast-1a"
  map_public_ip_on_launch = true # Essential for public subnets
  tags = { Name = "public-subnet-a" }
}



# 3. Private Subnets (For App Nodes, RDS, and Redis)
resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.my_vpc.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "ap-southeast-1b"
  tags = { Name = "private-subnet-b" }
}


# 4. Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.my_vpc.id
  tags = { Name = "main-igw" }
}

# 5. Public Route Table (Connects Public Subnets to Internet)
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.my_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "public_a_assoc" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public_rt.id
}


# 6. Private Route Table (No Internet Gateway = Private)
resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.my_vpc.id
  tags   = { Name = "private-rt" }
}

resource "aws_route_table_association" "private_b_assoc" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private_rt.id
}

