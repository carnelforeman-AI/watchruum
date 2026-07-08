import Link from "next/link";

export function SectionHeader({
  title,
  href,
  hrefLabel = "View all",
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {href && (
        <Link href={href} className="text-[13px] font-semibold text-primary hover:underline">
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}
