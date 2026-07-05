
# FinPilot AI Product Experience

## Project layout

- `src/` contains the frontend app.
- `backend/app/` contains the FastAPI app.
- `backend/scripts/` contains backend setup and run scripts.
- `backend/data/` contains local SQLite files and is ignored by git.
- `docs/` contains project documentation and design notes.
- `logs/` contains local runtime logs and is ignored by git.

See `docs/PROJECT_STRUCTURE.md` for the full layout.

## Running the code

Run `npm i` to install the frontend dependencies.

Run `npm run dev` to start the frontend development server.

## Backend setup (Python 3.11 locked)

Use the provided one-command setup to create and configure `backend/.venv311`:

```bash
npm run setup:backend
```

Start the backend API:

```bash
npm run dev:backend
```

Start frontend on the expected local port:

```bash
npm run dev:frontend
```

## Connect frontend to backend

1. Start the backend API:

```bash
npm run dev:backend
```

2. In a second terminal, start the frontend:

```bash
npm run dev:frontend
```

The frontend is configured to proxy `/api/*` requests to `http://127.0.0.1:8000` in development.

Optional: set a custom backend URL by creating `.env.local` in the project root:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```
  
