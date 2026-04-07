import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReturnStock extends Document {
  returnDate: Date;
  returnType: 'from_buyer' | 'to_supplier';
  partyName: string;
  itemName: string;
  quantity: number;
  measurementUnit: 'meter' | 'piece';
  reason: string;
  notes: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
}

const ReturnStockSchema = new Schema<IReturnStock>({
  returnDate:      { type: Date, required: true },
  returnType:      { type: String, enum: ['from_buyer', 'to_supplier'], required: true },
  partyName:       { type: String, required: true, trim: true },
  itemName:        { type: String, required: true, trim: true },
  quantity:        { type: Number, required: true, min: 0.01 },
  measurementUnit: { type: String, enum: ['meter', 'piece'], required: true },
  reason:          { type: String, trim: true, default: '' },
  notes:           { type: String, trim: true, default: '' },
  recordedBy:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:       { type: Date, default: Date.now },
});

ReturnStockSchema.index({ returnDate: -1 });
ReturnStockSchema.index({ returnType: 1 });

export default mongoose.models.ReturnStock || mongoose.model<IReturnStock>('ReturnStock', ReturnStockSchema);
