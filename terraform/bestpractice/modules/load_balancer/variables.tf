variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "lb_security_group" {
  type = string
}

variable "app_port" {
  type = number
}

variable "certificate_arn" {
  type = string
}
