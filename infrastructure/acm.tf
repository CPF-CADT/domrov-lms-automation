# ACM Certificate for API endpoint
resource "aws_acm_certificate" "api" {
  domain_name       = "api.domrov.app"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "domrov-api-cert"
  }
}

# Validate the API certificate using Cloudflare DNS
data "cloudflare_zone" "main" {
  name = var.cloudflare_zone_name
}

resource "cloudflare_record" "api_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = data.cloudflare_zone.main.id
  name    = each.value.name
  type    = each.value.type
  content = each.value.record
  ttl     = 1
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn = aws_acm_certificate.api.arn
  depends_on      = [cloudflare_record.api_validation]
}

# DNS Record: Point api.domrov.app to ALB (dynamic DNS name)
resource "cloudflare_record" "api_alb" {
  zone_id = data.cloudflare_zone.main.id
  name    = "api" # Creates api.domrov.app
  type    = "CNAME"
  content = aws_lb.app_lb.dns_name # Dynamically references ALB DNS
  proxied = true                   # Orange Cloud - SSL + DDoS protection + caching
  ttl     = 1                      # Auto (proxied records ignore TTL)

  depends_on = [aws_acm_certificate_validation.api]
}
