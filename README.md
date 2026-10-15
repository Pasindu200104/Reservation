# Resource Reservation Management System

A web app where an organization keeps its shared resources (meeting rooms, company vehicles, projectors, sports courts and labs) in one place, and where staff book them without double bookings.

<img width="1917" height="972" alt="Screenshot 2026-10-15 154951" src="https://github.com/user-attachments/assets/73622a9f-1226-457e-adf9-d1dceee93219" />
<img width="1917" height="972" alt="Screenshot 2026-10-15 155019" src="https://github.com/user-attachments/assets/8ed91266-4705-494e-9b9c-6e847effb84c" />
<img width="1917" height="971" alt="Screenshot 2026-10-15 155044" src="https://github.com/user-attachments/assets/0b09530d-f726-4f0b-b641-a0f74aa4313e" />
<img width="1917" height="972" alt="Screenshot 2026-10-15 155119" src="https://github.com/user-attachments/assets/879633b3-c20f-4ab5-b5e0-c29a9a7b3b70" />
<img width="1917" height="972" alt="Screenshot 2026-10-15 155151" src="https://github.com/user-attachments/assets/24b27f58-3e93-4ec7-86af-50303bcc3f7e" />

## Project links

- ER diagram	https://dbdiagram.io/d/Reservation-ER-6ad06369aebfe7a21ff4fba3
- Demo video	https://drive.google.com/file/d/1BV8Zzqgt0LADP4VQ6ukSpsyog4v-gs6y/view?usp=sharing

## The problem it solves

Bookings were handled through chat messages and manual records, which led to overlapping reservations and uncertainty about what is free. This app gives everyone one calendar per resource, shows what is booked and what is free, and refuses any booking that overlaps another one.

## Features

- Demo login with seeded accounts (no registration, on purpose, to keep the scope focused)
- Calendar with Month, Week and Day views for each resource
  - Choose a resource type, then a specific resource
  - Click a day in the month view to open its hourly view
  - Click a free time (or drag across several) to open the booking form
  - Click a booking to see it; its owner and administrators can edit or cancel it
  - Your bookings are green, other people's bookings are grey
- Overlapping bookings are rejected with a clear message
- Administrators can add, edit, activate and deactivate resources
- Roles: administrators manage resources and can change any booking; employees can change only their own

## Tech stack

| Part | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL, accessed with the `pg` library (plain SQL) |
| Styling | Tailwind CSS |
| Calendar | FullCalendar |
| Version control | Git and GitHub |

## Getting started

### What you need

- Node.js 20 or newer
- PostgreSQL (version 14 or newer). The Windows installer from postgresql.org already includes everything needed. On Linux, also install the `postgresql-contrib` package, because the project uses the `btree_gist` extension.

### 1. Install dependencies

```bash
npm install
```

### 2. Create an empty PostgreSQL database

The database must be called `reservations` (or any name you put in `DATABASE_URL` below). Use whichever option you prefer.

**With pgAdmin:** connect to your server, right-click **Databases**, choose **Create**, then **Database...**, enter `reservations` and save.

**With the command line** (adjust the path and version number to your install):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE reservations;"
```

```bash
psql -U postgres -c "CREATE DATABASE reservations;"
```

A hosted PostgreSQL (Railway, Supabase, Neon) also works. Create a database there and use its connection string as `DATABASE_URL`. Some providers require extra SSL settings.

### 3. Create the settings file

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS or Linux:

```bash
cp .env.example .env
```

Open `.env` and set two values:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/reservations
SESSION_SECRET=a-long-random-text
```

- `DATABASE_URL`: replace `YOUR_PASSWORD` with your PostgreSQL password. If the password contains special characters such as `@` or `#`, they must be URL-encoded.
- `SESSION_SECRET`: any long random text, used to sign the login cookie. To generate one:

  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 4. Create the tables and demo data

```bash
npm run db:setup
```

This creates all tables, the overlap constraint and demo data (users, resources and sample bookings). It should finish with `Database is ready.` Running it again **resets the database**, so do not run it on data you want to keep.

### 5. Start the app

```bash
npm run dev
```

Open http://localhost:3000. The first start on Windows may take a minute while Next.js downloads its compiler.

To run the production build instead (this also hides the Next.js development indicator in the corner):

```bash
npm run build
npm run start
```

### Demo accounts

