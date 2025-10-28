# Image-to-Container Mapping - Before vs After

## Your Question
> "shouldn't the number of images be same number of containers"

**Answer**: YES! And the fix ensures this is now true.

---

## ❌ BEFORE THE FIX (Broken)

### Default Mode: `docker-compose up -d`

```
┌─────────────────────────────────────────────────────────────┐
│                    EXPECTED BEHAVIOR                        │
├─────────────────────────────────────────────────────────────┤
│  4 Services Defined → Should Start 4 Containers            │
└─────────────────────────────────────────────────────────────┘

ACTUAL BEHAVIOR:
┌────────────┬──────────────┬──────────────┬────────────────┐
│  Service   │  Should Run  │  Actually    │    Reason      │
│            │              │   Runs?      │                │
├────────────┼──────────────┼──────────────┼────────────────┤
│  mysql     │     ✅       │     ❌       │ profiles: debug│
│  redis     │     ✅       │     ❌       │ profiles: debug│
│  backend   │     ✅       │     ❌       │ deps missing!  │
│  frontend  │     ✅       │     ✅       │ no deps        │
└────────────┴──────────────┴──────────────┴────────────────┘

Images Built/Pulled: 4
Containers Running:  1 (only frontend)
Mapping:            ❌ 4 images → 1 container (BROKEN!)
```

### Error Message:
```
service "backend" depends on undefined service "redis": invalid compose project
```

---

## ✅ AFTER THE FIX (Working)

### Default Mode: `docker-compose up -d`

```
┌─────────────────────────────────────────────────────────────┐
│                    EXPECTED BEHAVIOR                        │
├─────────────────────────────────────────────────────────────┤
│  4 Services Defined → Should Start 4 Containers            │
└─────────────────────────────────────────────────────────────┘

ACTUAL BEHAVIOR:
┌────────────┬──────────────┬──────────────┬────────────────┐
│  Service   │  Should Run  │  Actually    │    Status      │
│            │              │   Runs?      │                │
├────────────┼──────────────┼──────────────┼────────────────┤
│  mysql     │     ✅       │     ✅       │ Always runs    │
│  redis     │     ✅       │     ✅       │ Always runs    │
│  backend   │     ✅       │     ✅       │ Deps satisfied │
│  frontend  │     ✅       │     ✅       │ No issues      │
└────────────┴──────────────┴──────────────┴────────────────┘

Images Used:         4 (mysql:8.0, redis:7-alpine, backend, frontend)
Containers Running:  4 (pdflab-mysql, pdflab-redis, pdflab-backend, pdflab-frontend)
Mapping:            ✅ 4 images → 4 containers (CORRECT! 1:1 mapping)
```

---

## Production Mode Comparison

### ✅ Production Mode: `docker-compose --profile production up -d`

```
┌─────────────────────────────────────────────────────────────┐
│                    EXPECTED BEHAVIOR                        │
├─────────────────────────────────────────────────────────────┤
│  5 Services Defined → Should Start 5 Containers            │
└─────────────────────────────────────────────────────────────┘

ACTUAL BEHAVIOR:
┌────────────┬──────────────┬──────────────┬────────────────┐
│  Service   │  Should Run  │  Actually    │    Status      │
│            │              │   Runs?      │                │
├────────────┼──────────────┼──────────────┼────────────────┤
│  mysql     │     ✅       │     ✅       │ Always runs    │
│  redis     │     ✅       │     ✅       │ Always runs    │
│  backend   │     ✅       │     ✅       │ Deps satisfied │
│  frontend  │     ✅       │     ✅       │ No issues      │
│  nginx     │     ✅       │     ✅       │ Profile active │
└────────────┴──────────────┴──────────────┴────────────────┘

Images Used:         5 (mysql, redis, backend, frontend, nginx)
Containers Running:  5 (all services)
Mapping:            ✅ 5 images → 5 containers (CORRECT! 1:1 mapping)
```

---

## Visual Mapping

### ✅ After Fix - Default Mode (4→4)

```
IMAGES                          CONTAINERS
┌─────────────────┐            ┌──────────────────┐
│  mysql:8.0      │ ────────→  │ pdflab-mysql     │
└─────────────────┘            └──────────────────┘

┌─────────────────┐            ┌──────────────────┐
│ redis:7-alpine  │ ────────→  │ pdflab-redis     │
└─────────────────┘            └──────────────────┘

┌─────────────────┐            ┌──────────────────┐
│ backend:latest  │ ────────→  │ pdflab-backend   │
└─────────────────┘            └──────────────────┘

┌─────────────────┐            ┌──────────────────┐
│ frontend:latest │ ────────→  │ pdflab-frontend  │
└─────────────────┘            └──────────────────┘

✅ 4 images → 4 containers (Perfect 1:1 mapping)
```

