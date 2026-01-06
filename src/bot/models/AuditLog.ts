import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now, index: true },
  ipAddress: String
});

auditLogSchema.index({ guildId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
