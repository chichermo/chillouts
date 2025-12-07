'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { AuditLog } from '@/types';
import { getAuditLogs, revertAuditLog, loadData } from '@/lib/storage';

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      const auditLogs = await getAuditLogs();
      setLogs(auditLogs);
      setLoading(false);
    };
    loadLogs();
  }, []);

  const handleRevert = async (logId: string) => {
    if (!confirm('Weet je zeker dat je deze actie wilt terugdraaien?')) {
      return;
    }

    setRevertingId(logId);
    try {
      await revertAuditLog(logId);
      // Recargar logs y datos
      const auditLogs = await getAuditLogs();
      setLogs(auditLogs);
      
      // Recargar la página de estudiantes si está abierta
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('studentsUpdated'));
      }
      
      alert('Actie succesvol teruggedraaid!');
    } catch (error: any) {
      alert(`Fout bij terugdraaien: ${error.message}`);
    } finally {
      setRevertingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created':
        return 'Toegevoegd';
      case 'deleted':
        return 'Verwijderd';
      case 'updated':
        return 'Bijgewerkt';
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50';
      case 'deleted':
        return 'bg-red-500/20 text-red-200 border-red-400/50';
      case 'updated':
        return 'bg-blue-500/20 text-blue-200 border-blue-400/50';
      default:
        return 'bg-gray-500/20 text-gray-200 border-gray-400/50';
    }
  };

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
            Audit Logboek
          </h1>
          <p className="text-sm text-white/80">
            Overzicht van alle wijzigingen aan studenten. Je kunt acties terugdraaien indien nodig.
          </p>
        </div>

        {loading ? (
          <div className="glass-effect p-8 rounded-lg shadow-md border border-white/30 text-center">
            <p className="text-white">Laden...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="glass-effect p-8 rounded-lg shadow-md border border-white/30 text-center">
            <p className="text-white/70">Geen audit logs gevonden.</p>
          </div>
        ) : (
          <div className="glass-effect p-4 rounded-lg shadow-md border border-white/30 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20 bg-white/10">
                  <th className="text-left px-3 py-2 font-semibold text-white">Datum/Tijd</th>
                  <th className="text-left px-3 py-2 font-semibold text-white">Actie</th>
                  <th className="text-left px-3 py-2 font-semibold text-white">Student</th>
                  <th className="text-left px-3 py-2 font-semibold text-white">Klas</th>
                  <th className="text-left px-3 py-2 font-semibold text-white">Status</th>
                  <th className="text-left px-3 py-2 font-semibold text-white">Acties</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-b border-white/10 hover:bg-white/10 transition-colors ${
                      log.reverted ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-white/90">{formatDate(log.timestamp)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getActionColor(
                          log.action
                        )}`}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-white">{log.studentName}</td>
                    <td className="px-3 py-2 text-white">
                      <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                        {log.studentKlas}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {log.reverted ? (
                        <span className="px-2 py-1 rounded text-xs bg-gray-500/30 text-gray-300">
                          Teruggedraaid
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-emerald-500/30 text-emerald-300">
                          Actief
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {!log.reverted && (
                        <button
                          onClick={() => handleRevert(log.id)}
                          disabled={revertingId === log.id}
                          className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                            revertingId === log.id
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-yellow-600 text-white hover:bg-yellow-700'
                          }`}
                        >
                          {revertingId === log.id ? 'Bezig...' : 'Terugdraaien'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

