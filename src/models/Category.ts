import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  parentId: Types.ObjectId | null;
  measurementUnit: 'meter' | 'piece';
  userId: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true, trim: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  measurementUnit: { type: String, enum: ['meter', 'piece'], required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

CategorySchema.index({ userId: 1, isActive: 1 });

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
