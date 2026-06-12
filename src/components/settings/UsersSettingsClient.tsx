"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { ROLES } from "@/lib/constants";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
};

export function UsersSettingsClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "EMPLOYEE",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/users");
    if (!res.ok) {
      setError("Sin permisos para gestionar usuarios");
      setLoading(false);
      return;
    }
    setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al crear");
      return;
    }
    setForm({ email: "", name: "", password: "", role: "EMPLOYEE" });
    setShowForm(false);
    setMessage("Usuario creado");
    load();
  }

  async function updateUser(
    id: string,
    patch: Partial<{ name: string; role: string; active: boolean; password: string }>
  ) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al actualizar");
      return;
    }
    setMessage("Usuario actualizado");
    load();
  }

  async function savePassword(userId: string) {
    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    await updateUser(userId, { password: newPassword });
    setPasswordUserId(null);
    setNewPassword("");
  }

  async function sendResetEmail(userId: string) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/users/${userId}/send-reset`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar el correo");
      if (data.devResetUrl) {
        setMessage(`Modo desarrollo — enlace: ${data.devResetUrl}`);
      }
      return;
    }
    setMessage(data.message);
    if (data.devResetUrl) {
      setMessage(`${data.message} (dev: ${data.devResetUrl})`);
    }
  }

  async function deactivateUser(id: string) {
    if (!confirm("¿Desactivar este usuario?")) return;
    setError("");
    setMessage("");
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al desactivar");
      return;
    }
    setMessage("Usuario desactivado");
    load();
  }

  const roleLabel = (role: string) =>
    ROLES.find((r) => r.value === role)?.label ?? role;

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Administra accesos, contraseñas y recuperación por correo"
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "Nuevo usuario"}
          </Button>
        }
      />

      <p className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <strong>Correos con Resend (plan gratis):</strong> mientras uses el
        dominio de prueba, los enlaces por correo solo llegan al email con el
        que creaste Resend. Para enviar a cualquier usuario, verifica tu dominio
        en{" "}
        <a
          href="https://resend.com/domains"
          className="font-medium underline"
          target="_blank"
          rel="noreferrer"
        >
          resend.com/domains
        </a>
        . Mientras tanto usa <strong>Cambiar contraseña</strong> directamente.
      </p>

      {error ? (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      ) : null}
      {message ? (
        <p className="mb-4 text-sm text-emerald-600">{message}</p>
      ) : null}

      {showForm ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Crear usuario</CardTitle>
          </CardHeader>
          <form onSubmit={createUser} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Correo</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                required
              />
            </div>
            <div>
              <Label>Rol</Label>
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Guardar usuario</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Usuarios ({users.length})</CardTitle>
        </CardHeader>
        {loading ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <div key={user.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="info">{roleLabel(user.role)}</Badge>
                      {!user.active ? (
                        <Badge variant="danger">Inactivo</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={user.role}
                      onChange={(e) =>
                        updateUser(user.id, { role: e.target.value })
                      }
                      className="h-9 w-auto"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                    {user.active ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPasswordUserId(
                              passwordUserId === user.id ? null : user.id
                            );
                            setNewPassword("");
                          }}
                        >
                          Cambiar contraseña
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendResetEmail(user.id)}
                        >
                          Enviar enlace por correo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deactivateUser(user.id)}
                        >
                          Desactivar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUser(user.id, { active: true })}
                      >
                        Reactivar
                      </Button>
                    )}
                  </div>
                </div>

                {passwordUserId === user.id ? (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <Label>Nueva contraseña</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <Button size="sm" onClick={() => savePassword(user.id)}>
                      Guardar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPasswordUserId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
