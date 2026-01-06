import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  name: { type: String, required: true, index: true },
  content: { type: String, required: true },
  embeds: [{
    title: String,
    description: String,
    color: Number,
    fields: [{
      name: String,
      value: String,
      inline: Boolean
    }],
    thumbnail: String,
    image: String,
    footer: {
      text: String,
      icon_url: String
    },
    timestamp: Boolean
  }],
  components: [{
    type: Number,
    components: [{
      type: Number,
      style: Number,
      label: String,
      custom_id: String,
      url: String,
      placeholder: String,
      min_values: Number,
      max_values: Number,
      options: [{
        label: String,
        value: String,
        description: String
      }]
    }]
  }],
  channelId: String,
  scheduledFor: Date,
  guildId: { type: String, required: true, index: true },
  createdBy: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

templateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Template = mongoose.model('Template', templateSchema);
