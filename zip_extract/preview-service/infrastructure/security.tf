# ============================================
# ENTERPRISE SECURITY ENHANCEMENTS
# ============================================
# This file contains additional security controls for enterprise deployments
# Include after main.tf to add:
# - WAF with rate limiting and common attack protection
# - Restricted network egress for workers
# - VPC Endpoints for private AWS service access
# - Enhanced monitoring and alerting
# - Secrets management

# ============================================
# VARIABLES
# ============================================

variable "enable_waf" {
  description = "Enable WAF protection"
  type        = bool
  default     = true
}

variable "rate_limit_per_ip" {
  description = "Maximum requests per IP per 5 minutes"
  type        = number
  default     = 2000
}

variable "enable_network_restrictions" {
  description = "Enable network egress restrictions for workers"
  type        = bool
  default     = true
}

# ============================================
# WAF WEB ACL
# ============================================

resource "aws_wafv2_web_acl" "preview" {
  count = var.enable_waf ? 1 : 0

  name        = "unison-preview-waf"
  description = "WAF for Preview Service"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitPerIP"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_per_ip
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "RateLimitPerIP"
      sampled_requests_enabled  = true
    }
  }

  # AWS Managed Rules - Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled  = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled  = true
    }
  }

  # AWS Managed Rules - SQL Injection Protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesSQLiRuleSet"
      sampled_requests_enabled  = true
    }
  }

  # Block requests from known bad IPs
  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 40

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name               = "AWSManagedRulesAmazonIpReputationList"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "UnisonPreviewWAF"
    sampled_requests_enabled  = true
  }

  tags = {
    Name = "unison-preview-waf"
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "preview" {
  count = var.enable_waf ? 1 : 0

  resource_arn = aws_lb.preview.arn
  web_acl_arn  = aws_wafv2_web_acl.preview[0].arn
}

# ============================================
# RESTRICTED WORKER SECURITY GROUP
# ============================================

# Replace the open egress worker SG with restricted egress
resource "aws_security_group" "worker_restricted" {
  count = var.enable_network_restrictions ? 1 : 0

  name        = "unison-preview-worker-restricted-sg"
  description = "Restricted security group for Preview Workers"
  vpc_id      = var.vpc_id

  # Allow inbound from gateway only
  ingress {
    from_port       = 4173
    to_port         = 4173
    protocol        = "tcp"
    security_groups = [aws_security_group.gateway.id]
    description     = "Vite dev server from gateway"
  }

  # RESTRICTED EGRESS - Only allow necessary traffic

  # Allow HTTPS to VPC endpoints and specific services
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
    description = "HTTPS to VPC endpoints"
  }

  # Allow DNS resolution
  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
    description = "DNS resolution"
  }

  # Allow communication with gateway
  egress {
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.gateway.id]
    description     = "Communication back to gateway"
  }

  tags = {
    Name = "unison-preview-worker-restricted-sg"
  }
}

data "aws_vpc" "main" {
  id = var.vpc_id
}

# ============================================
# VPC ENDPOINTS (Private AWS Access)
# ============================================

# ECR API endpoint
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "unison-ecr-api-endpoint"
  }
}

# ECR DKR endpoint (for Docker pulls)
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "unison-ecr-dkr-endpoint"
  }
}

# S3 Gateway endpoint (for ECR layers)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = data.aws_route_tables.private.ids

  tags = {
    Name = "unison-s3-endpoint"
  }
}

# CloudWatch Logs endpoint
resource "aws_vpc_endpoint" "logs" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "unison-logs-endpoint"
  }
}

# Security group for VPC endpoints
resource "aws_security_group" "vpc_endpoints" {
  name        = "unison-vpc-endpoints-sg"
  description = "Security group for VPC endpoints"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
    description = "HTTPS from VPC"
  }

  tags = {
    Name = "unison-vpc-endpoints-sg"
  }
}

data "aws_route_tables" "private" {
  vpc_id = var.vpc_id

  filter {
    name   = "association.subnet-id"
    values = var.private_subnet_ids
  }
}

# ============================================
# SECRETS MANAGER
# ============================================

resource "aws_secretsmanager_secret" "supabase" {
  name        = "unison/preview/supabase"
  description = "Supabase credentials for preview service"

  recovery_window_in_days = 7

  tags = {
    Name = "unison-supabase-secret"
  }
}

# ============================================
# CLOUDWATCH ALARMS
# ============================================

# High CPU alarm
resource "aws_cloudwatch_metric_alarm" "gateway_cpu_high" {
  alarm_name          = "unison-preview-gateway-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Gateway CPU utilization is high"

  dimensions = {
    ClusterName = aws_ecs_cluster.preview.name
    ServiceName = aws_ecs_service.gateway.name
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
}

# High memory alarm
resource "aws_cloudwatch_metric_alarm" "gateway_memory_high" {
  alarm_name          = "unison-preview-gateway-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Gateway memory utilization is high"

  dimensions = {
    ClusterName = aws_ecs_cluster.preview.name
    ServiceName = aws_ecs_service.gateway.name
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
}

# WAF blocked requests alarm
resource "aws_cloudwatch_metric_alarm" "waf_blocked_high" {
  count = var.enable_waf ? 1 : 0

  alarm_name          = "unison-preview-waf-blocked-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 1000
  alarm_description   = "High number of blocked requests - potential attack"

  dimensions = {
    WebACL = aws_wafv2_web_acl.preview[0].name
    Rule   = "ALL"
    Region = var.aws_region
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
}

# 5xx error rate alarm
resource "aws_cloudwatch_metric_alarm" "alb_5xx_high" {
  alarm_name          = "unison-preview-alb-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "High 5xx error rate from targets"

  dimensions = {
    LoadBalancer = aws_lb.preview.arn_suffix
    TargetGroup  = aws_lb_target_group.gateway.arn_suffix
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
  ok_actions    = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []
}

variable "alarm_sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarms"
  type        = string
  default     = ""
}

# ============================================
# OUTPUTS
# ============================================

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = var.enable_waf ? aws_wafv2_web_acl.preview[0].arn : null
}

output "vpc_endpoints" {
  description = "VPC Endpoint IDs"
  value = {
    ecr_api = aws_vpc_endpoint.ecr_api.id
    ecr_dkr = aws_vpc_endpoint.ecr_dkr.id
    s3      = aws_vpc_endpoint.s3.id
    logs    = aws_vpc_endpoint.logs.id
  }
}
