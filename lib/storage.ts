// Re-exportar funciones de storage-db.ts (alleen Supabase)
export {
  loadData,
  loadDailyPageData,
  loadDailyRecordDates,
  saveData,
  saveDailyRecords,
  addStudent,
  addStudentsBulk,
  updateStudent,
  deleteStudent,
  saveDailyRecord,
  getDailyRecord,
  repairStudentChilloutEntries,
  correctStudentOverregisteredChillouts,
  repairAllChilloutEntries,
  migrateCanonicalChilloutStorage,
  type ChilloutMigrationSummary,
  getAuditLogs,
  revertAuditLog,
  renameKlas,
  deleteKlas,
} from './storage-db';

