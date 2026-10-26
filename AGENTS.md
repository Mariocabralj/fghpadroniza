# Architecture rules

- Authentication emails use the scaffolded managed auth handler unchanged; preserve project-specific copy and branding in the React Email templates so signature validation and delivery remain SDK-owned.
- App-generated emails use the server-only managed template registry and helper; do not introduce local email queues or send endpoints.
- Legacy email data tables are retained as historical user data and must not gate managed sends.