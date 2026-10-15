import AppHeader from "@/components/AppHeader";
import ReservationCalendar from "@/components/ReservationCalendar";
import { listResources, listResourceTypes } from "@/lib/resourceService";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const currentUser = await requireUser();
  const resourceTypes = await listResourceTypes();
  const resources = await listResources(false);

  return (
    <>
      <AppHeader user={currentUser} />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <ReservationCalendar resourceTypes={resourceTypes} resources={resources} currentUser={currentUser} />
      </main>
    </>
  );
}
