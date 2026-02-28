# Alpha-Orion Infrastructure as Code (Terraform)

variable "region" {
  type    = string
  default = "oregon" # Render US West
}

# 1. PostgreSQL Database
resource "render_postgres" "alpha_db" {
  name     = "alpha-orion-db"
  plan     = "starter"
  region   = var.region
  version  = "14"
  
  database_name = "alpha_orion_db"
  user          = "alpha_orion_user"
}

# 2. Redis Cache
resource "render_redis" "alpha_redis" {
  name   = "alpha-orion-redis"
  plan   = "starter"
  region = var.region
}

# 3. User API Web Service
resource "render_web_service" "user_api" {
  name    = "user-api-service"
  plan    = "starter"
  region  = var.region
  runtime = "node"

  repo_url = "https://github.com/TemamAb/alpha-orion"
  branch   = "main"
  root_dir = "backend-services/services/user-api-service"

  build_command = "npm install && npm run build"
  start_command = "npm start"

  env_vars = {
    "NODE_ENV"     = { value = "production" }
    "DATABASE_URL" = { from_database = { name = render_postgres.alpha_db.name, property = "connectionString" } }
    "REDIS_URL"    = { from_service  = { name = render_redis.alpha_redis.name, property = "connectionString" } }
    "JWT_SECRET"   = { generate_value = true }
  }
}

# 4. Background Worker (Blockchain Monitor)
resource "render_background_worker" "blockchain_monitor" {
  name    = "blockchain-monitor"
  plan    = "starter"
  region  = var.region
  runtime = "python"

  repo_url = "https://github.com/TemamAb/alpha-orion"
  branch   = "main"
  root_dir = "backend-services/services/blockchain-monitor"

  build_command = "pip install -r requirements.txt"
  start_command = "python src/main.py"

  env_vars = {
    "REDIS_URL" = { from_service = { name = render_redis.alpha_redis.name, property = "connectionString" } }
  }
}