import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createStaff, removeStaff, listStaff, updateStaffPermissions } from "@/lib/staff.functions";
import { Icon } from "@/components/site/Icon";
import type { StaffPermission } from "@/lib/auth";

const PERMISSIONS: { id: StaffPermission; label: string }[] = [
  { id: "content", label: "Content" },
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
  { id: "accounts", label: "Accounts" },
  { id: "notifications", label: "Notifications" },
];

export function StaffsTab({ currentRole }: { currentRole: "admin" | "staff" }) {
  const qc = useQueryClient();
  const list = useServerFn(listStaff);
  const create = useServerFn(createStaff);
  const remove = useServerFn(removeStaff);
  const updatePermissions = useServerFn(updateStaffPermissions);
  const { data, isLoading } = useQuery({ queryKey: ["staff-list"], queryFn: () => list() });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [permissions, setPermissions] = useState<StaffPermission[]>([
    "products",
    "orders",
    "notifications",
  ]);
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<{
    email: string;
    password: string;
    link?: string | null;
  } | null>(null);

  if (currentRole !== "admin") {
    return (
      <div className="rounded-2xl bg-card border border-border p-6">
        <p className="text-muted-foreground">Only admins can manage staff.</p>
      </div>
    );
  }

  async function add() {
    setBusy(true);
    try {
      const result = await create({ data: { email, password, role, permissions } });
      toast.success("Staff account created");
      setInvite({ email, password: result.temporaryPassword, link: result.loginLink });
      setEmail("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function del(uid: string) {
    if (!confirm("Remove this user?")) return;
    try {
      await remove({ data: { userId: uid } });
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  function randomPassword() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let s = "";
    for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setPassword(s);
  }

  function togglePermission(id: StaffPermission) {
    setPermissions((list) => (list.includes(id) ? list.filter((p) => p !== id) : [...list, id]));
  }

  async function savePermissions(
    userId: string,
    nextRole: "admin" | "staff",
    nextPermissions: StaffPermission[],
  ) {
    try {
      await updatePermissions({ data: { userId, role: nextRole, permissions: nextPermissions } });
      toast.success("Permissions updated");
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-5">
        <h3 className="font-display font-semibold mb-3">Add staff / admin</h3>
        <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2">
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
          />
          <div className="flex gap-2">
            <input
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={randomPassword}
              className="rounded-xl border border-border px-3 text-sm hover:bg-foreground/5"
              aria-label="Generate"
            >
              <Icon name="key-outline" size={16} />
            </button>
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "staff")}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="staff">staff</option>
            <option value="admin">admin</option>
          </select>
          <button
            onClick={add}
            disabled={busy || !email || !password}
            className="btn-primary text-sm py-2 disabled:opacity-60"
          >
            Add
          </button>
        </div>
        {role === "staff" && (
          <div className="mt-4 grid sm:grid-cols-3 gap-2">
            {PERMISSIONS.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 text-xs uppercase tracking-wider border border-border p-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={permissions.includes(p.id)}
                  onChange={() => togglePermission(p.id)}
                />{" "}
                {p.label}
              </label>
            ))}
          </div>
        )}
        {invite && (
          <div className="mt-4 border border-primary/40 bg-primary/10 p-3 text-sm space-y-2">
            <div className="font-semibold">Send these login details to {invite.email}</div>
            <div>
              Password: <span className="font-mono">{invite.password}</span>
            </div>
            {invite.link && (
              <div className="break-all">
                Login link: <span className="font-mono">{invite.link}</span>
              </div>
            )}
            <button
              type="button"
              className="text-xs font-bold uppercase text-primary"
              onClick={() =>
                navigator.clipboard?.writeText(
                  `Newman Stores Collections staff login\nEmail: ${invite.email}\nPassword: ${invite.password}${invite.link ? `\nLogin link: ${invite.link}` : ""}`,
                )
              }
            >
              Copy invitation
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        {isLoading && <div className="p-6 text-muted-foreground">Loading…</div>}
        {(
          (data ?? []) as Array<{
            userId: string;
            email: string;
            role: "admin" | "staff";
            permissions?: StaffPermission[];
            createdAt: string;
          }>
        ).map((u) => (
          <StaffRow key={u.userId} user={u} onDelete={del} onSave={savePermissions} />
        ))}
      </div>
    </div>
  );
}

function StaffRow({
  user,
  onDelete,
  onSave,
}: {
  user: {
    userId: string;
    email: string;
    role: "admin" | "staff";
    permissions?: StaffPermission[];
    createdAt: string;
  };
  onDelete: (id: string) => void;
  onSave: (id: string, role: "admin" | "staff", permissions: StaffPermission[]) => void;
}) {
  const [role, setRole] = useState(user.role);
  const [permissions, setPermissions] = useState<StaffPermission[]>(user.permissions ?? []);
  const toggle = (id: StaffPermission) =>
    setPermissions((list) => (list.includes(id) ? list.filter((p) => p !== id) : [...list, id]));

  return (
    <div className="p-3 border-b border-border last:border-0 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center">
          <Icon name="person-outline" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{user.email}</div>
          <div className="text-xs text-muted-foreground">
            Added {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
          </div>
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "staff")}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="staff">staff</option>
          <option value="admin">admin</option>
        </select>
        <button
          onClick={() => onDelete(user.userId)}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-destructive/10 text-destructive"
          aria-label="Remove"
        >
          <Icon name="trash-outline" size={16} />
        </button>
      </div>
      {role === "staff" && (
        <div className="grid sm:grid-cols-3 gap-2">
          {PERMISSIONS.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2 text-xs uppercase tracking-wider border border-border p-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={permissions.includes(p.id)}
                onChange={() => toggle(p.id)}
              />{" "}
              {p.label}
            </label>
          ))}
        </div>
      )}
      <div className="flex justify-end">
        <button
          onClick={() => onSave(user.userId, role, permissions)}
          className="text-xs font-bold uppercase border border-border px-3 py-2 hover:bg-foreground/5"
        >
          Save permissions
        </button>
      </div>
    </div>
  );
}
