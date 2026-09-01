import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./core";

const getVisiblePages = (currentPage: number, totalPages: number) => {
  const pages: Array<number | "ellipsis-start" | "ellipsis-end"> = [];

  for (let page = 1; page <= totalPages; page += 1) {
    const isEdge = page === 1 || page === totalPages;
    const isNearCurrent = Math.abs(page - currentPage) <= 1;

    if (totalPages <= 5 || isEdge || isNearCurrent) {
      pages.push(page);
    } else if (page < currentPage && !pages.includes("ellipsis-start")) {
      pages.push("ellipsis-start");
    } else if (page > currentPage && !pages.includes("ellipsis-end")) {
      pages.push("ellipsis-end");
    }
  }

  return pages;
};

type PaginationBarProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  itemLabel: string;
  itemLabelPlural: string;
  onPageChange: (page: number) => void;
  className?: string;
};

export const PaginationBar = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  itemLabel,
  itemLabelPlural,
  onPageChange,
  className,
}: PaginationBarProps) => {
  if (totalPages <= 1) return null;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const itemText = totalItems === 1 ? itemLabel : itemLabelPlural;
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div className={cn(
      "flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 md:flex-row",
      className
    )}>
      <p className="text-center text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground sm:text-left">
        Mostrando <span className="text-foreground">{startItem}</span>-
        <span className="text-foreground">{endItem}</span> de{" "}
        <span className="text-foreground">{totalItems}</span> {itemText}
      </p>

      <div className="flex w-full items-center justify-start gap-1 overflow-x-auto pb-1 no-scrollbar sm:w-auto sm:justify-center sm:pb-0">
        <PaginationButton onClick={() => onPageChange(1)} disabled={currentPage === 1} ariaLabel="Primeira página">
          <ChevronLeft size={16} className="-mr-1.5" />
          <ChevronLeft size={16} />
        </PaginationButton>
        <PaginationButton onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} ariaLabel="Página anterior">
          <ChevronLeft size={16} />
        </PaginationButton>

        <div className="mx-1 flex items-center gap-1">
          {visiblePages.map((page) => (
            typeof page === "number" ? (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-all active:scale-95",
                  currentPage === page
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            ) : (
              <span key={page} className="flex h-9 w-6 shrink-0 items-center justify-center text-xs font-black text-muted-foreground/50">
                ...
              </span>
            )
          ))}
        </div>

        <PaginationButton onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} ariaLabel="Próxima página">
          <ChevronRight size={16} />
        </PaginationButton>
        <PaginationButton onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} ariaLabel="Última página">
          <ChevronRight size={16} />
          <ChevronRight size={16} className="-ml-1.5" />
        </PaginationButton>
      </div>
    </div>
  );
};

const PaginationButton = ({
  children,
  disabled,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-all hover:bg-accent active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    aria-label={ariaLabel}
  >
    {children}
  </button>
);
