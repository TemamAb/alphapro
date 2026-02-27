terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region_us
}

# KMS Key Ring
resource "google_kms_key_ring" "key_ring" {
  name     = var.kms_key_ring
  location = var.region_us
}

# KMS Key
resource "google_kms_crypto_key" "key" {
  name     = var.kms_key
  key_ring = google_kms_key_ring.key_ring.id
}

# AlloyDB Primary Cluster
resource "google_alloydb_cluster" "primary" {
  cluster_id = var.alloydb_cluster_name
  location   = var.region_us

  network_config {
    network = "default"
  }

  encryption_config {
    kms_key_name = google_kms_crypto_key.key.id
  }

  initial_user {
    user     = "postgres"
    password = "changeme"  # Use secret manager in production
  }

  automated_backup_policy {
    location      = var.region_us
    backup_window = "1800s"
    enabled       = true

    weekly_schedule {
      days_of_week = ["SUNDAY"]
      start_times {
        hours   = 23
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }
}

# AlloyDB Primary Instance
resource "google_alloydb_instance" "primary_instance" {
  cluster       = google_alloydb_cluster.primary.cluster_id
  instance_id   = "primary-instance"
  instance_type = "PRIMARY"

  machine_config {
    cpu_count = 2
  }
}

# AlloyDB Secondary Cluster
resource "google_alloydb_cluster" "secondary" {
  cluster_id   = var.alloydb_secondary_cluster_name
  location     = var.region_eu
  cluster_type = "SECONDARY"

  network_config {
    network = "default"
  }

  encryption_config {
    kms_key_name = google_kms_crypto_key.key.id
  }

  automated_backup_policy {
    location      = var.region_eu
    backup_window = "1800s"
    enabled       = true

    weekly_schedule {
      days_of_week = ["SUNDAY"]
      start_times {
        hours   = 23
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }

  depends_on = [google_alloydb_cluster.primary]
}

# AlloyDB Secondary Instance
resource "google_alloydb_instance" "secondary_instance" {
  cluster       = google_alloydb_cluster.secondary.cluster_id
  instance_id   = "secondary-instance"
  instance_type = "READ_POOL"

  machine_config {
    cpu_count = 2
  }

  read_pool_config {
    node_count = 1
  }
}

# Redis US
resource "google_redis_instance" "redis_us" {
  name           = var.redis_name_us
  tier           = "STANDARD_HA"
  memory_size_gb = 1

  region = var.region_us

  redis_version = "REDIS_6_X"

  persistence_config {
    persistence_mode    = "RDB"
    rdb_snapshot_period = "ONE_HOUR"
  }

  customer_managed_key = google_kms_crypto_key.key.id
}

# Redis EU
resource "google_redis_instance" "redis_eu" {
  name           = var.redis_name_eu
  tier           = "STANDARD_HA"
  memory_size_gb = 1

  region = var.region_eu

  redis_version = "REDIS_6_X"

  persistence_config {
    persistence_mode    = "RDB"
    rdb_snapshot_period = "ONE_HOUR"
  }

  customer_managed_key = google_kms_crypto_key.key.id
}

# GCS Bucket
resource "google_storage_bucket" "market_data_lake" {
  name          = var.gcs_bucket_name
  location      = "US"
  storage_class = "STANDARD"

  encryption {
    default_kms_key_name = google_kms_crypto_key.key.id
  }

  versioning {
    enabled = true
  }
}

# BigQuery Dataset
resource "google_bigquery_dataset" "historical_data" {
  dataset_id = var.bigquery_dataset_name
  location   = var.region_us

  encryption_configuration {
    kms_key_name = google_kms_crypto_key.key.id
  }
}

# Bigtable Instance
resource "google_bigtable_instance" "bigtable" {
  name = var.bigtable_instance_name

  cluster {
    cluster_id   = "bigtable-cluster-us"
    zone         = var.zone_us
    num_nodes    = 3
    storage_type = "SSD"
  }

  cluster {
    cluster_id   = "bigtable-cluster-eu"
    zone         = var.zone_eu
    num_nodes    = 3
    storage_type = "SSD"
  }
}

# Pub/Sub Topics
resource "google_pubsub_topic" "topics" {
  for_each = toset(var.pubsub_topics)
  name     = each.value
}

# Secret Manager Secrets
resource "google_secret_manager_secret" "secrets" {
  for_each = toset(var.secrets)
  secret_id = each.value

  replication {
    automatic = true
  }
}

# Cloud Run Services
resource "google_cloud_run_service" "services" {
  for_each = var.services

  name     = each.value.name
  location = each.value.region

  template {
    spec {
      containers {
        image = each.value.image

        resources {
          limits = {
            cpu    = each.value.cpu
            memory = each.value.memory
          }
        }

        dynamic "env" {
          for_each = each.value.env_vars
          content {
            name  = env.key
            value = env.value
          }
        }

        dynamic "env" {
          for_each = each.value.secrets
          content {
            name = env.key
            value_from {
              secret_key_ref {
                name = google_secret_manager_secret.secrets[env.value].secret_id
                key  = "latest"
              }
            }
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = tostring(each.value.min_instances)
        "autoscaling.knative.dev/maxScale" = tostring(each.value.max_instances)
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  metadata {
    annotations = {
      "run.googleapis.com/ingress" = each.value.ingress
    }
  }
}

# IAM for services
resource "google_project_iam_member" "storage_admin" {
  for_each = {
    for k, v in var.services : k => v if k == "eye-scanner" || k == "eye-scanner-eu"
  }
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_cloud_run_service.services[each.key].template[0].spec[0].service_account_name}"
}

resource "google_project_iam_member" "aiplatform_user" {
  for_each = {
    for k, v in var.services : k => v if contains(["ai-optimizer", "ai-agent-service"], k)
  }
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_cloud_run_service.services[each.key].template[0].spec[0].service_account_name}"
}

resource "google_secret_manager_secret_iam_member" "secret_accessor" {
  for_each = {
    for pair in flatten([
      for service_key, service in var.services : [
        for secret_key, secret_name in service.secrets : {
          service_key = service_key
          secret_name = secret_name
        }
      ]
    ]) : "${pair.service_key}-${pair.secret_name}" => pair
  }

  secret_id = google_secret_manager_secret.secrets[each.value.secret_name].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_cloud_run_service.services[each.value.service_key].template[0].spec[0].service_account_name}"
}

# Global Load Balancer
resource "google_compute_global_address" "lb_ip" {
  name = "flash-loan-lb-ip"
}

resource "google_compute_global_forwarding_rule" "lb_frontend" {
  name       = "flash-loan-lb-global-lb-frontend"
  target     = google_compute_target_http_proxy.lb_proxy.id
  port_range = "80"
  ip_address = google_compute_global_address.lb_ip.address
}

resource "google_compute_target_http_proxy" "lb_proxy" {
  name    = "flash-loan-lb-global-lb-frontend"
  url_map = google_compute_url_map.lb_url_map.id
}

resource "google_compute_url_map" "lb_url_map" {
  name            = "flash-loan-lb-global-lb-frontend"
  default_service = google_compute_backend_service.lb_backend.id
}

resource "google_compute_backend_service" "lb_backend" {
  name                  = "flash-loan-lb-global-lb-backend"
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL"
  timeout_sec           = 30

  backend {
    group = google_compute_region_network_endpoint_group.neg_us.id
  }

  backend {
    group = google_compute_region_network_endpoint_group.neg_eu.id
  }
}

resource "google_compute_region_network_endpoint_group" "neg_us" {
  name                  = "flash-loan-lb-global-lb-backend"
  network_endpoint_type = "SERVERLESS"
  region                = var.region_us

  cloud_run {
    service = google_cloud_run_service.services["dashboard-frontend"].name
  }
}

resource "google_compute_region_network_endpoint_group" "neg_eu" {
  name                  = "flash-loan-lb-global-lb-backend-ai-terminal"
  network_endpoint_type = "SERVERLESS"
  region                = var.region_eu

  cloud_run {
    service = google_cloud_run_service.services["dashboard-frontend-eu"].name
  }
}

# SSL Certificate
resource "google_compute_managed_ssl_certificate" "lb_cert" {
  name = "flash-loan-lb-ssl-cert"

  managed {
    domains = ["flashloan.example.com"]
  }
}

# HTTPS Target Proxy
resource "google_compute_target_https_proxy" "lb_https_proxy" {
  name             = "flash-loan-lb-global-lb-frontend"
  url_map          = google_compute_url_map.lb_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.lb_cert.id]
}

# HTTPS Forwarding Rule
resource "google_compute_global_forwarding_rule" "lb_https_frontend" {
  name       = "flash-loan-lb-global-lb-frontend"
  target     = google_compute_target_https_proxy.lb_https_proxy.id
  port_range = "443"
  ip_address = google_compute_global_address.lb_ip.address
}

# Vertex AI API
resource "google_project_service" "vertex_ai" {
  service = "aiplatform.googleapis.com"
  disable_on_destroy = false
}
