---
description: Deploy finx.win application to production server (91.99.186.43)
---

This workflow deploys the latest local code to the production server using Docker Compose.

1. Ensure all changes are tested and verified locally.
2. Run the deployment script:
// turbo
```bash
./scripts/deploy_finx.sh
```

**Note**: The deployment targets `root@91.99.186.43` on port `22`. It will sync files, rebuild the `finx-app` container, and restart services without impacting other sites like `grayhawks.com`.
