import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { Pool } from "pg";

// Creates the tables and fills them with demo data.
// Run with: npm run db:setup

function createTimeOnDay(daysFromToday: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function setupDatabase() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("Creating tables...");
    const schemaSql = readFileSync(path.join(process.cwd(), "database", "schema.sql"), "utf8");
    await pool.query(schemaSql);

    console.log("Adding demo users...");
    const demoUsers = [
      { name: "Kasun Perera", email: "admin@demo.com", role: "admin" },
      { name: "Nimali Silva", email: "nimali@demo.com", role: "employee" },
      { name: "Ruwan Fernando", email: "ruwan@demo.com", role: "employee" },
    ];
    for (const user of demoUsers) {
      await pool.query("INSERT INTO users (name, email, role) VALUES ($1, $2, $3)", [
        user.name,
        user.email,
        user.role,
      ]);
    }

    console.log("Adding resource types and resources...");
    const resourceTypeNames = [
      { name: "Meeting Room", description: "Rooms for meetings and discussions" },
      { name: "Company Vehicle", description: "Vehicles for official travel" },
      { name: "Projector", description: "Portable projectors" },
      { name: "Sports Court", description: "Courts for sports and recreation" },
      { name: "Lab", description: "Laboratories and workshops" },
    ];
    for (const resourceType of resourceTypeNames) {
      await pool.query("INSERT INTO resource_types (name, description) VALUES ($1, $2)", [
        resourceType.name,
        resourceType.description,
      ]);
    }

    const demoResources = [
      { type: "Meeting Room", name: "Meeting Room A", location: "Floor 1", capacity: 8, description: "Whiteboard and TV screen" },
      { type: "Meeting Room", name: "Meeting Room B", location: "Floor 1", capacity: 4, description: "Small room for quick calls" },
      { type: "Meeting Room", name: "Boardroom", location: "Floor 3", capacity: 20, description: "Conference system and projector" },
      { type: "Company Vehicle", name: "Toyota Hiace Van", location: "Basement parking", capacity: 12, description: "Driver not included" },
      { type: "Company Vehicle", name: "Suzuki Wagon R", location: "Basement parking", capacity: 4, description: "For short city trips" },
      { type: "Projector", name: "Projector 1", location: "Equipment room", capacity: null, description: "Full HD with HDMI cable" },
      { type: "Projector", name: "Projector 2", location: "Equipment room", capacity: null, description: "Portable, with carry bag" },
      { type: "Sports Court", name: "Badminton Court", location: "Sports complex", capacity: 4, description: "Indoor wooden floor" },
      { type: "Sports Court", name: "Basketball Court", location: "Sports complex", capacity: 10, description: "Outdoor, floodlights available" },
      { type: "Lab", name: "Computer Lab", location: "Floor 2", capacity: 25, description: "25 workstations" },
      { type: "Lab", name: "Electronics Lab", location: "Floor 2", capacity: 12, description: "Soldering and testing equipment" },
    ];
    for (const resource of demoResources) {
      await pool.query(
        `INSERT INTO resources (resource_type_id, name, location, capacity, description)
         VALUES ((SELECT id FROM resource_types WHERE name = $1), $2, $3, $4, $5)`,
        [resource.type, resource.name, resource.location, resource.capacity, resource.description]
      );
    }

    console.log("Adding sample reservations...");
    const sampleReservations = [
      { resource: "Meeting Room A", email: "nimali@demo.com", purpose: "Weekly team meeting", day: 1, startHour: 10, endHour: 11 },
      { resource: "Meeting Room A", email: "ruwan@demo.com", purpose: "Client presentation", day: 1, startHour: 14, endHour: 16 },
      { resource: "Meeting Room A", email: "admin@demo.com", purpose: "Management review", day: 2, startHour: 9, endHour: 10 },
      { resource: "Meeting Room B", email: "ruwan@demo.com", purpose: "Interview", day: 1, startHour: 11, endHour: 12 },
      { resource: "Toyota Hiace Van", email: "nimali@demo.com", purpose: "Site visit", day: 2, startHour: 8, endHour: 17 },
      { resource: "Projector 1", email: "nimali@demo.com", purpose: "Training session", day: 1, startHour: 13, endHour: 15 },
      { resource: "Badminton Court", email: "ruwan@demo.com", purpose: "Staff tournament", day: 3, startHour: 17, endHour: 19 },
      { resource: "Computer Lab", email: "admin@demo.com", purpose: "Intern workshop", day: 2, startHour: 10, endHour: 13 },
    ];
    for (const reservation of sampleReservations) {
      await pool.query(
        `INSERT INTO reservations (resource_id, user_id, start_time, end_time, purpose)
         VALUES (
           (SELECT id FROM resources WHERE name = $1),
           (SELECT id FROM users WHERE email = $2),
           $3, $4, $5
         )`,
        [
          reservation.resource,
          reservation.email,
          createTimeOnDay(reservation.day, reservation.startHour, 0),
          createTimeOnDay(reservation.day, reservation.endHour, 0),
          reservation.purpose,
        ]
      );
    }

    console.log("Database is ready.");
  } finally {
    await pool.end();
  }
}

setupDatabase().catch((error) => {
  console.error("Database setup failed:", error);
  process.exit(1);
});
