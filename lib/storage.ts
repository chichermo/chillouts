// Re-exportar funciones de storage-db.ts para mantener compatibilidad
// Esto permite usar Supabase en producción y localStorage en desarrollo
export {
  loadData,
  saveData,
  addStudent,
  updateStudent,
  deleteStudent,
  saveDailyRecord,
  getDailyRecord,
  getAuditLogs,
  revertAuditLog,
  renameKlas,
  deleteKlas,
} from './storage-db';

