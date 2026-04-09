output "bucket_name" {
  value = cloudflare_r2_bucket.main.bucket_name
}

output "bucket_endpoint" {
  value = "https://${cloudflare_r2_bucket.main.bucket_name}.${var.account_id}.r2.cloudflarestorage.com"
}

output "public_endpoint" {
  value = "https://${cloudflare_r2_bucket.main.bucket_name}.r2.cloudflarestorage.com"
  description = "Use this endpoint for public/presigned URLs"
}

output "account_id" {
  value = var.account_id
}
