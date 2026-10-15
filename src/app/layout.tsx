import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resource Reservations",
  description: "Book meeting rooms, vehicles, projectors, sports courts and labs without double bookings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
