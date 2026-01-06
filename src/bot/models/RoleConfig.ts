import mongoose from 'mongoose';

const roleConfigSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  guildId: { type: String, required: true, unique: true, index: true },
  autoAssignRoles: [{ type: String }],
  adminRoles: [{ type: String }],
  moderatorRoles: [{ type: String }],
  welcomeChannelId: String,
  welcomeMessage: String,
  auditChannelId: String,
  updatedBy: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

roleConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const RoleConfig = mongoose.model('RoleConfig', roleConfigSchema);
