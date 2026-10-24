# TypeScript Task Tracker
![CI](https://github.com/YOUR_USER/ts-task-tracker/actions/workflows/ci.yml/badge.svg)

Full-stack kanban-style task tracker: **Express + TypeScript + MongoDB (Mongoose)** API with JWT auth and role-based access, and a **HTML5 + TypeScript** browser client.

## Run
```bash
docker compose up --build        # http://localhost:3000
# or locally (needs MongoDB):
npm install && npm run build && MONGO_URI=mongodb://localhost:27017/tasktracker npm start
```
The first registered user becomes `admin`; later users are `member`s.

## API
| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | returns `{ token, role }` |
| GET | `/api/tasks?status=todo` | members see own tasks, admins see all |
| POST | `/api/tasks` | `{ title, description? }` |
| PATCH | `/api/tasks/:id` | any of `title`, `description`, `status` |
| DELETE | `/api/tasks/:id` | |

## Test
`npm test` runs integration tests against an in-memory MongoDB (`mongodb-memory-server`), no external services needed.

## Design decisions
- **Zod validation at the edge**; Mongoose schemas as a second line of defense.
- **Ownership enforced in the query** (`{_id, owner}`), so another user's task returns 404, not 403, and its existence is not leaked.
- **bcrypt + identical error for unknown email / wrong password** to avoid user enumeration.
- **Client escapes all user text** before inserting into the DOM (XSS), and stores the token in `sessionStorage`.
- **Production hardening to add:** helmet, CORS policy, login rate limiting, refresh tokens / httpOnly cookies, a real `JWT_SECRET` (the default is dev-only).
