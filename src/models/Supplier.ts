import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEditHistory {
  field: string;
  oldValue: any;
  newValue: any;
  editedBy: Types.ObjectId;
  editedAt: Date;
}

export interface ISupplier extends Document {
  name: string;
  phone: string;
  address: string;
  email: string;
  cnic: string;
  openingBalance: number;
  notes: string;
  userId: Types.ObjectId;
  isActive: boolean;
  editHistory: IEditHistory[];
  createdAt: Date;
}

const EditHistorySchema = new Schema({
  field: String,
  oldValue: Schema.Types.Mixed,
  newValue: Schema.Types.Mixed,
  editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  editedAt: { type: Date, default: Date.now },
}, { _id: false });

const SupplierSchema = new Schema<ISupplier>({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  cnic: { type: String, trim: true },
  openingBalance: { type: Number, default: 0 },
  notes: { type: String, trim: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  editHistory: [EditHistorySchema],
  createdAt: { type: Date, default: Date.now },
});

SupplierSchema.index({ userId: 1, isActive: 1 });

export default mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);
