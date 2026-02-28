# Terraform Backend Configuration
# CRITICAL: This configuration ensures secure state storage in Google Cloud Storage
# Do not commit this file with real bucket names - use tfvars or environment variables

terraform {
  # Use GCS backend for secure state storage
  # Uncomment and configure after creating the GCS bucket
  
  # backend "gcs" {
  #   bucket = "alpha-orion-terraform-state"
  #   prefix = "production"
  #   credentials = "path/to/service-account-key.json"
  # }
  
  # Optional: Enable state versioning
  # versioning = true
  
  # Optional: Enable encryption at rest
  # encryption = true
}

# =============================================================================
# TERRAFORM STATE SECURITY CONFIGURATION
# =============================================================================
# 
# IMPORTANT: For production, configure a GCS bucket with:
# 1. Versioning enabled (to maintain state history)
# 2. Bucket lock (to prevent accidental deletion)
# 3. Customer-managed encryption keys (CMEK)
# 4. Access logging
#
# To create the bucket:
# gsutil mb -l us-central1 gs://alpha-orion-terraform-state
# gsutil versioning set on gs://alpha-orion-terraform-state
#
# Then uncomment the backend block above and run:
# terraform init
# =============================================================================

# Local state for development (do not use in production)
# terraform {
#   backend "local" {
#     path = "terraform.tfstate"
#   }
# }
