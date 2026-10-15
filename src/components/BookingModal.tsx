"use client";

import { FormEvent, useState } from "react";

export interface BookingModalState {
  mode: "create" | "edit" | "view";
  reservationId?: number;
  resourceId: number;
  resourceName: string;
  startTime: Date;
  endTime: Date;
  purpose: string;
  ownerName?: string;
}

interface BookingModalProps {
  state: BookingModalState;
  onClose: () => void;
  onSaved: () => void;
}

// <input type="datetime-local"> wants text like "2026-10-15T09:30" in local time.
function toInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export default function BookingModal({ state, onClose, onSaved }: BookingModalProps) {
  const [purpose, setPurpose] = useState(state.purpose);
  const [startValue, setStartValue] = useState(toInputValue(state.startTime));
  const [endValue, setEndValue] = useState(toInputValue(state.endTime));
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isReadOnly = state.mode === "view";
  const title = state.mode === "create" ? "New booking" : state.mode === "edit" ? "Edit booking" : "Booking details";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    const requestBody = {
      resourceId: state.resourceId,
      purpose,
      startTime: new Date(startValue).toISOString(),
      endTime: new Date(endValue).toISOString(),
    };

    const isCreating = state.mode === "create";
    const response = await fetch(isCreating ? "/api/reservations" : `/api/reservations/${state.reservationId}`, {
      method: isCreating ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    setIsSaving(false);
    if (!response.ok) {
      setErrorMessage(await readErrorMessage(response));
      return;
    }
    onSaved();
  }

  async function handleCancelBooking() {
    if (!window.confirm("Cancel this booking? The time slot will become free.")) {
      return;
    }
    setErrorMessage("");
    setIsSaving(true);

    const response = await fetch(`/api/reservations/${state.reservationId}`, { method: "DELETE" });

    setIsSaving(false);
    if (!response.ok) {
      setErrorMessage(await readErrorMessage(response));
      return;
    }
    onSaved();
  }

  const inputClassName =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {state.resourceName}
          {state.ownerName ? `, booked by ${state.ownerName}` : ""}
        </p>

        <label className="mt-5 block text-sm font-medium">
          Purpose
          <input
            type="text"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            disabled={isReadOnly}
            maxLength={200}
            required
            placeholder="For example: Team meeting"
            className={inputClassName}
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">
            Starts
            <input
              type="datetime-local"
              value={startValue}
              onChange={(event) => setStartValue(event.target.value)}
              disabled={isReadOnly}
              required
              className={inputClassName}
            />
          </label>
          <label className="block text-sm font-medium">
            Ends
            <input
              type="datetime-local"
              value={endValue}
              onChange={(event) => setEndValue(event.target.value)}
              disabled={isReadOnly}
              required
              className={inputClassName}
            />
          </label>
        </div>

        {errorMessage && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <div>
            {state.mode === "edit" && (
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={isSaving}
                className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Cancel booking
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              {isReadOnly ? "Close" : "Discard"}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {isSaving ? "Saving..." : state.mode === "create" ? "Book now" : "Save changes"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
