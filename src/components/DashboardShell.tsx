import { Header } from "@/components/Header";
import { AppSidebar } from "@/components/Sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandMenuProvider } from "./CommandMenuProvider";
import { RouteProgress } from "./RouteProgress";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={0}>
      {/* Keyboard users can jump past the sidebar straight to the page. */}
      <a
        href="#main-content"
        className="sr-only z-50 bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <RouteProgress />
      <SidebarProvider className="h-svh">
        <AppSidebar />
        <SidebarInset className="overflow-hidden">
          <Header />
          {/* Content region: a definite-height, scrollable flex column. The
              `min-h-0` lets it shrink inside the viewport-tall shell so a
              full-height page (`flex h-full flex-col`) can pin its footer —
              e.g. a DataTable's pagination bar — to the bottom. */}
          {/* SidebarInset is already the page's <main> landmark. */}
          <div
            id="main-content"
            tabIndex={-1}
            className="flex min-h-0 flex-1 flex-col overflow-auto p-4 outline-none md:p-6"
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
      <CommandMenuProvider />
    </TooltipProvider>
  );
}
