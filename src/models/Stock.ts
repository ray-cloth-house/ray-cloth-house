import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IStockPayment {
  amount: number;
  method: string;
  date: Date;
  notes: string;
  createdAt: Date;
}

export interface IStock extends Document {
  supplierId: Types.ObjectId;
  categoryId: Types.ObjectId;
  batchName: string;
  batchDate: Date;
  description: string;
  quantity: number;
  remainingQuantity: number;
  unitPrice: number;
  totalPrice: number;
  measurementUnit: 'meter' | 'piece';
  images: string[];
  colors: string[];
  sizes: string[];
  amountPaid: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod: string;
  payments: IStockPayment[];
  userId: Types.ObjectId;
  invoiceUrl: string;
  editHistory: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    editedBy: Types.ObjectId;
    editedAt: Date;
  }>;
  createdAt: Date;
}

const StockPaymentSchema = new Schema({
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['cash', 'bank', 'cheque'], default: 'cash' },
  date: { type: Date, required: true },
  notes: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const EditHistorySchema = new Schema({
  field: String,
  oldValue: Schema.Types.Mixed,
  newValue: Schema.Types.Mixed,
  editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  editedAt: { type: Date, default: Date.now },
}, { _id: false });

const StockSchema = new Schema<IStock>({
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  batchName: { type: String, required: true, trim: true },
  batchDate: { type: Date, required: true },
  description: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  remainingQuantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  measurementUnit: { type: String, enum: ['meter', 'piece'], required: true },
  images: [String],
  colors: [String],
  sizes: [String],
  invoiceUrl: { type: String, default: '' },
  amountPaid: { type: Number, default: 0, min: 0 },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  paymentMethod: { type: String, trim: true, default: 'cash' },
  payments: [StockPaymentSchema],
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  editHistory: [EditHistorySchema],
  createdAt: { type: Date, default: Date.now },
});

StockSchema.index({ userId: 1, categoryId: 1 });
StockSchema.index({ userId: 1, supplierId: 1 });

export default mongoose.models.Stock || mongoose.model<IStock>('Stock', StockSchema);
