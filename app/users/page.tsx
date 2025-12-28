'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { getAllUsers, createUser, updateUser, deleteUser, type User } from '@/lib/users';
import { isAdmin, getCurrentUser } from '@/lib/auth';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'reports_access' as User['role'],
  });
  const [editingUser, setEditingUser] = useState<Partial<User> & { password?: string }>({});
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkAccess();
    loadUsers();
  }, []);

  const checkAccess = () => {
    if (!isAdmin()) {
      window.location.href = '/';
      return;
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error: any) {
      setError(`Error cargando usuarios: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newUser.username || !newUser.password) {
      setError('Vul gebruikersnaam en wachtwoord in.');
      return;
    }

    try {
      await createUser(newUser.username, newUser.password, newUser.role);
      setSuccess(`Gebruiker ${newUser.username} succesvol aangemaakt.`);
      setNewUser({ username: '', password: '', role: 'reports_access' });
      setShowAddForm(false);
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(`Fout bij aanmaken: ${error.message}`);
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditingUser({
      username: user.username,
      role: user.role,
      permissions: { ...user.permissions },
      active: user.active,
      password: '',
    });
  };

  const handleUpdate = async (userId: string) => {
    try {
      await updateUser(userId, editingUser);
      setSuccess('Gebruiker succesvol bijgewerkt.');
      setEditingId(null);
      setEditingUser({});
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(`Fout bij bijwerken: ${error.message}`);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Weet je zeker dat je deze gebruiker wilt verwijderen?')) {
      return;
    }

    try {
      await deleteUser(userId);
      setSuccess('Gebruiker succesvol verwijderd.');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(`Fout bij verwijderen: ${error.message}`);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Voer een nieuw wachtwoord in:');
    if (!newPassword) return;

    try {
      await updateUser(userId, { password: newPassword });
      setSuccess('Wachtwoord succesvol gereset.');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(`Fout bij resetten wachtwoord: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-white">Laden...</div>
        </div>
      </div>
    );
  }

  const roleLabels: Record<User['role'], string> = {
    admin: 'Admin',
    full_access: 'Volledige Toegang',
    dagelijks_access: 'Dagelijks + Rapporten',
    reports_access: 'Rapporten',
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      </div>
      <Navigation />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">Gebruikersbeheer</h1>
            <p className="text-sm text-white/90">
              Beheer gebruikers, rollen en wachtwoorden (alleen voor admins)
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-3 bg-brand-green text-white rounded-lg hover:bg-emerald-600 font-semibold transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nieuwe Gebruiker
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg">
            {success}
          </div>
        )}

        {/* Formulario para agregar usuario */}
        {showAddForm && (
          <div className="glass-effect rounded-lg p-6 border border-white/20 mb-6">
            <h2 className="text-xl font-bold mb-4 text-white">Nieuwe Gebruiker Toevoegen</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Gebruikersnaam</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="naam.achternaam"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Wachtwoord</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimaal 8 karakters"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Rol</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as User['role'] })}
                  className="w-full px-4 py-2 bg-[#2a2a3a] border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="reports_access" className="bg-[#2a2a3a] text-white">Rapporten</option>
                  <option value="dagelijks_access" className="bg-[#2a2a3a] text-white">Dagelijks + Rapporten</option>
                  <option value="full_access" className="bg-[#2a2a3a] text-white">Volledige Toegang</option>
                  <option value="admin" className="bg-[#2a2a3a] text-white">Admin</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleAdd}
                className="px-6 py-2 bg-brand-green text-white rounded-lg hover:bg-emerald-600 font-semibold transition-colors"
              >
                Toevoegen
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewUser({ username: '', password: '', role: 'reports_access' });
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="glass-effect rounded-lg p-6 border border-white/20">
          <h2 className="text-xl font-bold mb-4 text-white">Gebruikerslijst</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20 bg-white/10">
                  <th className="px-4 py-3 text-left font-semibold text-white">Gebruikersnaam</th>
                  <th className="px-4 py-3 text-left font-semibold text-white">Rol</th>
                  <th className="px-4 py-3 text-left font-semibold text-white">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-white">Laatste Login</th>
                  <th className="px-4 py-3 text-center font-semibold text-white">Acties</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/10 hover:bg-white/10 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">
                      {editingId === user.id ? (
                        <input
                          type="text"
                          value={editingUser.username || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                          className="w-full px-2 py-1 text-sm bg-white/10 border border-white/20 rounded text-white focus:outline-none"
                        />
                      ) : (
                        user.username
                      )}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {editingId === user.id ? (
                        <div className="space-y-2 min-w-[280px]">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries({
                              dagelijks: 'Dagelijks',
                              weekoverzicht: 'Weekoverzicht',
                              statistieken: 'Statistieken',
                              rapporten: 'Rapporten',
                              students: 'Studenten',
                              audit: 'Audit',
                            }).map(([key, label]) => (
                              <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingUser.permissions?.[key as keyof typeof editingUser.permissions] || false}
                                  onChange={(e) => {
                                    const currentPermissions = editingUser.permissions || { ...user.permissions };
                                    setEditingUser({
                                      ...editingUser,
                                      permissions: {
                                        ...currentPermissions,
                                        [key]: e.target.checked,
                                      },
                                    });
                                  }}
                                  className="w-4 h-4 rounded border-white/30 bg-white/10 text-brand-green focus:ring-2 focus:ring-brand-green focus:ring-offset-0 cursor-pointer"
                                />
                                <span className="text-xs text-white/90">{label}</span>
                              </label>
                            ))}
                          </div>
                          <select
                            value={editingUser.role || user.role}
                            onChange={(e) => {
                              const role = e.target.value as User['role'];
                              const { ROLE_PERMISSIONS } = require('@/lib/users');
                              setEditingUser({
                                ...editingUser,
                                role,
                                permissions: ROLE_PERMISSIONS[role] || editingUser.permissions,
                              });
                            }}
                            className="w-full px-2 py-1 text-sm bg-[#2a2a3a] border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-brand-green"
                          >
                            <option value="reports_access" className="bg-[#2a2a3a] text-white">Rapporten</option>
                            <option value="dagelijks_access" className="bg-[#2a2a3a] text-white">Dagelijks + Rapporten</option>
                            <option value="full_access" className="bg-[#2a2a3a] text-white">Volledige Toegang</option>
                            <option value="admin" className="bg-[#2a2a3a] text-white">Admin</option>
                          </select>
                          <p className="text-xs text-white/60">Selecteer sjabloon of pas individueel aan</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-1 bg-white/20 rounded text-xs">{roleLabels[user.role]}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(user.permissions || {}).map(([key, value]) => 
                              value && (
                                <span key={key} className="px-1.5 py-0.5 bg-brand-green/20 text-brand-green text-[10px] rounded">
                                  {key === 'dagelijks' ? 'Dag' : key === 'weekoverzicht' ? 'Week' : key === 'statistieken' ? 'Stat' : key === 'rapporten' ? 'Rap' : key === 'students' ? 'Stu' : 'Aud'}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === user.id ? (
                        <select
                          value={editingUser.active !== undefined ? editingUser.active.toString() : ''}
                          onChange={(e) => setEditingUser({ ...editingUser, active: e.target.value === 'true' })}
                          className="px-2 py-1 text-sm bg-[#2a2a3a] border border-white/20 rounded text-white focus:outline-none focus:ring-2 focus:ring-brand-green"
                        >
                          <option value="true" className="bg-[#2a2a3a] text-white">Actief</option>
                          <option value="false" className="bg-[#2a2a3a] text-white">Inactief</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.active
                            ? 'bg-green-500/30 text-green-200'
                            : 'bg-red-500/30 text-red-200'
                        }`}>
                          {user.active ? 'Actief' : 'Inactief'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70 text-xs">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleString('nl-NL')
                        : 'Nog niet ingelogd'}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === user.id ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleUpdate(user.id)}
                            className="px-3 py-1 text-sm bg-brand-green text-white rounded hover:bg-emerald-600 transition-colors"
                          >
                            Opslaan
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingUser({});
                            }}
                            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                          >
                            Annuleren
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(user)}
                            className="px-2 py-1 text-xs bg-brand-blue text-white rounded hover:bg-blue-600 transition-colors"
                            title="Bewerken"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="px-2 py-1 text-xs bg-brand-orange text-white rounded hover:bg-orange-600 transition-colors"
                            title="Reset Wachtwoord"
                          >
                            🔑
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="px-2 py-1 text-xs bg-brand-pink-500 text-white rounded hover:bg-brand-pink-600 transition-colors"
                            title="Verwijderen"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

