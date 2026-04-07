import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  businessName: string;
  phone: string;
  address: string;
  role: 'owner' | 'admin' | 'staff';
  status: 'pending' | 'active' | 'suspended';
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, trim: true, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  businessName: { type: String, trim: true, default: '' },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  role: { type: String, enum: ['owner', 'admin', 'staff'] },
  status: { type: String, enum: ['pending', 'active', 'suspended'] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
