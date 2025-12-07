'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { Student } from '@/types';
import { loadData, addStudent, updateStudent, deleteStudent, saveData } from '@/lib/storage';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newStudent, setNewStudent] = useState<{ name: string; klas: string; status: 'Actief' | 'Inactief' }>({ name: '', klas: '', status: 'Actief' });
  const [filterKlas, setFilterKlas] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showNewKlasInput, setShowNewKlasInput] = useState(false);
  const [newKlasName, setNewKlasName] = useState('');

  useEffect(() => {
    const loadStudents = async () => {
      const data = await loadData();
      setStudents(data.students);
    };
    loadStudents();
    
    // Escuchar eventos de actualización desde otras páginas (ej: auditoría)
    const handleStudentsUpdate = () => {
      loadStudents();
    };
    window.addEventListener('studentsUpdated', handleStudentsUpdate);
    
    return () => {
      window.removeEventListener('studentsUpdated', handleStudentsUpdate);
    };
  }, []);

  const klassen = [...new Set(students.map(s => s.klas))].sort();

  // Normalizar nombre de clase para evitar duplicados
  const normalizeKlasName = (name: string): string => {
    return name.trim();
  };

  // Buscar clase existente (case-insensitive)
  const findExistingKlas = (name: string): string | null => {
    const normalized = normalizeKlasName(name);
    const found = klassen.find(k => normalizeKlasName(k).toLowerCase() === normalized.toLowerCase());
    return found || null;
  };

  const handleKlasSelect = (value: string) => {
    if (value === '__NEW__') {
      setShowNewKlasInput(true);
      setNewStudent({ ...newStudent, klas: '' });
    } else {
      setShowNewKlasInput(false);
      setNewKlasName('');
      setNewStudent({ ...newStudent, klas: value });
    }
  };

  const handleNewKlasInput = (value: string) => {
    setNewKlasName(value);
    // Verificar si ya existe una clase similar
    const existing = findExistingKlas(value);
    if (existing) {
      setNewStudent({ ...newStudent, klas: existing });
    } else {
      setNewStudent({ ...newStudent, klas: normalizeKlasName(value) });
    }
  };

  const handleAdd = async () => {
    if (!newStudent.name) {
      alert('Vul alstublieft de naam in.');
      return;
    }

    let finalKlas = newStudent.klas.trim();
    
    // Si está escribiendo una nueva clase, usar ese valor
    if (showNewKlasInput && newKlasName.trim()) {
      finalKlas = normalizeKlasName(newKlasName);
      // Verificar si ya existe
      const existing = findExistingKlas(finalKlas);
      if (existing) {
        finalKlas = existing; // Usar la clase existente
      }
    }

    if (!finalKlas) {
      alert('Selecteer een klas of voer een nieuwe klas naam in.');
      return;
    }

    const student = await addStudent({
      ...newStudent,
      klas: finalKlas
    });
    
    setStudents([...students, student]);
    setNewStudent({ name: '', klas: '', status: 'Actief' });
    setNewKlasName('');
    setShowNewKlasInput(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleUpdate = async (id: string, updates: Partial<Student>) => {
    await updateStudent(id, updates);
    setStudents(students.map(s => s.id === id ? { ...s, ...updates } : s));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Weet je zeker dat je deze student wilt verwijderen?')) {
      try {
        await deleteStudent(id);
        setStudents(students.filter(s => s.id !== id));
      } catch (error: any) {
        alert(`Fout bij verwijderen: ${error.message}`);
      }
    }
  };

  const filteredStudents = filterKlas
    ? students.filter(s => s.klas === filterKlas)
    : students;

  const groupedStudents = filteredStudents.reduce((acc, student) => {
    if (!acc[student.klas]) {
      acc[student.klas] = [];
    }
    acc[student.klas].push(student);
    return acc;
  }, {} as { [klas: string]: Student[] });

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
      </div>
      <Navigation />
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
            Beheer van Studenten
          </h1>
          <p className="text-sm text-white/80">
            Wijzig studenten hier. De dagelijkse bladen worden automatisch bijgewerkt.
          </p>
        </div>

        {/* Formulario para agregar estudiante */}
        <div className="glass-effect p-4 rounded-lg shadow-md mb-4 border border-white/30">
          <h2 className="text-lg font-semibold mb-3 text-white flex items-center">
            <span className="bg-white/20 rounded p-1.5 mr-2">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </span>
            Nieuwe Student Toevoegen
          </h2>
          {showSuccess && (
            <div className="mb-3 p-2 bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 rounded text-sm">
              ✓ Student succesvol toegevoegd!
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Naam *"
              value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              className="px-3 py-2 text-sm bg-white/10 border border-white/30 rounded-md text-white placeholder-white/50 focus:border-white/50 focus:ring-1 focus:ring-white/50 focus:outline-none transition-colors"
            />
            <div className="relative">
              {showNewKlasInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nieuwe klas naam *"
                    value={newKlasName}
                    onChange={(e) => handleNewKlasInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                    onBlur={() => {
                      if (!newKlasName.trim()) {
                        setShowNewKlasInput(false);
                        setNewStudent({ ...newStudent, klas: '' });
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm bg-white/10 border border-white/30 rounded-md text-white placeholder-white/50 focus:border-white/50 focus:ring-1 focus:ring-white/50 focus:outline-none transition-colors"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewKlasInput(false);
                      setNewKlasName('');
                      setNewStudent({ ...newStudent, klas: '' });
                    }}
                    className="px-2 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    title="Annuleren"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <select
                  value={newStudent.klas || ''}
                  onChange={(e) => handleKlasSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white/10 border border-white/30 rounded-md text-white focus:border-white/50 focus:ring-1 focus:ring-white/50 focus:outline-none transition-colors"
                >
                  <option value="" className="bg-blue-900">Selecteer klas...</option>
                  {klassen.map(klas => (
                    <option key={klas} value={klas} className="bg-blue-900">{klas}</option>
                  ))}
                  <option value="__NEW__" className="bg-blue-900 font-semibold">+ Nieuwe klas aanmaken</option>
                </select>
              )}
              {newStudent.klas && findExistingKlas(newStudent.klas) && newStudent.klas !== findExistingKlas(newStudent.klas) && (
                <div className="absolute top-full left-0 mt-1 text-xs text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded">
                  Gebruikt bestaande klas: {findExistingKlas(newStudent.klas)}
                </div>
              )}
            </div>
            <select
              value={newStudent.status}
              onChange={(e) => setNewStudent({ ...newStudent, status: e.target.value as 'Actief' | 'Inactief' })} 
              className="px-3 py-2 text-sm bg-white/10 border border-white/30 rounded-md text-white focus:border-white/50 focus:ring-1 focus:ring-white/50 focus:outline-none transition-colors"
            >
              <option value="Actief" className="bg-blue-900">Actief</option>
              <option value="Inactief" className="bg-blue-900">Inactief</option>
            </select>
            <button
              onClick={handleAdd}
              className="px-4 py-2 text-sm bg-gradient-to-r from-white to-blue-100 text-blue-900 rounded-md hover:from-white/90 hover:to-blue-100/90 font-medium shadow-sm hover:shadow transition-all duration-200"
            >
              + Toevoegen
            </button>
          </div>
        </div>

        {/* Filtro por clase */}
        <div className="mb-4 glass-effect p-3 rounded-lg shadow-sm border border-white/30">
          <label className="mr-2 text-sm text-white/90 font-medium">Filter op klas:</label>
          <select
            value={filterKlas}
            onChange={(e) => setFilterKlas(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white/10 border border-white/30 rounded-md text-white focus:border-white/50 focus:ring-1 focus:ring-white/50 focus:outline-none transition-colors"
          >
            <option value="" className="bg-blue-900">Alle klassen</option>
            {klassen.map(klas => (
              <option key={klas} value={klas} className="bg-blue-900">{klas}</option>
            ))}
          </select>
        </div>

        {/* Lista de estudiantes por clase */}
        {Object.keys(groupedStudents).sort().map(klas => (
          <div key={klas} className="glass-effect p-4 rounded-lg shadow-md mb-4 border border-white/30">
            <h2 className="text-lg font-semibold mb-3 text-yellow-200 bg-gradient-to-r from-yellow-500/20 to-yellow-400/20 px-3 py-2 rounded-md border-l-3 border-yellow-400/50">
              {klas}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20 bg-white/10">
                    <th className="text-left px-3 py-2 font-semibold text-white">Naam</th>
                    <th className="text-left px-3 py-2 font-semibold text-white">Klas</th>
                    <th className="text-left px-3 py-2 font-semibold text-white">Status</th>
                    <th className="text-left px-3 py-2 font-semibold text-white">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedStudents[klas].map(student => (
                    <tr key={student.id} className="border-b border-white/10 hover:bg-white/10 transition-colors">
                      <td className="px-3 py-2 font-medium text-white">
                        {editingId === student.id ? (
                          <input
                            type="text"
                            value={student.name}
                            onChange={(e) => handleUpdate(student.id, { name: e.target.value })}
                            className="w-full px-2 py-1 text-sm bg-white/10 border border-white/30 rounded text-white focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/50"
                            autoFocus
                          />
                        ) : (
                          student.name
                        )}
                      </td>
                      <td className="px-3 py-2 text-white">
                        {editingId === student.id ? (
                          <select
                            value={student.klas}
                            onChange={(e) => handleUpdate(student.id, { klas: e.target.value })}
                            className="w-full px-2 py-1 text-sm bg-white/10 border border-white/30 rounded text-white focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/50"
                          >
                            {klassen.map(klas => (
                              <option key={klas} value={klas} className="bg-blue-900">{klas}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 bg-white/20 rounded text-xs">{student.klas}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingId === student.id ? (
                          <select
                            value={student.status}
                            onChange={(e) => handleUpdate(student.id, { status: e.target.value as 'Actief' | 'Inactief' })}
                            className="px-2 py-1 text-sm bg-white/10 border border-white/30 rounded text-white focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/50"
                          >
                            <option value="Actief" className="bg-blue-900">Actief</option>
                            <option value="Inactief" className="bg-blue-900">Inactief</option>
                          </select>
                        ) : (
                          <button
                            onClick={() => handleUpdate(student.id, { status: student.status === 'Actief' ? 'Inactief' : 'Actief' })}
                            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                              student.status === 'Actief' 
                                ? 'bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/40' 
                                : 'bg-white/20 text-white/80 hover:bg-white/30'
                            }`}
                          >
                            {student.status}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editingId === student.id ? (
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 font-medium transition-colors"
                          >
                            ✓
                          </button>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setEditingId(student.id)}
                              className="px-2.5 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 font-medium transition-colors"
                              title="Bewerken"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDelete(student.id)}
                              className="px-2.5 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 font-medium transition-colors"
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
        ))}

        {Object.keys(groupedStudents).length === 0 && (
          <div className="glass-effect p-4 rounded-lg shadow-sm text-center text-sm text-white/70 border border-white/30">
            Geen studenten gevonden. Voeg een student toe om te beginnen.
          </div>
        )}
      </div>
    </div>
  );
}

