# Project Structure

```text
.
├── backend/              FastAPI backend, database models, API routers, tests
│   ├── alembic/          Database migrations
│   ├── app/              Backend application source
│   ├── data/             Local SQLite databases, ignored by git
│   └── scripts/          Backend setup and run scripts
├── docs/                 Project notes, attributions, and guidelines
├── logs/                 Local runtime logs, ignored by git
├── src/                  React/Vite frontend source
│   ├── app/              Frontend screens, API client, routes, components
│   └── styles/           Frontend styles and theme assets
├── index.html            Vite HTML entry point
├── package.json          Frontend scripts and dependencies
└── vite.config.ts        Frontend dev/build config
```

Generated folders such as `node_modules/`, `dist/`, backend virtual environments, SQLite databases, caches, and logs are intentionally ignored.
