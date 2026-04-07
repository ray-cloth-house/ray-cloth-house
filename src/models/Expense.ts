import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  category: 'utility' | 'employee' | 'operational' | 'misc';
  subCategory: string;
  amount: number;
  date: Date;
  description: string;
  paymentMethod: 'cash' | 'bank' | 'cheque';
  userId: Types.ObjectId;
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>({
  category: { type: String, enum: ['utility', 'employee', 'operational', 'misc'], required: true },
  subCategory: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  description: { type: String, trim: true },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'cheque'], default: 'cash' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

ExpenseSchema.index({ userId: 1, date: -1 });

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
