import { databasePool } from "./database";
import { ApplicationError } from "./errors";
import { ResourceSummary, ResourceTypeSummary } from "./types";

const POSTGRES_UNIQUE_VIOLATION = "23505";

interface ResourceInput {
  name: string;
  resourceTypeId: number;
  location: string | null;
  capacity: number | null;
  description: string | null;
  isActive: boolean;
}

export async function listResourceTypes(): Promise<ResourceTypeSummary[]> {
  const result = await databasePool.query("SELECT id, name FROM resource_types ORDER BY name");
  return result.rows;
}

export async function listResources(includeInactive: boolean): Promise<ResourceSummary[]> {
  const result = await databasePool.query(
    `SELECT resources.id,
            resources.name,
            resources.resource_type_id AS "resourceTypeId",
            resource_types.name AS "resourceTypeName",
            resources.location,
            resources.capacity,
            resources.description,
            resources.is_active AS "isActive"
     FROM resources
     JOIN resource_types ON resource_types.id = resources.resource_type_id
     WHERE ($1 OR resources.is_active)
     ORDER BY resource_types.name, resources.name`,
    [includeInactive]
  );
  return result.rows;
}

function convertDatabaseError(error: unknown): never {
  const databaseError = error as { code?: string };
  if (databaseError.code === POSTGRES_UNIQUE_VIOLATION) {
    throw new ApplicationError("A resource with this name already exists.", 409);
  }
  throw error;
}

export async function createResource(input: ResourceInput) {
  try {
    await databasePool.query(
      `INSERT INTO resources (resource_type_id, name, location, capacity, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [input.resourceTypeId, input.name, input.location, input.capacity, input.description, input.isActive]
    );
  } catch (error) {
    convertDatabaseError(error);
  }
}

export async function updateResource(resourceId: number, input: ResourceInput) {
  try {
    const result = await databasePool.query(
      `UPDATE resources
       SET resource_type_id = $1, name = $2, location = $3, capacity = $4, description = $5, is_active = $6
       WHERE id = $7`,
      [input.resourceTypeId, input.name, input.location, input.capacity, input.description, input.isActive, resourceId]
    );
    if (result.rowCount === 0) {
      throw new ApplicationError("This resource does not exist.", 404);
    }
  } catch (error) {
    convertDatabaseError(error);
  }
}
