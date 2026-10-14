import { cn } from "cn";

interface DemoBannerProps {
  className?: string;
  message?: string;
}

export function DemoBanner({ className, message = "This page displays demo data. It is not yet connected to the backend." }: DemoBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground",
        className
      )}
      role="status"
    >
      <svg className="size-3.5 shrink-0 text-warning" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
