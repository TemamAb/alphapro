variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "alpha-orion"
}

variable "region_us" {
  description = "US region"
  type        = string
  default     = "us-central1"
}

variable "region_eu" {
  description = "EU region"
  type        = string
  default     = "europe-west1"
}

variable "zone_us" {
  description = "US zone"
  type        = string
  default     = "us-central1-a"
}

variable "zone_eu" {
  description = "EU zone"
  type        = string
  default     = "europe-west1-b"
}

variable "kms_key_ring" {
  description = "KMS key ring name"
  type        = string
  default     = "alpha-orion-key-ring"
}

variable "kms_key" {
  description = "KMS key name"
  type        = string
  default     = "alpha-orion-key"
}

variable "alloydb_cluster_name" {
  description = "AlloyDB cluster name"
  type        = string
  default     = "alloydb-primary-us"
}

variable "alloydb_secondary_cluster_name" {
  description = "AlloyDB secondary cluster name"
  type        = string
  default     = "alloydb-secondary-eu"
}

variable "redis_name_us" {
  description = "Redis instance name US"
  type        = string
  default     = "redis-cache-us"
}

variable "redis_name_eu" {
  description = "Redis instance name EU"
  type        = string
  default     = "redis-cache-eu"
}

variable "gcs_bucket_name" {
  description = "GCS bucket name"
  type        = string
  default     = "alpha-orion-market-data-lake"
}

variable "bigquery_dataset_name" {
  description = "BigQuery dataset name"
  type        = string
  default     = "flash_loan_historical_data"
}

variable "bigtable_instance_name" {
  description = "Bigtable instance name"
  type        = string
  default     = "flash-loan-bigtable"
}

variable "pubsub_topics" {
  description = "List of Pub/Sub topics"
  type        = list(string)
  default     = ["scanner-output-topic", "execution-request-topic", "processed-opportunities-us", "processed-opportunities-eu", "raw-opportunities"]
}

variable "secrets" {
  description = "List of secrets"
  type        = list(string)
  default     = ["pimlico-api-secret", "db-secret", "withdrawal-wallet-secret"]
}