| Name | Email | Role |
| --- | --- | --- |
| Kasun Perera | admin@demo.com | Administrator |
| Nimali Silva | nimali@demo.com | Employee |
| Ruwan Fernando | ruwan@demo.com | Employee |

Click an account on the login page to sign in. There are no passwords in this demo.

> **Testing as two users at once:** the login is stored in one cookie that all tabs of the same browser share, so signing in as a second user replaces the first. Use a normal window for one user and an incognito window (or a different browser) for the other.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server |
| `npm run build` | Builds the production version |
| `npm run start` | Runs the production build |
| `npm run db:setup` | Creates tables and demo data (resets the database) |

## Database design

Four tables. An ER diagram is available here: **https://dbdiagram.io/d/Reservation-ER-6ad06369aebfe7a21ff4fba3**. The source for it is in `database/er-diagram.dbml`.

| Table | Purpose |
| --- | --- |
| `users` | People who can sign in, each with a role (`admin` or `employee`) |
| `resource_types` | Categories such as Meeting Room, Company Vehicle, Projector, Sports Court, Lab |
| `resources` | Individual bookable items. Each belongs to one resource type and can be active or inactive |
| `reservations` | A booking of one resource by one user for a time range, with a purpose and a status (`confirmed` or `cancelled`) |

Relationships: one resource type has many resources, one resource has many reservations, and one user has many reservations.

## Pages

| Route | Who | What it shows |
| --- | --- | --- |
| `/` | Anyone | Redirects to `/dashboard` when signed in, otherwise to `/login` |
| `/login` | Anyone | Demo account picker |
| `/dashboard` | Signed-in users | Calendar for the chosen resource, with booking forms |
| `/admin/resources` | Administrators | Add, edit, activate and deactivate resources. Employees are redirected to `/dashboard` |

Signing in and out are handled by Next.js Server Actions, not by REST endpoints.

## API

All endpoints use JSON and need the login cookie. Errors are returned as `{ "error": "message" }` with one of these status codes:

