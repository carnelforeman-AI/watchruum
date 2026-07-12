import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getMySchedule } from "@/lib/schedule";
import { MySchedule } from "@/components/schedule/my-schedule";

export const metadata = { title: "My Schedule · Watchruum" };
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const sched = await getMySchedule();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <div className="mb-1 flex items-center gap-2">
        <CalendarClock className="size-6 text-primary" />
        <h1 className="text-2xl font-extrabold tracking-tight">My Schedule</h1>
      </div>
      <p className="mb-5 text-[13px] text-muted-2">
        Plan when you&apos;ll watch — solo or as a watch party. Add any watch to your phone calendar for a reminder.
      </p>

      {sched.signedIn ? (
        <MySchedule initialUpcoming={sched.upcoming} initialInvites={sched.invites} />
      ) : (
        <div className="glass grid place-items-center rounded-2xl py-14 text-center">
          <CalendarClock className="mb-2 size-8 text-muted-2" />
          <p className="font-semibold">Sign in to plan your watches</p>
          <Link href="/login" className="mt-3 text-[13px] font-semibold text-primary hover:underline">Sign in</Link>
        </div>
      )}
    </div>
  );
}
