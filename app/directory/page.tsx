'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getCurrentUser,
  logout,
  refreshCurrentUserFromDb,
} from '@/lib/auth';
import ElementBrand from '@/components/ElementBrand';
import { sortKlassen } from '@/lib/utils';
import { parseBulkStudentLines } from '@/lib/studentImport';
import {
  addDirectoryStudent,
  addDirectoryStudentsBulk,
  listDirectoryStudents,
  removeDirectoryStudent,
  type DirectoryStudent,
} from '@/lib/directory';
import type { User } from '@/lib/users';

function AppBadge({
  label,
  on,
  accent,
}: {
  label: string;
  on: boolean;
  accent: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        on ? 'text-white' : 'border-white/10 text-white/35'
      }`}
      style={
        on
          ? { background: `${accent}22`, borderColor: `${accent}55`, color: accent }
          : undefined
      }
    >
      {label}
    </span>
  );
}

export default function DirectoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [name, setName] = useState('');
  const [klas, setKlas] = useState('');
  const [newKlas, setNewKlas] = useState('');
  const [useNewKlas, setUseNewKlas] = useState(false);
  const [search, setSearch] = useState('');
  const [filterKlas, setFilterKlas] = useState('');
  const [saving, setSaving] = useState(false);
  const [fillingKey, setFillingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const load = async () => {
    const list = await listDirectoryStudents();
    setStudents(list);
  };

  useEffect(() => {
    const init = async () => {
      const fresh = await refreshCurrentUserFromDb();
      const current = fresh || getCurrentUser();
      setUser(current);
      if (!current || current.role !== 'admin') {
        router.replace('/portals');
        return;
      }
      try {
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kon leerlingen niet laden');
      }
      setLoading(false);
    };
    init();
  }, [router]);

  const klassen = useMemo(
    () => sortKlassen([...new Set(students.map((s) => s.klas).filter(Boolean))]),
    [students]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (filterKlas && s.klas !== filterKlas) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.klas.toLowerCase().includes(q)
      );
    });
  }, [students, search, filterKlas]);

  const grouped = useMemo(() => {
    const map = new Map<string, DirectoryStudent[]>();
    for (const student of filtered) {
      const key = student.klas || 'Zonder klas';
      const list = map.get(key) || [];
      list.push(student);
      map.set(key, list);
    }
    const keys = sortKlassen([...map.keys()].filter((k) => k !== 'Zonder klas'));
    if (map.has('Zonder klas')) keys.push('Zonder klas');
    return keys.map((key) => [key, map.get(key) || []] as const);
  }, [filtered]);

  const finalKlas = useNewKlas ? newKlas.trim() : klas;

  const handleAdd = async () => {
    setError('');
    setMessage('');
    if (!name.trim() || !finalKlas) {
      setError('Vul naam en klas in.');
      return;
    }
    setSaving(true);
    try {
      const result = await addDirectoryStudent(name, finalKlas);
      if (result.error) {
        setError(result.error);
      } else {
        const parts = [
          result.chillouts === 'added' ? 'Chill-outs' : null,
          result.nablijven === 'added' ? 'Nablijven' : null,
          result.o2 === 'added' ? 'O2' : null,
        ].filter(Boolean);
        setMessage(
          parts.length
            ? `${result.name} toegevoegd in ${parts.join(', ')}.`
            : `${result.name} stond al in alle apps.`
        );
        setName('');
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toevoegen mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleBulk = async () => {
    setError('');
    setMessage('');
    const rows = parseBulkStudentLines(bulkText).map((r) => ({
      name: r.name,
      klas: r.grade,
    }));
    if (!rows.length) {
      setError('Plak minstens één regel: Achternaam;Voornaam;Klas');
      return;
    }
    const missingKlas = rows.filter((r) => !r.klas).length;
    if (missingKlas) {
      setError(`${missingKlas} regel(s) zonder klas. Gebruik Achternaam;Voornaam;Klas.`);
      return;
    }
    setSaving(true);
    try {
      const { added, skipped } = await addDirectoryStudentsBulk(rows);
      setMessage(`${added} leerling(en) gezet in alle apps${skipped ? `, ${skipped} stonden al overal` : ''}.`);
      setBulkText('');
      setShowBulk(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk toevoegen mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleFill = async (student: DirectoryStudent) => {
    if (!student.klas) {
      setError('Vul eerst een klas in via Chill-outs of Nablijven, daarna kun je aanvullen.');
      return;
    }
    setError('');
    setMessage('');
    setFillingKey(student.key);
    try {
      const result = await addDirectoryStudent(student.name, student.klas);
      if (result.error) setError(result.error);
      const parts = [
        result.chillouts === 'added' ? 'Chill-outs' : null,
        result.nablijven === 'added' ? 'Nablijven' : null,
        result.o2 === 'added' ? 'O2' : null,
      ].filter(Boolean);
      setMessage(
        parts.length
          ? `${student.name} aangevuld in ${parts.join(', ')}.`
          : `${student.name} stond al in alle apps.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Aanvullen mislukt');
    } finally {
      setFillingKey(null);
    }
  };

  const handleDelete = async (student: DirectoryStudent) => {
    if (
      !confirm(
        `"${student.name}" verwijderen uit Chill-outs, Nablijven en O2?\n\nBestaande nablijven en O2-verslagen blijven bewaard.`
      )
    ) {
      return;
    }
    setError('');
    setMessage('');
    setDeletingKey(student.key);
    try {
      const result = await removeDirectoryStudent(student);
      if (result.error) setError(result.error);
      const parts = [
        result.chillouts === 'removed' ? 'Chill-outs' : null,
        result.nablijven === 'removed' ? 'Nablijven' : null,
        result.o2 === 'removed' ? 'O2' : null,
      ].filter(Boolean);
      setMessage(
        parts.length
          ? `${student.name} verwijderd uit ${parts.join(', ')}.`
          : `${student.name} stond nergens meer.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verwijderen mislukt');
    } finally {
      setDeletingKey(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#14141f] text-white">
        <p className="text-sm text-white/60">Leerlingen laden…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#14141f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-[#ACE1AF]/20 blur-[100px]" />
        <div className="absolute top-1/4 -right-24 h-[32rem] w-[32rem] rounded-full bg-[#C2E0FC]/18 blur-[110px]" />
        <div className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#FFDFB9]/12 blur-[90px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 pt-6 md:px-8">
        <Link
          href="/portals"
          className="rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          ← Apps
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          Uitloggen
        </button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 pt-6 md:px-8">
        <div className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3">
              <ElementBrand size="sm" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Leerlingen</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/55">
              {user?.username ? `Welkom, ${user.username}. ` : ''}
              Eén keer toevoegen of verwijderen geldt voor <strong className="text-white/80">Chill-outs</strong>,{' '}
              <strong className="text-white/80">Nablijven</strong> (ma/di/do) en{' '}
              <strong className="text-white/80">O2</strong>. Bestaande registraties blijven staan.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60">
            {students.length} leerling{students.length === 1 ? '' : 'en'}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-[#E897A3]/35 bg-[#E897A3]/12 px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-2xl border border-[#ACE1AF]/35 bg-[#ACE1AF]/12 px-4 py-3 text-sm">
            {message}
          </div>
        )}

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Nieuwe leerling</h2>
            <button
              type="button"
              onClick={() => setShowBulk((v) => !v)}
              className="text-sm text-white/60 underline-offset-2 hover:text-white hover:underline"
            >
              {showBulk ? 'Eén leerling' : 'Bulk plakken'}
            </button>
          </div>

          {showBulk ? (
            <div className="space-y-3">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={7}
                placeholder={'Achternaam;Voornaam;Klas\nPeeters;Lien;1 Aarde'}
                className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleBulk}
                disabled={saving}
                className="rounded-xl bg-[#ACE1AF] px-4 py-2.5 text-sm font-bold text-[#14141f] disabled:opacity-60"
              >
                {saving ? 'Bezig…' : 'In alle apps zetten'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Voornaam Achternaam"
                className="flex-1 rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
              />
              <select
                value={useNewKlas ? '__NEW__' : klas}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setUseNewKlas(true);
                    setKlas('');
                  } else {
                    setUseNewKlas(false);
                    setNewKlas('');
                    setKlas(e.target.value);
                  }
                }}
                className="rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none md:w-52"
              >
                <option value="">Klas</option>
                {klassen.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
                <option value="__NEW__">Nieuwe klas…</option>
              </select>
              {useNewKlas && (
                <input
                  value={newKlas}
                  onChange={(e) => setNewKlas(e.target.value)}
                  placeholder="bv. 1 Aarde"
                  className="rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none md:w-44"
                />
              )}
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving}
                className="rounded-xl bg-[#ACE1AF] px-4 py-3 text-sm font-bold text-[#14141f] disabled:opacity-60"
              >
                {saving ? 'Bezig…' : 'Toevoegen in alle apps'}
              </button>
            </div>
          )}
        </section>

        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op naam of klas"
            className="flex-1 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          />
          <select
            value={filterKlas}
            onChange={(e) => setFilterKlas(e.target.value)}
            className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none md:w-52"
          >
            <option value="">Alle klassen</option>
            {klassen.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        {grouped.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white/55">
            Geen leerlingen gevonden.
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([klasName, list]) => (
              <section
                key={klasName}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                  <h3 className="font-bold">{klasName}</h3>
                  <span className="text-xs text-white/45">{list.length}</span>
                </div>
                <ul>
                  {list.map((student) => (
                    <li
                      key={student.key}
                      className="flex flex-col gap-3 border-b border-white/8 px-5 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <AppBadge label="Chill-outs" on={student.inChillouts} accent="#ACE1AF" />
                          <AppBadge label="Nablijven" on={student.inNablijven} accent="#FFDFB9" />
                          <AppBadge label="O2" on={student.inO2} accent="#C2E0FC" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(!student.inChillouts || !student.inNablijven || !student.inO2) && (
                          <button
                            type="button"
                            onClick={() => handleFill(student)}
                            disabled={fillingKey === student.key || !student.klas}
                            className="rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white/80 hover:bg-white/12 disabled:opacity-50"
                          >
                            {fillingKey === student.key ? 'Aanvullen…' : 'Ontbrekende apps aanvullen'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(student)}
                          disabled={deletingKey === student.key}
                          className="rounded-xl border border-[#E897A3]/35 bg-[#E897A3]/10 px-3 py-2 text-sm text-[#E897A3] hover:bg-[#E897A3]/20 disabled:opacity-50"
                        >
                          {deletingKey === student.key ? 'Verwijderen…' : 'Overal verwijderen'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
