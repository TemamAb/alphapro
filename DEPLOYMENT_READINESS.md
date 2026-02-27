# Alpha-Orion — Deployment Readiness & 100% Production-Grade Upgrade Plan

## Executive summary
- Goal: take `alpha-orion` (workspace root: alpha-orion codebase) from developer/demo state to production-grade, secure, observable, cost-efficient, and revenue-generating on Rendr.
- Output: prioritized, phased implementation plan with deliverables, acceptance criteria, and commands to prepare commits for push to `github.com/iamtemam/alphapro`.

## High-level findings (quick repo observations)
- Code layout: services under `backend-services/services/` and a `frontend/` app.
- Infrastructure: Terraform files exist in `infrastructure/terraform/`, `orion/`, and top-level `main.tf` variants.
- Containers: many service folders include `Dockerfile` and `requirements.txt` but no standardized multi-stage, non-root hardening.
- CI/CD: no explicit `.github/workflows` present in repo root (no consistent pipeline found).
- Secrets: no clear secrets-management integration (e.g., Vault, AWS Secrets Manager) in IaC.
- Observability: no central logging/metrics/tracing configuration detected.

See these entry points: [alpha-orionblueprint.txt](alpha-orionblueprint.txt), [Dockerfile.production](Dockerfile.production), [infrastructure/terraform/main.tf](infrastructure/terraform/main.tf), and representative service folders under `backend-services/services/`.

## Risk summary (top risks to production readiness)
- Build & deployment friction: no standardized CI pipeline or image promotion path.
- Security: images likely run as root; no vulnerability scanning and no WAF or RBAC policies described.
- Secrets leakage: plaintext config or TF var files may contain secrets; `input.tfvars` exists.
- Observability & SLOs: no logging/metrics/tracing, no SLOs or SLIs defined.
- Reliability: no canary/blue-green deployment strategy or automated rollback.
- Cost & scaling: no autoscaling policies or cost controls evident.

## Acceptance criteria for "100% production-grade" (must pass all)
1. Reproducible, automated CI/CD with image scanning, tests, and signed artifacts.
2. Immutable container images with multi-stage builds, stored in a private registry.
3. Infrastructure fully managed via IaC with state locking, drift detection, and secrets integration.
4. Centralized observability (logs + metrics + distributed tracing) and defined SLIs/SLOs + alerts.
5. Security posture: dependency vuln scanning, runtime protections, least-privilege IAM, and compliance checklist met.
6. Robust testing: unit, integration, e2e, load, and chaos experiments automated in pipeline.
7. Release strategy: staged rollout (canary/blue-green), automated rollback, and runbooks.
8. Monetization integration with Rendr: deployment target configured and measurable revenue telemetry in place.

## Phased implementation plan (priority, milestone-driven)

Phase 0 — Prep & governance (1 week)
- Deliverables: `DEPLOYMENT_READINESS.md` (this document), `SECURITY_POLICY.md`, `RELEASE_POLICY.md`.
- Actions: create org-level GitHub repo, enable branch protection, require PR reviews and CI.

Phase 1 — Repo hygiene & standardization (1–2 weeks)
- Deliver `CODEOWNERS`, `.editorconfig`, `LICENSE`, `CONTRIBUTING.md`.
- Standardize `Dockerfile` patterns: multi-stage, minimal base (alpine/distroless), image labels.
- Add `requirements.txt` pinning for Python services and add `frontend/package.json` lockfile.

Phase 2 — CI/CD & artifact security (2–3 weeks)
- Implement GitHub Actions workflows: `build`, `test`, `scan`, `publish` to registry, `deploy` to staging.
- Integrate container scanning (Trivy), dependency scanning (Snyk/Dependabot), and SBOM generation.
- Sign images (cosign) and tag by semantic version + git SHA.

Phase 3 — Infrastructure hardening & secrets (2–3 weeks)
- Migrate TF to use remote state (e.g., S3/Blob with locking) and enable workspace-level state locking.
- Integrate secrets manager (HashiCorp Vault / AWS Secrets Manager / Azure Key Vault) with IaC.
- Add network segmentation (private subnets), least-privilege IAM, and security groups.

Phase 4 — Observability & SLOs (2 weeks)
- Add structured logging, Prometheus metrics, and OpenTelemetry tracing to services.
- Deploy a central observability stack (managed: Datadog, New Relic, or open-source: Prometheus + Grafana + Tempo + Loki).
- Define SLIs/SLOs (error rate, latency p50/p95) and configure alerts.

Phase 5 — Testing & reliability (2–4 weeks)
- Expand automated tests (unit, contract tests, integration) and add pipeline gating.
- Implement load testing harness and run progressive load tests; add autoscaling policies based on SLOs.
- Run chaos experiments (e.g., kill instances, inject latency) in staging.

Phase 6 — Release strategy & runbooks (1–2 weeks)
- Implement canary/blue-green deployment in CD with automated rollback triggers.
- Produce runbooks for incidents, on-call rotations, and post-incident review templates.

Phase 7 — Rendr deployment and monetization (2–3 weeks)
- Integrate Rendr as a deployment target: auth, artifact push, and deployment configuration.
- Implement telemetry for revenue-critical flows and A/B test funnels for conversion optimization.

## Implementation details & recommended tools
- CI: GitHub Actions (native) or Azure DevOps; require PR gating and status checks.
- Registry: GitHub Container Registry / AWS ECR / GCP Artifact Registry — private with lifecycle policies.
- Scanning: Trivy for images, Dependabot for deps, SBOM via Syft.
- Secrets: Vault / cloud provider secrets; avoid committing `input.tfvars` with secrets.
- IaC: Terraform with `terraform fmt`, `validate`, `plan` in CI; add Terrascan/TFSec policies.
- Observability: OpenTelemetry SDK + Prometheus & Grafana; use hosted alternatives if needed.
- Runtime security: Pod Security Policies / OPA Gatekeeper + runtime EDR (Falco) for Kubernetes.

## Quick actionable checklist (first 10 commits)
1. Add `CODEOWNERS`, `CONTRIBUTING.md`, and `SECURITY_POLICY.md`.
2. Normalize and harden `Dockerfile`s across services.
3. Add `requirements.txt` pinning and `package-lock.json` for frontend.
4. Add GitHub Actions `ci.yml` for build/test/scan and `publish-image.yml` for registry push.
5. Configure Terraform remote state and add `backend.tf` snippet.
6. Add Trivy scan step and SBOM generation step to CI.
7. Add basic Prometheus metrics endpoints to Python services and instrument `frontend` for errors.
8. Create `staging` environment in IaC and wiring for observability.
9. Add deploy job to push to staging via Rendr API (templated) — keep production gated.
10. Add runbook templates and an incident command checklist.
