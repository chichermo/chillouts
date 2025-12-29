'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUserByUsername, updateUser } from '@/lib/users';
import type { User } from '@/lib/users';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const loadUser = async () => {
      try {
        // Si es el usuario Admin hardcoded, usar directamente sus datos
        if (currentUser.id === 'admin_temp' || currentUser.username === 'Admin') {
          setUser(currentUser);
          setEmail(currentUser.email || '');
          setPhone(currentUser.phone || '');
          setProfilePicture(currentUser.profile_picture || '');
          setLoading(false);
          return;
        }

        // Para otros usuarios, intentar cargar desde Supabase
        const fullUser = await getUserByUsername(currentUser.username);
        if (fullUser) {
          setUser(fullUser);
          setEmail(fullUser.email || '');
          setPhone(fullUser.phone || '');
          setProfilePicture(fullUser.profile_picture || '');
        } else {
          // Si no se encuentra el usuario completo, usar los datos del usuario actual
          setUser(currentUser);
          setEmail(currentUser.email || '');
          setPhone(currentUser.phone || '');
          setProfilePicture(currentUser.profile_picture || '');
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
        // Si hay error, usar los datos del usuario actual como fallback
        setUser(currentUser);
        setEmail(currentUser.email || '');
        setPhone(currentUser.phone || '');
        setProfilePicture(currentUser.profile_picture || '');
        // Solo mostrar error si no es el usuario Admin
        if (currentUser.id !== 'admin_temp' && currentUser.username !== 'Admin') {
          setError('Kon profielgegevens niet volledig laden, maar u kunt nog steeds bewerken');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Alleen afbeeldingsbestanden zijn toegestaan');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Afbeelding mag maximaal 5MB zijn');
      return;
    }

    // Convertir a base64 para almacenamiento
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProfilePicture(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Si es el usuario Admin hardcoded, guardar solo en localStorage
    if (user.id === 'admin_temp' || user.username === 'Admin') {
      const updatedUser = {
        ...user,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        profile_picture: profilePicture || undefined,
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setSuccess('Profiel succesvol bijgewerkt');
      setTimeout(() => setSuccess(''), 3000);
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await updateUser(user.id, {
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        profile_picture: profilePicture || undefined,
      });

      // Actualizar usuario en localStorage también
      const updatedUser = {
        ...user,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        profile_picture: profilePicture || undefined,
      };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setSuccess('Profiel succesvol bijgewerkt');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Fout bij het bijwerken van profiel');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vul alle velden in');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Nieuwe wachtwoorden komen niet overeen');
      return;
    }

    if (newPassword.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens lang zijn');
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Verificar contraseña actual
      const { authenticateUser } = await import('@/lib/users');
      const authenticatedUser = await authenticateUser(user.username, currentPassword);
      
      if (!authenticatedUser) {
        setError('Huidig wachtwoord is onjuist');
        setSaving(false);
        return;
      }

      await updateUser(user.id, {
        password: newPassword,
      });

      setSuccess('Wachtwoord succesvol gewijzigd');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Fout bij het wijzigen van wachtwoord');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2a2a3a] flex items-center justify-center">
        <div className="text-white text-xl">Laden...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#2a2a3a]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      </div>
      
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Mijn Profiel</h1>

          {/* Mensajes de éxito/error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-white">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-white">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Foto de perfil */}
            <div className="lg:col-span-1">
              <div className="glass-effect rounded-lg p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4">Profielfoto</h2>
                <div className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full bg-white/10 border-4 border-white/20 overflow-hidden mb-4">
                    {profilePicture ? (
                      <img 
                        src={profilePicture} 
                        alt="Profiel" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50 text-4xl">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <span className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-semibold transition-colors">
                      Foto wijzigen
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Información del perfil */}
            <div className="lg:col-span-2">
              <div className="glass-effect rounded-lg p-6 border border-white/20 mb-6">
                <h2 className="text-xl font-bold text-white mb-4">Profielgegevens</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-2">
                      Gebruikersnaam
                    </label>
                    <input
                      type="text"
                      value={user.username}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30"
                      placeholder="uw.email@voorbeeld.nl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-2">
                      Telefoon
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30"
                      placeholder="+32 123 456 789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white/90 mb-2">
                      Rol
                    </label>
                    <input
                      type="text"
                      value={user.role}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 cursor-not-allowed"
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full py-3 px-4 rounded-xl bg-brand-green text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Opslaan...' : 'Profiel opslaan'}
                  </button>
                </div>
              </div>

              {/* Sección de cambio de contraseña */}
              <div className="glass-effect rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Wachtwoord wijzigen</h2>
                  <button
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {showPasswordSection ? 'Verbergen' : 'Wijzigen'}
                  </button>
                </div>

                {showPasswordSection && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">
                        Huidig wachtwoord
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30"
                        placeholder="Voer uw huidige wachtwoord in"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">
                        Nieuw wachtwoord
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30"
                        placeholder="Minimaal 6 tekens"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-white/90 mb-2">
                        Bevestig nieuw wachtwoord
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30"
                        placeholder="Bevestig uw nieuwe wachtwoord"
                      />
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={saving}
                      className="w-full py-3 px-4 rounded-xl bg-brand-blue text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Wijzigen...' : 'Wachtwoord wijzigen'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

