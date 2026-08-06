---
name: Imported monorepo artifacts
description: Safe approach for importing an existing Replit monorepo into managed artifact directories.
---

When cloning an existing Replit monorepo into this workspace, overlay the upstream source tree but preserve the destination artifact's managed `.replit-artifact/artifact.toml`.

**Why:** The upstream manifest can have a different artifact identity or port, while the destination manifest controls preview routing and workflow ownership.

**How to apply:** Compare tracked-file parity after the overlay, then run package typechecks and production builds before restarting managed workflows.