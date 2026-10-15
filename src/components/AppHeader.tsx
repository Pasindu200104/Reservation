import Link from "next/link";
import { logout } from "@/app/actions";
import { CurrentUser } from "@/lib/types";

export default function AppHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold">
            Resource reservations
          </Link>
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-ink">
            Calendar
          </Link>
          {user.role === "admin" && (
            <Link href="/admin/resources" className="text-sm text-slate-600 hover:text-ink">
              Manage resources
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <span>
            {user.name}{" "}
            <span className="text-slate-500">({user.role === "admin" ? "administrator" : "employee"})</span>
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
