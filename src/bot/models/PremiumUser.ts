import mongoose from 'mongoose';

const premiumUserSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  tier: { type: String, enum: ['monthly', 'lifetime'], required: true },
  stripeSubscriptionId: { type: String, index: true },
  stripeCustomerId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'],
    default: 'active'
  },
  currentPeriodEnd: { type: Date, required: true },
  purchasedAt: { type: Date, default: Date.now },
  canceledAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

premiumUserSchema.index({ guildId: 1, status: 1 });
premiumUserSchema.index({ currentPeriodEnd: 1 });

premiumUserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const PremiumUser = mongoose.model('PremiumUser', premiumUserSchema);
