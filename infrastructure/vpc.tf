# 1. Create VPC
resource "aws_vpc" "my_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "domrov-vpc" }
}

# 2. Public Subnets (For the ALB)
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.my_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "ap-southeast-1a"
  map_public_ip_on_launch = true # Essential for public subnets
  tags                    = { Name = "public-subnet-a" }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.my_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "ap-southeast-1b"
  map_public_ip_on_launch = true # Essential for public subnets
  tags                    = { Name = "public-subnet-b" }
}

# 3. Private Subnets (For App Nodes, RDS, and Redis)
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.my_vpc.id
  cidr_block        = "10.0.9.0/24"
  availability_zone = "ap-southeast-1a"
  tags              = { Name = "private-subnet-a" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.my_vpc.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "ap-southeast-1b"
  tags              = { Name = "private-subnet-b" }
}


# 4. Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.my_vpc.id
  tags   = { Name = "main-igw" }
}

# 4.5 Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain     = "vpc"
  tags       = { Name = "domrov-nat-eip" }
  depends_on = [aws_internet_gateway.igw]
}

# 4.6 NAT Gateway in Public Subnet
resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
  tags          = { Name = "domrov-nat-gw" }
  depends_on    = [aws_internet_gateway.igw]
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

resource "aws_route_table_association" "public_b_assoc" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public_rt.id
}


# 6. Private Route Table (Routes through NAT Gateway)
resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.my_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = { Name = "private-rt" }
}

resource "aws_route_table_association" "private_a_assoc" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private_rt.id
}

resource "aws_route_table_association" "private_b_assoc" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private_rt.id
}




