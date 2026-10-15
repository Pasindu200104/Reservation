import { redirect } from "next/navigation";
import { databasePool } from "@/lib/database";
import { getCurrentUser } from "@/lib/session";
import { loginWithEmail } from "./actions";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const result = await databasePool.query("SELECT name, email, role FROM users ORDER BY role, name");
  const demoUsers: { name: string; email: string; role: string }[] = result.rows;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Resource reservations</h1>
      <p className="mt-2 text-slate-600">
        Book meeting rooms, vehicles, projectors, sports courts and labs. Pick a demo account to continue.
      </p>

      {error && (
        <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          That account was not found. Run <code>npm run db:setup</code> to create the demo accounts.
        </p>
      )}

      <div className="mt-8 space-y-3">
        {demoUsers.map((user) => (
          <form key={user.email} action={loginWithEmail}>
            <input type="hidden" name="email" value={user.email} />
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-3 text-left transition hover:border-brand hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span>
                <span className="block font-medium">{user.name}</span>
                <span className="block text-sm text-slate-500">{user.email}</span>
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  user.role === "admin" ? "bg-ink text-white" : "bg-brand-light text-brand-dark"
                }`}
              >
                {user.role === "admin" ? "Administrator" : "Employee"}
              </span>
            </button>
          </form>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate-500">
        Administrators can manage resources and change any booking. Employees can change only their own bookings.
      </p>
    </main>
  );
}
