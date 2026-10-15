import { databasePool } from "./database";
import { ApplicationError } from "./errors";
import { CurrentUser, ReservationSummary } from "./types";

const APPLICATION_TIME_ZONE = "Asia/Colombo";
const MAXIMUM_DURATION_IN_HOURS = 12;
const POSTGRES_EXCLUSION_VIOLATION = "23P01";

interface ReservationInput {
  startTime: Date;
  endTime: Date;
  purpose: string;
}

function formatTimeForMessage(date: Date): string {
  return date.toLocaleString("en-GB", {
    timeZone: APPLICATION_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function checkTimeRange(startTime: Date, endTime: Date) {
  if (endTime <= startTime) {
    throw new ApplicationError("The end time must be after the start time.", 400);
  }
  const durationInHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  if (durationInHours > MAXIMUM_DURATION_IN_HOURS) {
    throw new ApplicationError(
      `A single booking can be at most ${MAXIMUM_DURATION_IN_HOURS} hours long.`,
      400
    );
  }
}

function checkNotInPast(startTime: Date) {
  if (startTime.getTime() < Date.now()) {
    throw new ApplicationError("The start time cannot be in the past.", 400);
  }
}

// Looks for a confirmed reservation that overlaps the given time range.
// Two ranges overlap when each one starts before the other one ends.
async function findConflictingReservation(
  resourceId: number,
  startTime: Date,
  endTime: Date,
  reservationIdToIgnore: number | null
) {
  const result = await databasePool.query(
    `SELECT reservations.start_time, reservations.end_time, users.name AS user_name
     FROM reservations
     JOIN users ON users.id = reservations.user_id
     WHERE reservations.resource_id = $1
       AND reservations.status = 'confirmed'
       AND reservations.start_time < $3
       AND reservations.end_time > $2
       AND ($4::int IS NULL OR reservations.id <> $4)
     LIMIT 1`,
    [resourceId, startTime, endTime, reservationIdToIgnore]
  );
  return result.rows[0] ?? null;
}

async function throwIfConflict(
  resourceId: number,
  startTime: Date,
  endTime: Date,
  reservationIdToIgnore: number | null
) {
  const conflict = await findConflictingReservation(resourceId, startTime, endTime, reservationIdToIgnore);
  if (conflict) {
    throw new ApplicationError(
      `This slot overlaps a booking by ${conflict.user_name} ` +
        `(${formatTimeForMessage(conflict.start_time)} to ${formatTimeForMessage(conflict.end_time)}). ` +
        `Please choose a free time.`,
      409
    );
  }
}

// The check above gives a friendly message. If two people save at the very
// same moment, the database constraint is the final safety net.
function convertDatabaseError(error: unknown): never {
  const databaseError = error as { code?: string };
  if (databaseError.code === POSTGRES_EXCLUSION_VIOLATION) {
    throw new ApplicationError(
      "Someone else just booked this resource for that time. Please choose another slot.",
      409
    );
  }
  throw error;
}

export async function listReservations(
  resourceId: number,
  rangeStart: Date,
  rangeEnd: Date
): Promise<ReservationSummary[]> {
  const result = await databasePool.query(
    `SELECT reservations.id,
            reservations.resource_id AS "resourceId",
            reservations.user_id AS "userId",
            users.name AS "userName",
            reservations.start_time AS "startTime",
            reservations.end_time AS "endTime",
            reservations.purpose,
            reservations.status
     FROM reservations
     JOIN users ON users.id = reservations.user_id
     WHERE reservations.resource_id = $1
       AND reservations.status = 'confirmed'
       AND reservations.start_time < $3
       AND reservations.end_time > $2
     ORDER BY reservations.start_time`,
    [resourceId, rangeStart, rangeEnd]
  );
  return result.rows;
}

export async function createReservation(
  resourceId: number,
  currentUser: CurrentUser,
  input: ReservationInput
) {
  const resourceResult = await databasePool.query("SELECT is_active FROM resources WHERE id = $1", [resourceId]);
  if (resourceResult.rows.length === 0) {
    throw new ApplicationError("This resource does not exist.", 404);
  }
  if (!resourceResult.rows[0].is_active) {
    throw new ApplicationError("This resource is not available for booking.", 400);
  }

  checkTimeRange(input.startTime, input.endTime);
  checkNotInPast(input.startTime);
  await throwIfConflict(resourceId, input.startTime, input.endTime, null);

  try {
    const result = await databasePool.query(
      `INSERT INTO reservations (resource_id, user_id, start_time, end_time, purpose)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [resourceId, currentUser.id, input.startTime, input.endTime, input.purpose]
    );
    return { id: result.rows[0].id as number };
  } catch (error) {
    return convertDatabaseError(error);
  }
}

async function loadReservationForChange(reservationId: number, currentUser: CurrentUser) {
  const result = await databasePool.query(
    "SELECT id, resource_id, user_id, start_time, end_time, status FROM reservations WHERE id = $1",
    [reservationId]
  );
  const reservation = result.rows[0];

  if (!reservation) {
    throw new ApplicationError("This reservation does not exist.", 404);
  }
  if (reservation.status === "cancelled") {
    throw new ApplicationError("This reservation is already cancelled.", 400);
  }
  if (reservation.user_id !== currentUser.id && currentUser.role !== "admin") {
    throw new ApplicationError("You can only change your own reservations.", 403);
  }
  if (new Date(reservation.end_time).getTime() < Date.now()) {
    throw new ApplicationError("Past reservations cannot be changed.", 400);
  }
  return reservation;
}

export async function updateReservation(
  reservationId: number,
  currentUser: CurrentUser,
  input: ReservationInput
) {
  const existing = await loadReservationForChange(reservationId, currentUser);

  checkTimeRange(input.startTime, input.endTime);

  // Only block past start times when the person actually moved the start time.
  // This lets someone fix the purpose of a meeting that is already in progress.
  const startTimeChanged = new Date(existing.start_time).getTime() !== input.startTime.getTime();
  if (startTimeChanged) {
    checkNotInPast(input.startTime);
  }

  // Ignore this reservation itself, otherwise it would conflict with its own old time.
  await throwIfConflict(existing.resource_id, input.startTime, input.endTime, reservationId);

  try {
    await databasePool.query(
      `UPDATE reservations
       SET start_time = $1, end_time = $2, purpose = $3, updated_at = now()
       WHERE id = $4`,
      [input.startTime, input.endTime, input.purpose, reservationId]
    );
  } catch (error) {
    convertDatabaseError(error);
  }
}

// Cancelling keeps the row (status = 'cancelled') so there is a history,
// and the time slot becomes free again for other people.
export async function cancelReservation(reservationId: number, currentUser: CurrentUser) {
  await loadReservationForChange(reservationId, currentUser);
  await databasePool.query(
    "UPDATE reservations SET status = 'cancelled', updated_at = now() WHERE id = $1",
    [reservationId]
  );
}
