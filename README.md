# Resource Reservation Management System

A web app where an organization keeps its shared resources (meeting rooms, company vehicles, projectors, sports courts and labs) in one place, and where staff book them without double bookings.

## The problem it solves

Bookings were handled through chat messages and manual records, which led to overlapping reservations and uncertainty about what is free. This app gives everyone one calendar per resource, shows what is booked and what is free, and refuses any booking that overlaps another one.

## Features

- Demo login with seeded accounts (no registration, on purpose to keep the scope focused)
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

Next.js (App Router), TypeScript, PostgreSQL (`pg`), Tailwind CSS, FullCalendar. Git and GitHub for version control.

## How to run it

You need Node.js 20 or newer and a PostgreSQL database.

1. Install dependencies

   ```bash
   npm install
   ```

2. Start PostgreSQL. Either use your own, or run the included Docker setup:

   ```bash
   docker compose up -d
   ```

3. Create your settings file and adjust `DATABASE_URL` if needed

   ```bash
   cp .env.example .env
   ```

4. Create the tables and demo data (this resets the database)

   ```bash
   npm run db:setup
   ```

5. Start the app and open http://localhost:3000

   ```bash
   npm run dev
   ```

### Demo accounts

| Name | Email | Role |
| --- | --- | --- |
| Kasun Perera | admin@demo.com | Administrator |
| Nimali Silva | nimali@demo.com | Employee |
| Ruwan Fernando | ruwan@demo.com | Employee |

Click an account on the login page to sign in. Try signing in as two different people to see the permission rules.

## Important design decisions

**Preventing double bookings (the core rule).** It is enforced in two layers:

1. The server checks for an overlapping confirmed booking before saving and returns a friendly message naming who holds the slot. Two bookings overlap when each one starts before the other ends. Back-to-back bookings (one ends at 10:00, the next starts at 10:00) are allowed.
2. The database has an exclusion constraint (`no_overlapping_reservations`) on the resource and the time range. If two people save at the same instant, PostgreSQL still accepts only one. This was tested by sending six simultaneous requests for one slot: one succeeded, five were rejected.

When editing a booking, the check ignores that booking itself so it does not conflict with its own old time.

**Cancelling keeps history.** A cancelled booking stays in the table with status `cancelled`, and the constraint only applies to confirmed bookings, so the slot is free again.

**Plain SQL instead of an ORM.** The queries are short and readable, and the overlap constraint is easiest to express directly in SQL (`database/schema.sql`).

**Demo login still uses the database.** The chosen account is looked up in the `users` table and a signed, HTTP-only cookie keeps the session. The signature stops anyone from editing the cookie to become another user. A real system would add passwords and registration.

**Resources are generic.** One `resources` table plus a `resource_types` table means a new kind of resource is just a new row, with no code changes.

**Times** are stored as UTC (`timestamptz`) and shown in the viewer's local time. Messages from the server use Sri Lanka time.

## Business rules

- End time must be after start time; one booking can last at most 12 hours
- A booking cannot start in the past
- Past bookings cannot be changed
- Inactive resources cannot be booked and are hidden from the calendar
- Employees can edit or cancel only their own bookings; administrators can change any

## Project structure

```
database/
  schema.sql              Tables and the overlap constraint
  er-diagram.dbml         Paste into dbdiagram.io to draw the ER diagram
scripts/
  setupDatabase.ts        Creates tables and demo data (npm run db:setup)
src/
  app/
    login/                Demo login page and action
    dashboard/            Calendar page
    admin/resources/      Resource management page (admin only)
    api/reservations/     List, create, edit, cancel reservations
    api/resources/        List, create, edit resources
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
    database.ts           PostgreSQL connection
```

## API

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| GET | /api/reservations?resourceId&start&end | Any user | Bookings of a resource in a date range |
| POST | /api/reservations | Any user | Create a booking |
| PUT | /api/reservations/:id | Owner or admin | Edit a booking |
| DELETE | /api/reservations/:id | Owner or admin | Cancel a booking |
| GET | /api/resources | Any user | List resources |
| POST | /api/resources | Admin | Add a resource |
| PUT | /api/resources/:id | Admin | Edit, activate or deactivate |

## Possible improvements

- Real accounts with passwords and registration
- Recurring bookings and email reminders
- Opening hours and per-resource rules (for example, vehicles need approval)
- Automated tests for the booking rules
