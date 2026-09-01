# Configure these with your AWS values
aws_region         = "us-east-1"
environment        = "production"

# Replace with your VPC values (get from AWS Console → VPC)
vpc_id             = "vpc-xxxxxxxxxxxxxxxxx"
private_subnet_ids = ["subnet-xxxxxxxxxxxxxxxxx", "subnet-xxxxxxxxxxxxxxxxx"]
public_subnet_ids  = ["subnet-xxxxxxxxxxxxxxxxx", "subnet-xxxxxxxxxxxxxxxxx"]

# ACM certificate (must be in same region, validated)
certificate_arn    = "arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Your domain
domain_name        = "preview.yourdomain.com"
