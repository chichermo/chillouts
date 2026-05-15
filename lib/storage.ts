// Re-exportar funciones de storage-db.ts (alleen Supabase)
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