| Status | Meaning |
| --- | --- |
| 400 | Invalid input or a business rule was broken (for example, a start time in the past) |
| 401 | Not signed in |
| 403 | Signed in, but not allowed (for example, an employee editing someone else's booking) |
| 404 | The resource or reservation does not exist |
| 409 | Conflict (overlapping booking, or a duplicate resource name) |
| 500 | Unexpected server error |

### Reservations

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| GET | `/api/reservations?resourceId=1&start=...&end=...` | Any user | Confirmed bookings of one resource that overlap the date range. `start` and `end` are ISO date-times |
| POST | `/api/reservations` | Any user | Create a booking. Returns `201` with `{ "id": 12 }` |
| PUT | `/api/reservations/:id` | Owner or admin | Change the time or purpose of a booking |
| DELETE | `/api/reservations/:id` | Owner or admin | Cancel a booking (it is kept with status `cancelled`) |

Body for `POST /api/reservations`:

```json
{
  "resourceId": 1,
  "purpose": "Weekly team meeting",
  "startTime": "2026-10-20T04:30:00.000Z",
  "endTime": "2026-10-20T05:30:00.000Z"
}
```

Body for `PUT /api/reservations/:id` is the same without `resourceId`. A booking cannot be moved to a different resource.

### Resources

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| GET | `/api/resources` | Any user | Active resources. Administrators can add `?includeInactive=true` to also get inactive ones |
| POST | `/api/resources` | Admin | Add a resource. Returns `201` |
| PUT | `/api/resources/:id` | Admin | Edit a resource, or activate or deactivate it with `isActive` |

Body for `POST` and `PUT`:

```json
{
  "name": "Meeting Room C",
  "resourceTypeId": 1,
  "location": "Floor 2",
  "capacity": 6,
  "description": "Whiteboard",
  "isActive": true
}
```

`location`, `capacity` and `description` are optional.

## Business rules

- The end time must be after the start time, and one booking can last at most 12 hours
- A booking cannot start in the past
- Past bookings cannot be changed or cancelled
- A cancelled booking cannot be changed again
- Inactive resources cannot be booked and are hidden from the calendar
- Employees can edit or cancel only their own bookings; administrators can change any booking
- Resource names must be unique

## Important design decisions

**Preventing double bookings (the core rule).** It is enforced in two layers:

1. The server checks for an overlapping confirmed booking before saving and returns a friendly message naming who holds the slot. Two bookings overlap when each one starts before the other ends. Back-to-back bookings (one ends at 10:00, the next starts at 10:00) are allowed.
2. The database has an exclusion constraint (`no_overlapping_reservations`) on the resource and the time range. If two people save at the same instant, PostgreSQL still accepts only one. This was tested by sending six simultaneous requests for one slot: one succeeded and five were rejected.

When editing a booking, the check ignores that booking itself so it does not conflict with its own old time.

**Cancelling keeps history.** A cancelled booking stays in the table with status `cancelled`. The constraint only applies to confirmed bookings, so the slot becomes free again.

**Plain SQL instead of an ORM.** The queries are short and readable, and the overlap constraint is easiest to express directly in SQL (`database/schema.sql`).

**Demo login still uses the database.** The chosen account is looked up in the `users` table, and a signed, HTTP-only cookie keeps the session for 8 hours. The signature stops anyone from editing the cookie to become another user. Permissions are checked on the server for every request, not only hidden in the interface. A real system would add passwords and registration.

**Resources are generic.** One `resources` table plus a `resource_types` table means a new kind of resource is just a new row, with no code changes.

**Times** are stored as UTC (`timestamptz`) and shown in the viewer's local time. Messages from the server use Sri Lanka time.

**Thin routes, rules in services.** API routes only check who is calling, validate input and return JSON. The booking rules live in `src/lib/reservationService.ts`, so they are in one place.

## Project structure

```
database/
  schema.sql              Tables and the overlap constraint
  er-diagram.dbml         dbdiagram.io URL<img width="1917" height="971" alt="Screenshot 2026-10-15 155044" src="https://github.com/user-attachments/assets/03bde1da-3473-43d4-8d71-158362ae464a" />
<img width="1917" height="972" alt="Screenshot 2026-10-15 155119" src="https://github.com/user-attachments/assets/034cccc3-275c-4fda-9792-2427a8f2bd27" />
<img width="1917" height="972" alt="Screenshot 2026-10-15 155151" src="https://github.com/user-attachments/assets/261ec14d-a0ff-4cef-b917-e25bef83fc08" />

scripts/
  setupDatabase.ts        Creates tables and demo data (npm run db:setup)
src/
  app/
    page.tsx              Redirects to login or dashboard
    login/                Demo login page and action
    dashboard/            Calendar page
    admin/resources/      Resource management page (admin only)
    api/reservations/     List, create, edit, cancel reservations
    api/resources/        List, create, edit resources
    actions.ts            Logout action
  components/
    ReservationCalendar   Calendar, filters, click handling
    BookingModal          Create, edit, cancel form
    ResourceManager       Admin table and form
    AppHeader             Navigation and logout
  lib/
    reservationService.ts Booking rules and conflict check
    resourceService.ts    Resource queries
    validation.ts         Input checks
    session.ts            Signed cookie login
    apiHelpers.ts         Login and admin checks, error responses
    database.ts           PostgreSQL connection
    errors.ts             Error type with an HTTP status
    types.ts              Shared TypeScript types
```

## Troubleshooting

| Problem | Likely cause and fix |
| --- | --- |
| `password authentication failed` | The password in `DATABASE_URL` does not match your PostgreSQL password |
| `database "reservations" does not exist` | Create the database (step 2) or fix the name in `DATABASE_URL` |
| `ECONNREFUSED` | PostgreSQL is not running. Start the PostgreSQL service |
| `SESSION_SECRET is missing` | Create `.env` from `.env.example` and set the value, then restart the app |
| `extension "btree_gist" is not available` | Install the PostgreSQL contrib package (Linux), or use the official installer |
| Demo accounts missing on the login page | Run `npm run db:setup` |
| Signing in as a second user logs out the first | Expected. Use an incognito window for the second user |

## Deployment note

The app is a single Next.js service plus a PostgreSQL database, so it can be hosted on any platform that runs Node.js (for example Railway). Set `DATABASE_URL` and `SESSION_SECRET` as environment variables, and run `npm run db:setup` once against the hosted database.

## Possible improvements

- Real accounts with passwords and registration
- Recurring bookings and email reminders
- Opening hours and per-resource rules (for example, vehicles that need approval)
- Automated tests for the booking rules