variable "services" {
  description = "List of Cloud Run services"
  type        = map(object({
    name       = string
    image      = string
    region     = string
    ingress    = string
    cpu        = string
    memory     = string
    min_instances = number
    max_instances = number
    env_vars   = map(string)
    secrets    = map(string)
  }))
  default = {
    "dashboard-frontend" = {
      name = "dashboard-frontend"
      image = "gcr.io/alpha-orion/dashboard-frontend:latest"
      region = "us-central1"
      ingress = "INTERNAL_LOAD_BALANCER"
      cpu = "1000m"
      memory = "512Mi"
      min_instances = 1
      max_instances = 10
      env_vars = {}
      secrets = {}
    }
    "ai-terminal-frontend" = {
      name = "ai-terminal-frontend"
      image = "gcr.io/alpha-orion/ai-terminal-frontend:latest"
      region = "us-central1"
      ingress = "INTERNAL_LOAD_BALANCER"
      cpu = "1000m"
      memory = "512Mi"
      min_instances = 1
      max_instances = 10
      env_vars = {}
      secrets = {}
    }
    "dashboard-frontend-eu" = {
      name = "dashboard-frontend-eu"
      image = "gcr.io/alpha-orion/dashboard-frontend:latest"
      region = "europe-west1"
      ingress = "INTERNAL_LOAD_BALANCER"
      cpu = "1000m"
      memory = "512Mi"
      min_instances = 1
      max_instances = 10
      env_vars = {}
      secrets = {}
    }
    "ai-terminal-frontend-eu" = {
      name = "ai-terminal-frontend-eu"
      image = "gcr.io/alpha-orion/ai-terminal-frontend:latest"
      region = "europe-west1"
      ingress = "INTERNAL_LOAD_BALANCER"
      cpu = "1000m"
      memory = "512Mi"
      min_instances = 1
      max_instances = 10
      env_vars = {}
      secrets = {}
    }
    "user-api-service" = {
      name = "user-api-service"
      image = "gcr.io/alpha-orion/user-api-service:latest"
      region = "us-central1"
      ingress = "INTERNAL_LOAD_BALANCER"
      cpu = "1000m"
      memory = "512Mi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {
        "DB_SECRET" = "db-secret"
      }
    }
    "user-api-service-eu" = {
      name = "user-api-service-eu"
      image = "gcr.io/alpha-orion/user-api-service:latest"
      region = "europe-west1"
      ingress = "INTERNAL_LOAD_BALANCER"
      cpu = "1000m"
      memory = "512Mi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {
        "DB_SECRET" = "db-secret"
      }
    }
    "withdrawal-service" = {
      name = "withdrawal-service"
      image = "gcr.io/alpha-orion/withdrawal-service:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "512Mi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {
        "WITHDRAWAL_WALLET_SECRET" = "withdrawal-wallet-secret"
      }
    }
    "withdrawal-service-eu" = {
      name = "withdrawal-service-eu"
      image = "gcr.io/alpha-orion/withdrawal-service:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "512Mi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {
        "WITHDRAWAL_WALLET_SECRET" = "withdrawal-wallet-secret"
      }
    }
    "eye-scanner" = {
      name = "eye-scanner"
      image = "gcr.io/alpha-orion/eye-scanner:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 20
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {}
    }
    "eye-scanner-eu" = {
      name = "eye-scanner-eu"
      image = "gcr.io/alpha-orion/eye-scanner:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 20
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {}
    }
    "brain-orchestrator" = {
      name = "brain-orchestrator"
      image = "gcr.io/alpha-orion/brain-orchestrator:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "2Gi"
      min_instances = 1
      max_instances = 20
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {}
    }
    "brain-orchestrator-eu" = {
      name = "brain-orchestrator-eu"
      image = "gcr.io/alpha-orion/brain-orchestrator:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "2Gi"
      min_instances = 1
      max_instances = 20
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {}
    }
    "ai-optimizer" = {
      name = "ai-optimizer"
      image = "gcr.io/alpha-orion/ai-optimizer:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "2Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {}
    }
    "ai-optimizer-eu" = {
      name = "ai-optimizer-eu"
      image = "gcr.io/alpha-orion/ai-optimizer:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "2Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {}
    }
    "ai-agent-service" = {
      name = "ai-agent-service"
      image = "gcr.io/alpha-orion/ai-agent-service:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "2Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {}
    }
    "ai-agent-service-eu" = {
      name = "ai-agent-service-eu"
      image = "gcr.io/alpha-orion/ai-agent-service:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "2Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {}
    }
    "benchmarking-scraper-service" = {
      name = "benchmarking-scraper-service"
      image = "gcr.io/alpha-orion/benchmarking-scraper-service:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 5
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {}
    }
    "benchmarking-scraper-service-eu" = {
      name = "benchmarking-scraper-service-eu"
      image = "gcr.io/alpha-orion/benchmarking-scraper-service:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 5
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {}
    }
    "brain-strategy-engine" = {
      name = "brain-strategy-engine"
      image = "gcr.io/alpha-orion/brain-strategy-engine:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "2Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {}
    }
    "brain-strategy-engine-eu" = {
      name = "brain-strategy-engine-eu"
      image = "gcr.io/alpha-orion/brain-strategy-engine:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "2Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {}
    }
    "order-management-service" = {
      name = "order-management-service"
      image = "gcr.io/alpha-orion/order-management-service:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {}
    }
    "order-management-service-eu" = {
      name = "order-management-service-eu"
      image = "gcr.io/alpha-orion/order-management-service:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {}
    }
    "brain-risk-management" = {
      name = "brain-risk-management"
      image = "gcr.io/alpha-orion/brain-risk-management:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {}
    }
    "brain-risk-management-eu" = {
      name = "brain-risk-management-eu"
      image = "gcr.io/alpha-orion/brain-risk-management:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {}
    }
    "dataflow-market-data-ingestion" = {
      name = "dataflow-market-data-ingestion"
      image = "gcr.io/alpha-orion/dataflow-market-data-ingestion:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "4Gi"
      min_instances = 1
      max_instances = 5
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
      }
      secrets = {}
    }
    "dataflow-market-data-ingestion-eu" = {
      name = "dataflow-market-data-ingestion-eu"
      image = "gcr.io/alpha-orion/dataflow-market-data-ingestion:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "4Gi"
      min_instances = 1
      max_instances = 5
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
      }
      secrets = {}
    }
    "dataflow-cep" = {
      name = "dataflow-cep"
      image = "gcr.io/alpha-orion/dataflow-cep:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "4Gi"
      min_instances = 1
      max_instances = 5
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
      }
      secrets = {}
    }
    "dataflow-cep-eu" = {
      name = "dataflow-cep-eu"
      image = "gcr.io/alpha-orion/dataflow-cep:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "4Gi"
      min_instances = 1
      max_instances = 5
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
      }
      secrets = {}
    }
    "hand-blockchain-proxy" = {
      name = "hand-blockchain-proxy"
      image = "gcr.io/alpha-orion/hand-blockchain-proxy:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {
        "PIMLICO_API_SECRET" = "pimlico-api-secret"
      }
    }
    "hand-blockchain-proxy-eu" = {
      name = "hand-blockchain-proxy-eu"
      image = "gcr.io/alpha-orion/hand-blockchain-proxy:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {
        "PIMLICO_API_SECRET" = "pimlico-api-secret"
      }
    }
    "hand-smart-order-router" = {
      name = "hand-smart-order-router"
      image = "gcr.io/alpha-orion/hand-smart-order-router:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {}
    }
    "hand-smart-order-router-eu" = {
      name = "hand-smart-order-router-eu"
      image = "gcr.io/alpha-orion/hand-smart-order-router:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "1000m"
      memory = "1Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {}
    }
    "brain-ai-optimization-orchestrator" = {
      name = "brain-ai-optimization-orchestrator"
      image = "gcr.io/alpha-orion/brain-ai-optimization-orchestrator:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "4Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {}
    }
    "brain-ai-optimization-orchestrator-eu" = {
      name = "brain-ai-optimization-orchestrator-eu"
      image = "gcr.io/alpha-orion/brain-ai-optimization-orchestrator:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "4Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "PROJECT_ID" = "alpha-orion"
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {}
    }
    "brain-simulation" = {
      name = "brain-simulation"
      image = "gcr.io/alpha-orion/brain-simulation:latest"
      region = "us-central1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "4Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-primary-us:5432/db"
        "REDIS_URL" = "redis://redis-cache-us:6379"
      }
      secrets = {}
    }
    "brain-simulation-eu" = {
      name = "brain-simulation-eu"
      image = "gcr.io/alpha-orion/brain-simulation:latest"
      region = "europe-west1"
      ingress = "INTERNAL_ONLY"
      cpu = "2000m"
      memory = "4Gi"
      min_instances = 1
      max_instances = 10
      env_vars = {
        "DATABASE_URL" = "postgresql://user:password@alloydb-secondary-eu:5432/db"
        "REDIS_URL" = "redis://redis-cache-eu:6379"
      }
      secrets = {}
    }
  }
}
