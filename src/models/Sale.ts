import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISaleItem {
  stockId: Types.ObjectId;
  categoryId: Types.ObjectId;
  batchName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalPrice: number;
  profit: number;
  measurementUnit: 'meter' | 'piece';
}

export interface ISalePayment {
  amount: number;
  method: string;
  date: Date;
  notes: string;
  createdAt: Date;
}

export interface ISale extends Document {
  buyerId: Types.ObjectId;
  items: ISaleItem[];
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  amountPaid: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  paymentMethod: string;
  notes: string;
  userId: Types.ObjectId;
  invoiceNumber: string;
  invoiceUrl: string;
  payments: ISalePayment[];
  editHistory: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    editedBy: Types.ObjectId;
    editedAt: Date;
  }>;
  createdAt: Date;
}

const SaleItemSchema = new Schema({
  stockId: { type: Schema.Types.ObjectId, ref: 'Stock', required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  batchName: String,
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  profit: { type: Number, default: 0 },
  measurementUnit: { type: String, enum: ['meter', 'piece'] },
}, { _id: false });

const SalePaymentSchema = new Schema({
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

const SaleSchema = new Schema<ISale>({
  buyerId: { type: Schema.Types.ObjectId, ref: 'Buyer', required: true },
  items: [SaleItemSchema],
  totalAmount: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  totalProfit: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  paymentMethod: { type: String, trim: true },
  notes: { type: String, trim: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  invoiceUrl: { type: String, default: '' },
  payments: [SalePaymentSchema],
  editHistory: [EditHistorySchema],
  createdAt: { type: Date, default: Date.now },
});

SaleSchema.index({ userId: 1, buyerId: 1 });
SaleSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);
