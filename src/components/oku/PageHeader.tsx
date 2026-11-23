import { useLocation } from "@tanstack/react-router";
import { type ReactNode, useRef } from "react";
import { useFirstVisitEntrance } from "@/lib/motion";

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Right-aligned controls (filters, actions). */
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = useLocation({ select: (l) => l.pathname });
  // The page's sections (this header's siblings) cascade in on first visit.
  useFirstVisitEntrance(() => ref.current?.parentElement, pathname);
  return (
    <div
      ref={ref}
      className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
