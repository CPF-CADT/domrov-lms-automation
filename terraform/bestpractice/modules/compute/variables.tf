variable "ami_id" {
  type = string
}

variable "instance_type" {
  type = string
}

variable "key_name" {
  type = string
}

variable "app_security_group" {
  type = string
}

variable "instance_profile_arn" {
  type = string
}

variable "user_data_path" {
  type = string
}

variable "environment" {
  type = string
}