### ✅ After Fix - Production Mode (5→5)

```
IMAGES                          CONTAINERS
┌─────────────────┐            ┌──────────────────┐
│  mysql:8.0      │ ────────→  │ pdflab-mysql     │
└─────────────────┘            └──────────────────┘

┌─────────────────┐            ┌──────────────────┐
│ redis:7-alpine  │ ────────→  │ pdflab-redis     │
└─────────────────┘            └──────────────────┘

┌─────────────────┐            ┌──────────────────┐
│ backend:latest  │ ────────→  │ pdflab-backend   │
└─────────────────┘            └──────────────────┘

┌─────────────────┐            ┌──────────────────┐
│ frontend:latest │ ────────→  │ pdflab-frontend  │
└─────────────────┘            └──────────────────┘

┌─────────────────┐            ┌──────────────────┐
│ nginx:alpine    │ ────────→  │ pdflab-nginx     │
└─────────────────┘            └──────────────────┘

✅ 5 images → 5 containers (Perfect 1:1 mapping)
```

---

## Why This Matters

### Correct 1:1 Mapping Indicates:
✅ **No orphaned images** - Every image is being used
✅ **No missing containers** - Every service starts
✅ **Clean architecture** - Simple to understand and debug
✅ **Predictable behavior** - `docker-compose ps` shows what you expect
✅ **Resource efficiency** - Not building/pulling unused images

### Incorrect Mapping Would Indicate:
❌ **Configuration errors** - Services defined but can't start
❌ **Dependency issues** - Services blocked by missing deps
❌ **Profile confusion** - Services unexpectedly not running
❌ **Wasted resources** - Images built but never used
❌ **Production risk** - What works locally may fail in prod

---

## Verification Commands

### Count Services Defined
```bash
# Default mode
docker-compose config --services | wc -l
# Output: 4

# Production mode
docker-compose --profile production config --services | wc -l
# Output: 5
```

### Count Running Containers (After Starting)
```bash
# Start default mode
docker-compose up -d

# Count running containers
docker-compose ps --format json | jq length
# Expected: 4

# Or simpler:
docker-compose ps --services | wc -l
# Expected: 4
```

### List Image→Container Mapping
```bash
docker-compose ps --format "table {{.Service}}\t→\t{{.Name}}\t({{.Image}})"
```

**Expected Output (Default)**:
```
SERVICE   →  NAME               (IMAGE)
backend   →  pdflab-backend     (backend:latest)
frontend  →  pdflab-frontend    (frontend:latest)
mysql     →  pdflab-mysql       (mysql:8.0)
redis     →  pdflab-redis       (redis:7-alpine)

✅ 4 services → 4 containers → 4 images
```

**Expected Output (Production)**:
```
SERVICE   →  NAME               (IMAGE)
backend   →  pdflab-backend     (backend:latest)
frontend  →  pdflab-frontend    (frontend:latest)
mysql     →  pdflab-mysql       (mysql:8.0)
nginx     →  pdflab-nginx       (nginx:alpine)
redis     →  pdflab-redis       (redis:7-alpine)

✅ 5 services → 5 containers → 5 images
```

---

## Exception: Scaling (Intentional Multiple Containers)

**NOTE**: The 1:1 rule applies to **non-scaled** deployments.

If you intentionally scale a service:
```yaml
backend:
  deploy:
    replicas: 3  # Run 3 backend containers
```

Then you'd have:
```
1 backend image → 3 backend containers
```

This is **intentional** and correct for load balancing.

**Current setup**: No scaling configured, so 1:1 mapping is expected.

---

## Summary

### Your Observation Was Correct ✅

You identified that:
> "shouldn't the number of images be same number of containers"

**Answer**: Absolutely YES!

### The Fix Achieved This ✅

**Before**: 4 images → 1 container (broken dependency chain)
**After**: 4 images → 4 containers (perfect 1:1 mapping)

### What Changed

1. **MySQL** - Removed `profiles: - debug` (now always runs)
2. **Redis** - Removed `profiles: - debug` (now always runs)
3. **Backend** - Dependencies now satisfied (can start)
4. **Frontend** - No change (was already working)
5. **Nginx** - Still profile-gated (production only, optional)

### Result

✅ **Default Mode**: 4 defined → 4 running → 4 images used
✅ **Production Mode**: 5 defined → 5 running → 5 images used
✅ **Perfect 1:1 mapping** (exactly as you expected!)

---

**Your intuition was spot-on. The fix directly addresses your concern!** 🎯
