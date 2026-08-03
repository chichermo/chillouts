'use client';

import { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import {
  ROLE_PERMISSIONS,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type UserPermissions,
} from '@/lib/users';
import { isAdmin, getCurrentUser, refreshCurrentUserFromDb } from '@/lib/auth';

const PERMISSION_LABELS: { key: keyof UserPermissions; label: string; group: string }[] = [
  { key: 'portal_chillouts', label: 'Portal Chill-outs', group: 'Portalen' },
  { key: 'portal_detentions', label: 'Portal Nablijven', group: 'Portalen' },
  { key: 'portal_o2', label: 'Portal O2', group: 'Portalen' },
  { key: 'dagelijks', label: 'Dagelijks', group: 'Chill-outs' },
  { key: 'weekoverzicht', label: 'Weekoverzicht', group: 'Chill-outs' },
  { key: 'statistieken', label: 'Statistieken', group: 'Chill-outs' },
  { key: 'rapporten', label: 'Rapporten', group: 'Chill-outs' },
  { key: 'rapporten_docenten', label: 'Rapporten per docent', group: 'Chill-outs' },
  { key: 'students', label: 'Studenten beheren', group: 'Chill-outs' },
  { key: 'backup', label: 'Backup / archief', group: 'Beheer' },
  { key: 'audit', label: 'Audit log', group: 'Beheer' },
];

const ROLE_LABELS: Record<User['role'], string> = {
  admin: 'Admin',
  full_access: 'Volledige toegang',
  dagelijks_access: 'Dagelijks + rapporten',
  reports_access: 'Rapporten',
};

type FormState = {
  username: string;
  password: string;
  role: User['role'];
  active: boolean;
  permissions: UserPermissions;
};

function emptyForm(role: User['role'] = 'reports_access'): FormState {
  return {
    username: '',
    password: '',
    role,
    active: true,
    permissions: { ...ROLE_PERMISSIONS[role] },
  };
}

function PermissionsEditor({
  permissions,
  onChange,
}: {
  permissions: UserPermissions;
  onChange: (next: UserPermissions) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, typeof PERMISSION_LABELS>();
    for (const item of PERMISSION_LABELS) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <div className="space-y-4">
      {groups.map(([group, items]) => (
        <div key={group}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            {group}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85 hover:bg-white/[0.06]"
              >
                <input
                  type="checkbox"
                  checked={!!permissions[key]}
                  onChange={(e) => onChange({ ...permissions, [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-white/30 text-[#E85A5A]"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [panel, setPanel] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isAdmin()) {
      window.location.href = '/portals';
      return;
    }
    loadUsers();
  }, [showInactive]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      setUsers(await getAllUsers({ includeInactive: showInactive }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Laden mislukt');
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3500);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm('reports_access'));
    setPanel('create');
    setError('');
  };

  const openEdit = (user: User) => {
    setEditingId(user.id);
    setForm({
      username: user.username,
      password: '',
      role: user.role,
      active: user.active,
      permissions: {
        ...ROLE_PERMISSIONS[user.role],
        ...user.permissions,
      } as UserPermissions,
    });
    setPanel('edit');
    setError('');
  };

  const closePanel = () => {
    setPanel('closed');
    setEditingId(null);
    setForm(emptyForm());
  };

  const applyRoleTemplate = (role: User['role']) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: { ...ROLE_PERMISSIONS[role] },
    }));
  };

  const handleSave = async () => {
    if (!form.username.trim()) {
      setError('Gebruikersnaam is verplicht.');
      return;
    }
    if (panel === 'create' && form.password.trim().length < 6) {
      setError('Wachtwoord moet minstens 6 tekens hebben.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      if (panel === 'create') {
        await createUser(form.username.trim(), form.password, form.role, form.permissions);
        flash(`Gebruiker ${form.username} aangemaakt.`);
      } else if (editingId) {
        const updates: Partial<User> & { password?: string } = {
          username: form.username.trim(),
          role: form.role,
          active: form.active,
          permissions: form.permissions,
        };
        if (form.password.trim()) updates.password = form.password.trim();
        await updateUser(editingId, updates);
        const current = getCurrentUser();
        if (current?.id === editingId) await refreshCurrentUserFromDb();
        flash('Gebruiker bijgewerkt.');
      }
      closePanel();
      await loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    const current = getCurrentUser();
    if (current?.id === user.id) {
      setError('Je kunt je eigen account niet verwijderen.');
      return;
    }
    if (!confirm(`Gebruiker “${user.username}” definitief verwijderen?`)) return;
    try {
      setError('');
      await deleteUser(user.id);
      flash('Gebruiker verwijderd.');
      if (editingId === user.id) closePanel();
      await loadUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verwijderen mislukt');
    }
  };

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-10 top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-20 left-10 h-72 w-72 rounded-full bg-[#E85A5A]/10 blur-3xl" />
      </div>
      <Navigation />

      <div className="container relative z-10 mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Gebruikersbeheer</h1>
            <p className="mt-1 text-sm text-white/60">
              Rollen, rechten, wachtwoorden en portaaltoegang beheren
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E85A5A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#F07070]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nieuwe gebruiker
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek gebruiker…"
            className="min-w-[200px] flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#E85A5A]/50"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Toon inactief
          </label>
        </div>

        <div className="glass-effect overflow-hidden rounded-2xl border border-white/12">
          {loading ? (
            <div className="p-8 text-white/70">Laden…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-white/60">Geen gebruikers gevonden.</div>
          ) : (
            <div className="divide-y divide-white/8">
              {filtered.map((user) => {
                const activePerms = Object.entries(user.permissions || {}).filter(([, v]) => v);
                return (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 px-4 py-3 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{user.username}</span>
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white/75">
                          {ROLE_LABELS[user.role]}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                            user.active
                              ? 'bg-emerald-500/20 text-emerald-200'
                              : 'bg-red-500/20 text-red-200'
                          }`}
                        >
                          {user.active ? 'Actief' : 'Inactief'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/40">
                        Laatste login:{' '}
                        {user.last_login
                          ? new Date(user.last_login).toLocaleString('nl-NL')
                          : 'nog niet'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {activePerms.slice(0, 8).map(([key]) => (
                          <span
                            key={key}
                            className="rounded bg-[#E85A5A]/15 px-1.5 py-0.5 text-[10px] text-[#E85A5A]"
                          >
                            {PERMISSION_LABELS.find((p) => p.key === key)?.label || key}
                          </span>
                        ))}
                        {activePerms.length > 8 && (
                          <span className="text-[10px] text-white/40">+{activePerms.length - 8}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10"
                      >
                        Bewerken
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/20"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {panel !== 'closed' && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#1a1a28] p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {panel === 'create' ? 'Nieuwe gebruiker' : 'Gebruiker bewerken'}
                </h2>
                <p className="text-sm text-white/50">
                  Pas rol, rechten, wachtwoord en portaaltoegang aan
                </p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Sluiten"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-white/70">Gebruikersnaam</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-[#E85A5A]/50"
                  placeholder="voornaam.achternaam"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-white/70">
                  {panel === 'create' ? 'Wachtwoord' : 'Nieuw wachtwoord (optioneel)'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-[#E85A5A]/50"
                  placeholder={panel === 'create' ? 'Minimaal 6 tekens' : 'Leeg laten = ongewijzigd'}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm text-white/70">Rol (sjabloon)</label>
                  <select
                    value={form.role}
                    onChange={(e) => applyRoleTemplate(e.target.value as User['role'])}
                    className="w-full rounded-xl border border-white/15 bg-[#2a2a3a] px-3 py-2.5 text-white outline-none"
                  >
                    {(Object.keys(ROLE_LABELS) as User['role'][]).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-white/70">Status</label>
                  <select
                    value={form.active ? 'true' : 'false'}
                    onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}
                    className="w-full rounded-xl border border-white/15 bg-[#2a2a3a] px-3 py-2.5 text-white outline-none"
                  >
                    <option value="true">Actief</option>
                    <option value="false">Inactief</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-white/80">Rechten & toegang</p>
                <PermissionsEditor
                  permissions={form.permissions}
                  onChange={(permissions) => setForm({ ...form, permissions })}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-xl bg-[#E85A5A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#F07070] disabled:opacity-60"
              >
                {saving ? 'Opslaan…' : panel === 'create' ? 'Aanmaken' : 'Wijzigingen opslaan'}
              </button>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
