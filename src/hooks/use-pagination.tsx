import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function usePagination<T>(rows: T[], initialSize = 25) {
  const [pageSize, setPageSize] = useState(initialSize);
  const [page, setPage] = useState(1);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [pageCount, page]);

  const paged = useMemo(
    () => rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [rows, page, pageSize]
  );

  const changePageSize = (n: number) => {
    setPageSize(n);
    setPage(1);
  };

  return { paged, page, setPage, pageSize, setPageSize: changePageSize, pageCount, total };
}

interface TablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
  label?: string;
}

export function TablePagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  label = "registros",
}: TablePaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3 bg-muted/20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Exibir</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-[72px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>
          por página — {from}-{to} de {total} {label}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="h-8 min-w-8 px-2 text-xs"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
