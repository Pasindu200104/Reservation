export type UserRole = "admin" | "employee";

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface ResourceTypeSummary {
  id: number;
  name: string;
}

export interface ResourceSummary {
  id: number;
  name: string;
  resourceTypeId: number;
  resourceTypeName: string;
  location: string | null;
  capacity: number | null;
  description: string | null;
  isActive: boolean;
}

export interface ReservationSummary {
  id: number;
  resourceId: number;
  userId: number;
  userName: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: "confirmed" | "cancelled";
}
