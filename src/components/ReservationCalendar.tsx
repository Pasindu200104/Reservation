"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, DatesSetArg, EventClickArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import BookingModal, { BookingModalState } from "./BookingModal";
import type { CurrentUser, ReservationSummary, ResourceSummary, ResourceTypeSummary } from "@/lib/types";

interface ReservationCalendarProps {
  resourceTypes: ResourceTypeSummary[];
  resources: ResourceSummary[];
  currentUser: CurrentUser;
}

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

export default function ReservationCalendar({ resourceTypes, resources, currentUser }: ReservationCalendarProps) {
  const firstTypeWithResources = resourceTypes.find((resourceType) =>
    resources.some((resource) => resource.resourceTypeId === resourceType.id)
  );
  const firstResource = resources.find((resource) => resource.resourceTypeId === firstTypeWithResources?.id);

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(firstTypeWithResources?.id ?? null);
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(firstResource?.id ?? null);
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);
  const [reservations, setReservations] = useState<ReservationSummary[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [modalState, setModalState] = useState<BookingModalState | null>(null);
  const [loadError, setLoadError] = useState("");

  const resourcesOfSelectedType = resources.filter((resource) => resource.resourceTypeId === selectedTypeId);
  const selectedResource = resources.find((resource) => resource.id === selectedResourceId) ?? null;

  // Load the reservations of the chosen resource for the dates the calendar is showing.
  useEffect(() => {
    if (selectedResourceId === null || visibleRange === null) {
      setReservations([]);
      return;
    }

    const resourceId = selectedResourceId;
    const range = visibleRange;
    let wasCancelled = false;

    async function loadReservations() {
      const query = new URLSearchParams({
        resourceId: String(resourceId),
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      });
      const response = await fetch(`/api/reservations?${query}`);
      if (wasCancelled) {
        return;
      }
      if (!response.ok) {
        setLoadError("Could not load reservations. Please refresh the page.");
        return;
      }
      setLoadError("");
      setReservations(await response.json());
    }

    loadReservations();
    return () => {
      wasCancelled = true;
    };
  }, [selectedResourceId, visibleRange, refreshCounter]);

  function handleTypeChange(typeId: number) {
    setSelectedTypeId(typeId);
    const firstResourceOfType = resources.find((resource) => resource.resourceTypeId === typeId);
    setSelectedResourceId(firstResourceOfType?.id ?? null);
  }

  function handleDatesChange(info: DatesSetArg) {
    setVisibleRange({ start: info.start, end: info.end });
  }

  // Clicking a day in the month view opens that day's hourly view.
  // Clicking a free time in the week or day view opens the booking form.
  function handleDateClick(info: DateClickArg) {
    if (info.allDay) {
      info.view.calendar.changeView("timeGridDay", info.date);
      return;
    }
    if (!selectedResource || info.date.getTime() < Date.now()) {
      return;
    }

    // Suggest one hour, but stop early if another booking starts sooner.
    const startTime = info.date;
    let endTime = new Date(startTime.getTime() + ONE_HOUR_IN_MILLISECONDS);
    for (const reservation of reservations) {
      const reservationStart = new Date(reservation.startTime);
      if (reservationStart > startTime && reservationStart < endTime) {
        endTime = reservationStart;
      }
    }

    setModalState({
      mode: "create",
      resourceId: selectedResource.id,
      resourceName: selectedResource.name,
      startTime,
      endTime,
      purpose: "",
    });
  }

  // Dragging across several free slots chooses a longer booking.
  function handleSelect(selection: DateSelectArg) {
    const calendar = selection.view.calendar;
    calendar.unselect();
    if (selection.allDay) {
      calendar.changeView("timeGridDay", selection.start);
      return;
    }
    if (!selectedResource) {
      return;
    }
    setModalState({
      mode: "create",
      resourceId: selectedResource.id,
      resourceName: selectedResource.name,
      startTime: selection.start,
      endTime: selection.end,
      purpose: "",
    });
  }

  function handleEventClick(info: EventClickArg) {
    const reservation = reservations.find((item) => String(item.id) === info.event.id);
    if (!reservation || !selectedResource) {
      return;
    }

    const isOwner = reservation.userId === currentUser.id;
    const hasEnded = new Date(reservation.endTime).getTime() < Date.now();
    const canChange = (isOwner || currentUser.role === "admin") && !hasEnded;

    setModalState({
      mode: canChange ? "edit" : "view",
      reservationId: reservation.id,
      resourceId: selectedResource.id,
      resourceName: selectedResource.name,
      startTime: new Date(reservation.startTime),
      endTime: new Date(reservation.endTime),
      purpose: reservation.purpose,
      ownerName: reservation.userName,
    });
  }

  function handleSaved() {
    setModalState(null);
    setRefreshCounter((counter) => counter + 1);
  }

  const calendarEvents = reservations.map((reservation) => {
    const isOwner = reservation.userId === currentUser.id;
    return {
      id: String(reservation.id),
      title: `${reservation.purpose} (${reservation.userName})`,
      start: reservation.startTime,
      end: reservation.endTime,
      backgroundColor: isOwner ? "#1f8f63" : "#64748b",
      borderColor: isOwner ? "#176f4e" : "#475569",
    };
  });

  if (resources.length === 0) {
    return <p className="text-slate-600">There are no resources to book yet. An administrator can add some.</p>;
  }

  const selectClassName =
    "mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-medium">
          Resource type
          <select
            value={selectedTypeId ?? ""}
            onChange={(event) => handleTypeChange(Number(event.target.value))}
            className={`${selectClassName} block`}
          >
            {resourceTypes
              .filter((resourceType) => resources.some((resource) => resource.resourceTypeId === resourceType.id))
              .map((resourceType) => (
                <option key={resourceType.id} value={resourceType.id}>
                  {resourceType.name}
                </option>
              ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Resource
          <select
            value={selectedResourceId ?? ""}
            onChange={(event) => setSelectedResourceId(Number(event.target.value))}
            className={`${selectClassName} block`}
          >
            {resourcesOfSelectedType.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
              </option>
            ))}
          </select>
        </label>

        {selectedResource && (
          <p className="pb-2 text-sm text-slate-600">
            {[
              selectedResource.location,
              selectedResource.capacity ? `Capacity ${selectedResource.capacity}` : null,
              selectedResource.description,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#1f8f63]" /> Your bookings
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#64748b]" /> Booked by others
        </span>
        <span>Open a day, then click a free time to book. Click a booking to see or change it.</span>
      </div>

      {loadError && <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }}
          firstDay={1}
          height="auto"
          nowIndicator
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          dayMaxEvents={3}
          events={calendarEvents}
          datesSet={handleDatesChange}
          dateClick={handleDateClick}
          selectable
          selectMinDistance={5}
          selectOverlap={false}
          select={handleSelect}
          selectAllow={(selection) => selection.allDay || selection.start.getTime() >= Date.now()}
          eventClick={handleEventClick}
        />
      </div>

      {modalState && (
        <BookingModal
          key={`${modalState.mode}-${modalState.reservationId ?? "new"}-${modalState.startTime.getTime()}`}
          state={modalState}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
