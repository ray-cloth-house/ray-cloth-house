import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  entityType: string;
  entityId: Types.ObjectId;
  action: 'create' | 'edit' | 'deactivate' | 'payment';
  changes: Record<string, { old: any; new: any }>;
  userId: Types.ObjectId;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  action: { type: String, enum: ['create', 'edit', 'deactivate', 'payment'], required: true },
  changes: { type: Schema.Types.Mixed },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
});

AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
