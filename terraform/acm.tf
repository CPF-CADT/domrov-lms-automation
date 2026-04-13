# ACM Certificate for API endpoint
resource "aws_acm_certificate" "api" {
  domain_name       = "apii.domrov.app"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "domrov-api-cert"
  }
}

# ACM Certificate validation (DNS method)
resource "aws_acm_certificate_validation" "api" {
  certificate_arn = aws_acm_certificate.api.arn
}
