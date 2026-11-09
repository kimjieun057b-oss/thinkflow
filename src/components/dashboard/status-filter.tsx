import Link from "next/link";

import { PROJECT_STATUS_FILTERS } from "@/constants/project";
import type { ProjectStatus } from "@/types/database";
import { cn } from "cn";

export function StatusFilter({ active }: { active: ProjectStatus | "all" }) {
  return (
    <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-[3px]">
      {PROJECT_STATUS_FILTERS.map((filter) => (
        <Link
          key={filter.value}
          href={filter.value === "all" ? "/dashboard" : `/dashboard?status=${filter.value}`}
          className={cn(
            "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
            active === filter.value
              ? "bg-background text-foreground shadow-sm"
              : "text-foreground/60 hover:text-foreground",
          )}
        >
          {filter.label}
        </Link>
      ))}
    </div>
  );
}
