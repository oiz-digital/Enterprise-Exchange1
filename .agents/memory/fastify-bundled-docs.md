---
name: Bundled Fastify docs assets
description: Fastify Swagger UI needs its static asset directory preserved when the API is emitted as a single esbuild bundle.
---

When the API is bundled with esbuild, configure Swagger UI with an explicit `baseDir` inside the runtime output and copy `@fastify/swagger-ui/static` there during the build.

**Why:** The default package-relative lookup points outside the bundle and can produce missing-file startup warnings or failures for the logo/static assets.

**How to apply:** Any future changes to the API build output or Swagger UI registration must preserve the copied static directory and matching runtime `baseDir`.