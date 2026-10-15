import { ApplicationError } from "./errors";

function readBodyObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null) {
    throw new ApplicationError("The request body is not valid.", 400);
  }
  return body as Record<string, unknown>;
}

export function parseIdentifier(value: unknown, label: string): number {
  const identifier = Number(value);
  if (!Number.isInteger(identifier) || identifier <= 0) {
    throw new ApplicationError(`${label} is not valid.`, 400);
  }
  return identifier;
}

function parseOptionalText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export function parseReservationInput(body: unknown) {
  const data = readBodyObject(body);

  const startTime = new Date(String(data.startTime));
  const endTime = new Date(String(data.endTime));
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new ApplicationError("Please choose a valid start and end time.", 400);
  }

  const purpose = String(data.purpose ?? "").trim();
  if (purpose.length === 0) {
    throw new ApplicationError("Please enter a purpose for the booking.", 400);
  }
  if (purpose.length > 200) {
    throw new ApplicationError("The purpose must be 200 characters or fewer.", 400);
  }

  return { startTime, endTime, purpose };
}

export function parseResourceInput(body: unknown) {
  const data = readBodyObject(body);

  const name = String(data.name ?? "").trim();
  if (name.length === 0) {
    throw new ApplicationError("Please enter a name for the resource.", 400);
  }

  const resourceTypeId = parseIdentifier(data.resourceTypeId, "The resource type");

  let capacity: number | null = null;
  const capacityText = String(data.capacity ?? "").trim();
  if (capacityText.length > 0) {
    capacity = Number(capacityText);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new ApplicationError("Capacity must be a whole number greater than zero.", 400);
    }
  }

  return {
    name,
    resourceTypeId,
    location: parseOptionalText(data.location),
    capacity,
    description: parseOptionalText(data.description),
    isActive: data.isActive === undefined ? true : Boolean(data.isActive),
  };
}
