import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ResourceManager from "@/components/ResourceManager";
import { listResources, listResourceTypes } from "@/lib/resourceService";
import { requireUser } from "@/lib/session";

export default async function ManageResourcesPage() {
  const currentUser = await requireUser();
  if (currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const resourceTypes = await listResourceTypes();
  const resources = await listResources(true);

  return (
    <>
      <AppHeader user={currentUser} />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <ResourceManager initialResources={resources} resourceTypes={resourceTypes} />
      </main>
    </>
  );
}
