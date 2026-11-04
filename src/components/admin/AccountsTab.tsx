import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney } from "@/lib/format";
import { Icon } from "@/components/site/Icon";
import { deleteAdminOrder, listAdminOrders } from "@/lib/admin-orders.functions";
import { toast } from "sonner";

type Order = {
  id: string;
  order_id: string;
  total_cents: number;
  status: string;
  created_at: string;
  customer: { name?: string; email?: string };
};

export function AccountsTab() {
  const qc = useQueryClient();
  const listOrders = useServerFn(listAdminOrders);
  const deleteOrder = useServerFn(deleteAdminOrder);
  const { data: orders } = useQuery({
    queryKey: ["accounts-orders"],
    queryFn: async () => (await listOrders()) as unknown as Order[],
  });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    let list = (orders ?? []).filter((o) => o.status !== "cancelled");
    if (from) list = list.filter((o) => new Date(o.created_at) >= new Date(from));
    if (to) list = list.filter((o) => new Date(o.created_at) <= new Date(to + "T23:59:59"));
    return list;
  }, [orders, from, to]);

  const totals = useMemo(() => {
    const paid = filtered.filter((o) => ["paid", "shipped", "delivered"].includes(o.status));
    return {
      revenue: paid.reduce((s, o) => s + o.total_cents, 0),
      count: paid.length,
      pending: filtered
        .filter((o) => o.status === "pending")
        .reduce((s, o) => s + o.total_cents, 0),
    };
  }, [filtered]);

  const rows = filtered.map((o) => ({
    order_id: o.order_id,
    customer: o.customer?.name ?? "",
    email: o.customer?.email ?? "",
    status: o.status,
    total: (o.total_cents / 100).toFixed(2),
    date: new Date(o.created_at).toISOString(),
  }));

  function exportCSV() {
    const csv = Papa.unparse(rows);
    download(new Blob([csv], { type: "text/csv" }), "accounts.csv");
  }
  function exportXLSX() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Orders");
    XLSX.writeFile(wb, "accounts.xlsx");
  }
  function exportPDF() {
    const doc = new jsPDF();
    doc.text("Accounts", 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [["Order ID", "Customer", "Email", "Status", "Total", "Date"]],
      body: rows.map((r) => [r.order_id, r.customer, r.email, r.status, r.total, r.date]),
    });
    doc.save("accounts.pdf");
  }
  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function remove(id: string) {
    if (!confirm("Delete this account entry/order permanently?")) return;
    try {
      await deleteOrder({ data: { id } });
      toast.success("Entry deleted");
      qc.invalidateQueries({ queryKey: ["accounts-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Revenue" value={formatMoney(totals.revenue)} />
        <Stat label="Orders paid" value={String(totals.count)} />
        <Stat label="Pending amount" value={formatMoney(totals.pending)} />
      </div>
      <div className="rounded-2xl bg-card border border-border p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs uppercase text-muted-foreground">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-muted-foreground">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={exportCSV}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-foreground/5 inline-flex items-center gap-2"
          >
            <Icon name="download-outline" size={14} /> CSV
          </button>
          <button
            onClick={exportXLSX}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-foreground/5 inline-flex items-center gap-2"
          >
            <Icon name="download-outline" size={14} /> XLSX
          </button>
          <button
            onClick={exportPDF}
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-foreground/5 inline-flex items-center gap-2"
          >
            <Icon name="download-outline" size={14} /> PDF
          </button>
        </div>
      </div>
      <div className="rounded-2xl bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left p-3">Order</th>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Total</th>
              <th className="text-right p-3">Date</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="p-3 font-mono text-xs">{o.order_id}</td>
                <td className="p-3">{o.customer?.name}</td>
                <td className="p-3">{o.status}</td>
                <td className="p-3 text-right font-medium">{formatMoney(o.total_cents)}</td>
                <td className="p-3 text-right text-muted-foreground">
                  {o.created_at ? new Date(o.created_at).toLocaleDateString() : "N/A"}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => remove(o.id)}
                    className="text-destructive hover:bg-destructive/10 h-8 w-8 inline-grid place-items-center"
                    aria-label="Delete entry"
                  >
                    <Icon name="trash-outline" size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">No entries.</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
