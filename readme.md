# Email Scheduler

An email scheduling application with a Next.js frontend and an Express/TypeScript
backend. Campaign recipients are imported from a CSV file, scheduled through
BullMQ, sent through Ethereal Email, and displayed in the dashboard.

## Local setup

### Prerequisites

- Node.js 20 or newer
- Docker and Docker Compose
- A PostgreSQL database
- A Google OAuth application
- An Ethereal Email account for SMTP testing
- Optional: a Slack app if Slack rate-limit notifications are required

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Start Redis and Elasticsearch

Redis and Elasticsearch are defined in `backend/docker-compose.yml`:

```bash
cd backend
docker compose up -d
```

This starts:

- Redis at `redis://127.0.0.1:6379`
- Elasticsearch at `http://localhost:9200`

The Compose file uses named volumes (`redis_data` and `es_data`) so local
queue/index data survives container restarts. Stop the services with
`docker compose down`; do not add `-v` unless you intentionally want to delete
the local data volumes.

### 3. Configure the backend

Copy the example file and fill in the required values:

```bash
cd backend
cp .env.example .env
```

At minimum, configure:

- `DATABASE_URL`: PostgreSQL connection string used by Prisma at runtime.
- `DIRECT_URL`: direct PostgreSQL connection string used by Prisma migrations.
- `JWT_SECRET`: a long, random secret used to sign access tokens.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google OAuth credentials.
- `GOOGLE_CALLBACK_URL`: must match the callback configured in Google Cloud.
- `ETHEREAL_USER` and `ETHEREAL_PASS`: credentials from
  [Ethereal Email](https://ethereal.email/).

The local defaults for `REDIS_URL`, `ELASTICSEARCH_URL`, `FRONTEND_URL`, and
`GOOGLE_CALLBACK_URL` are suitable when running the stack on the same machine.
`SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and `SLACK_REDIRECT_URI` are only
needed to connect Slack and send rate-limit notifications. `PORT` defaults to
`5000`, and `WORKER_CONCURRENCY` defaults to `5`.

To configure Ethereal Email:

1. Create an account at [ethereal.email](https://ethereal.email/).
2. Copy the generated SMTP username into `ETHEREAL_USER`.
3. Copy the generated SMTP password into `ETHEREAL_PASS`.
4. Use an allowed sender address in the compose form. Ethereal captures the
   message for preview instead of delivering it to a real recipient.

Run the Prisma client generation and database migration:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Start the backend:

```bash
npm run dev
```

The Express API listens on `http://localhost:5000` by default. The BullMQ
worker is started by the same process because `src/server.ts` imports
`src/services/emailWorker.ts`; no second worker command is required. For a
production-style local run:

```bash
npm run build
npm start
```

### 4. Configure and run the frontend

The frontend example file already points to the local backend:

```bash
cd frontend
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The frontend uses
`NEXT_PUBLIC_API_URL=http://localhost:5000/api` unless this value is changed.

Google OAuth must be configured with the backend callback URL and the frontend
dashboard URL used by the application. The backend's `FRONTEND_URL` should
point to the frontend origin.

## Architecture overview

### Scheduling flow

1. An authenticated user uploads a CSV and supplies the sender, subject, body,
   start time, delay between recipients, and hourly limit.
2. The backend validates the campaign and stores the campaign plus one
   `ScheduledEmail` row per valid recipient in PostgreSQL.
3. Each recipient becomes a delayed BullMQ job in the `email-queue` Redis queue.
   The job delay is calculated from the requested start time and recipient
   position. A minimum provider delay of two seconds is enforced between
   recipients.
4. When a job becomes available, the worker verifies that the database record is
   still pending, applies the hourly limit, sends through Ethereal, and updates
   the database record to `SENT` with `sentAt`.
5. Failed jobs update the corresponding database record to `FAILED`. Email
   metadata is also indexed in the Elasticsearch `emails` index for search.

### Persistence and restart behavior

- PostgreSQL is the source of truth for campaigns and scheduled email status.
  Pending, sent, and failed records remain available after an API restart.
- BullMQ stores delayed and waiting job state in Redis. The Compose volume keeps
  Redis data across container restarts, and a restarted backend reconnects the
  worker to the same queue.
- Elasticsearch is a searchable projection of email metadata, not the
  authoritative store. The backend creates the `emails` index on startup when it
  does not exist and updates documents as jobs are sent or fail.
- The worker checks PostgreSQL before sending, so a job that has already been
  marked `SENT` is skipped after a restart or duplicate delivery attempt.

### Rate limiting

Rate limiting is enforced in the worker, immediately before sending. Each job
increments an atomic Redis key in the form:

```text
rate_limit:<userId>:<campaignId>:<UTC hour>
```

The key expires after one hour. When the incremented count exceeds the
campaign's `hourlyLimit`, the job is moved to the next UTC hour instead of
being sent. A separate Redis `NX` alert key ensures at most one Slack alert is
sent for a user/campaign/hour window.

### Concurrency

BullMQ's worker is created with `concurrency: WORKER_CONCURRENCY`. The default
is five active jobs per backend process, configurable through the environment.
Redis coordinates the queue, while the worker's concurrency setting bounds the
number of jobs that one process handles simultaneously. The hourly rate limit
is independent of concurrency and still applies when several jobs are active.

## Feature mapping

### Backend requirements

| Requirement | Implementation |
| --- | --- |
| Scheduler | CSV campaign upload creates one delayed BullMQ job per recipient, based on start time and per-recipient delay. |
| Persistence | Prisma/PostgreSQL stores campaigns, recipients, schedule times, statuses, and send timestamps. BullMQ state is persisted in Redis. |
| Rate limiting | Atomic Redis hourly counters keyed by user, campaign, and UTC hour; jobs over the limit are delayed to the next hour. Optional Slack alerts are deduplicated with Redis. |
| Concurrency | BullMQ worker concurrency is configurable with `WORKER_CONCURRENCY` and defaults to five. |

### Frontend requirements

| Requirement | Implementation |
| --- | --- |
| Login | Google OAuth login page with token-based dashboard session handling. |
| Dashboard | Scheduled and sent email views, counts, refresh, search, and Slack connection controls. |
| Compose | Sender, subject, body, start time, delay, hourly limit, and CSV recipient upload form. |
| Tables/lists | Scheduled and sent email activity rows plus a sent-email detail view; Elasticsearch-backed search covers recipient and subject. |

## Trade-offs and Future Optimizations

- **Infrastructure and Networking:** We utilized managed cloud services (Render, Vercel, Supabase, Upstash) to provide an instantly accessible live demo. For stricter security and lower latency at scale, we can migrate the entire stack into a private VPC (e.g., using AWS ECS or Kubernetes) so the backend, Redis, and PostgreSQL communicate over an isolated internal network.
- **Process Decoupling:** The Express API and BullMQ worker currently run within the same Node.js process to streamline this specific deployment. For a massive production environment, we can separate the API and the workers into independent microservices. This allows us to auto-scale the worker nodes based purely on queue length without impacting the HTTP API's response times.
- **Rate-Limiting Algorithm:** The hourly rate limit currently uses a fixed UTC-hour bucket for efficiency in Redis atomic counting. To prevent artificial burst traffic exactly at the top of the hour, we can upgrade to a sliding log or sliding window algorithm using Redis Sorted Sets, ensuring a perfectly smooth distribution of outbound emails over any 60-minute period.
- **Queue Optimization:** Scheduling is currently handled on a per-recipient basis, generating a distinct delayed queue job for every individual email. While this provides highly granular retries and status tracking, for campaigns scaling into the millions, we can implement batch-processing or chunking to significantly reduce Redis memory overhead.