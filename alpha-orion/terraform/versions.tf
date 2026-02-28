terraform {
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "1.2.0"
    }
  }
}

provider "render" {
  # Set RENDER_API_KEY environment variable
  # export RENDER_API_KEY=rnd_...
}