import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  type: 'supplier' | 'buyer';
  partyId: Types.ObjectId;
  amount: number;
  method: 'cash' | 'bank' | 'cheque';
  date: Date;
  notes: string;
  invoiceUrl: string;
  userId: Types.ObjectId;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  type: { type: String, enum: ['supplier', 'buyer'], required: true },
  partyId: { type: Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['cash', 'bank', 'cheque'], default: 'cash' },
  date: { type: Date, required: true },
  notes: { type: String, trim: true },
  invoiceUrl: { type: String, default: '' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

PaymentSchema.index({ userId: 1, type: 1, partyId: 1 });

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
