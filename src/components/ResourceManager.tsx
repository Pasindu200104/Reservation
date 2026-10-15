"use client";

import { FormEvent, useState } from "react";
import type { ResourceSummary, ResourceTypeSummary } from "@/lib/types";

interface ResourceManagerProps {
  initialResources: ResourceSummary[];
  resourceTypes: ResourceTypeSummary[];
}

interface ResourceFormValues {
  name: string;
  resourceTypeId: string;
  location: string;
  capacity: string;
  description: string;
}

const EMPTY_FORM: ResourceFormValues = {
  name: "",
  resourceTypeId: "",
  location: "",
  capacity: "",
  description: "",
};

export default function ResourceManager({ initialResources, resourceTypes }: ResourceManagerProps) {
  const [resources, setResources] = useState(initialResources);
  const [formValues, setFormValues] = useState<ResourceFormValues>({
    ...EMPTY_FORM,
    resourceTypeId: String(resourceTypes[0]?.id ?? ""),
  });
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function reloadResources() {
    const response = await fetch("/api/resources?includeInactive=true");
    if (response.ok) {
      setResources(await response.json());
    }
  }

  async function sendResource(resourceId: number | null, values: ResourceFormValues, isActive: boolean) {
    const response = await fetch(resourceId === null ? "/api/resources" : `/api/resources/${resourceId}`, {
      method: resourceId === null ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, isActive }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "Something went wrong. Please try again.");
    }
  }

  function startEditing(resource: ResourceSummary) {
    setEditingResourceId(resource.id);
    setErrorMessage("");
    setFormValues({
      name: resource.name,
      resourceTypeId: String(resource.resourceTypeId),
      location: resource.location ?? "",
      capacity: resource.capacity ? String(resource.capacity) : "",
      description: resource.description ?? "",
    });
  }

  function resetForm() {
    setEditingResourceId(null);
    setErrorMessage("");
    setFormValues({ ...EMPTY_FORM, resourceTypeId: String(resourceTypes[0]?.id ?? "") });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);
    try {
      const existingResource = resources.find((resource) => resource.id === editingResourceId);
      await sendResource(editingResourceId, formValues, existingResource?.isActive ?? true);
      await reloadResources();
      resetForm();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(resource: ResourceSummary) {
    setErrorMessage("");
    try {
      await sendResource(
        resource.id,
        {
          name: resource.name,
          resourceTypeId: String(resource.resourceTypeId),
          location: resource.location ?? "",
          capacity: resource.capacity ? String(resource.capacity) : "",
          description: resource.description ?? "",
        },
        !resource.isActive
      );
      await reloadResources();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  function updateField(field: keyof ResourceFormValues, value: string) {
    setFormValues((previousValues) => ({ ...previousValues, [field]: value }));
  }

  const inputClassName =
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

  return (
    <div>
      <h1 className="text-xl font-semibold">Manage resources</h1>
      <p className="mt-1 text-sm text-slate-600">
        Deactivating a resource hides it from the booking calendar. Existing bookings are kept.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-medium">{editingResourceId === null ? "Add a resource" : "Edit resource"}</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium">
            Name
            <input
              value={formValues.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
              className={inputClassName}
            />
          </label>
          <label className="block text-sm font-medium">
            Type
            <select
              value={formValues.resourceTypeId}
              onChange={(event) => updateField("resourceTypeId", event.target.value)}
              className={inputClassName}
            >
              {resourceTypes.map((resourceType) => (
                <option key={resourceType.id} value={resourceType.id}>
                  {resourceType.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Location
            <input
              value={formValues.location}
              onChange={(event) => updateField("location", event.target.value)}
              className={inputClassName}
            />
          </label>
          <label className="block text-sm font-medium">
            Capacity
            <input
              type="number"
              min={1}
              value={formValues.capacity}
              onChange={(event) => updateField("capacity", event.target.value)}
              className={inputClassName}
            />
          </label>
          <label className="block text-sm font-medium md:col-span-2">
            Description
            <input
              value={formValues.description}
              onChange={(event) => updateField("description", event.target.value)}
              className={inputClassName}
            />
          </label>
        </div>

        {errorMessage && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {editingResourceId === null ? "Add resource" : "Save changes"}
          </button>
          {editingResourceId !== null && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Stop editing
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Capacity</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{resource.name}</td>
                <td className="px-4 py-3">{resource.resourceTypeName}</td>
                <td className="px-4 py-3">{resource.location ?? "-"}</td>
                <td className="px-4 py-3">{resource.capacity ?? "-"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      resource.isActive ? "bg-brand-light text-brand-dark" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {resource.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(resource)}
                      className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(resource)}
                      className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50"
                    >
                      {resource.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
