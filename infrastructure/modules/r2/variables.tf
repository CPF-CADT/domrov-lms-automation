variable "account_id" {
  type        = string
  description = "Cloudflare Account ID"
}

variable "environment" {
  type = string
}

variable "bucket_name" {
  type = string
}

variable "purpose" {
  type        = string
  description = "Bucket purpose: 'user-files', 'assignments', or 'frontend'"
}

variable "allowed_origins" {
  type    = list(string)
  default = []
  description = "CORS allowed origins for browser uploads"
}
