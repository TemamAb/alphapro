# Alpha-Orion Production Deployment Protocol

**Enforced by:** Alpha-Orion Project Management Team  
**Effective Date:** 2026-02-22

---

## 🚨 Mandatory Deployment Checklist

> **IMPORTANT:** Deployments to Render cloud are ONLY permitted after ALL criteria below are verified.

### Phase 1: Dockerization ✅

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1.1 | All services have Dockerfiles | ⬜ | |
| 1.2 | Docker images build successfully | ⬜ | |
| 1.3 | Docker Compose runs all services | ⬜ | |
| 1.4 | No container startup errors | ⬜ | |

### Phase 2: Local Port Verification ✅

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 2.1 | Backend API on local port (3001) | ⬜ | |
| 2.2 | Dashboard on local port (5000) | ⬜ | |
| 2.3 | Health endpoints respond | ⬜ | |
| 2.4 | API proxy works (dashboard → backend) | ⬜ | |
| 2.5 | WebSocket connections work | ⬜ | |

### Phase 3: Profit Generation Verification ✅

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 3.1 | Backend connects to blockchain | ⬜ | |
| 3.2 | Arbitrage opportunities detected | ⬜ | |
| 3.3 | Demo trades execute successfully | ⬜ | |
| 3.4 | Profit metrics displayed in dashboard | ⬜ | |
| 3.5 | Real trading mode activated | ⬜ | |

---

## Quick Verification Commands

### Docker Build Test
```bash
cd alpha-orion
docker build -t alpha-orion-backend -f backend-services/services/user-api-service/Dockerfile .
docker build -t alpha-orion-dashboard -f dashboard/Dockerfile .
```

### Local Port Test
```bash
# Terminal 1: Start backend
cd backend-services/services/user-api-service
npm install
PORT=3001 npm start

# Terminal 2: Start dashboard  
cd dashboard
npm install
npm run dev

# Verify:
# - http://localhost:5000 → Dashboard loads
# - http://localhost:3001/health → Backend responds
```

### Profit Generation Test
```bash
# Check dashboard shows:
# - Total PnL > 0
# - Opportunities detected
# - Active trades
```

---

## Deployment Approval

**Minimum Required Sign-offs:**
- [ ] Docker Build: _________________ Date: _______
- [ ] Local Test: _________________ Date: _______
- [ ] Profit Verified: _________________ Date: _______
- [ ] Tech Lead: _________________ Date: _______

---

## ❌ Deployment Rejection Criteria

If ANY of these occur, deployment to Render is BLOCKED:
- Docker build fails
- Local ports don't work
- Profit mode fails to generate returns
- Any critical error in logs

---

**This protocol is enforced to prevent costly production failures on Render.**
