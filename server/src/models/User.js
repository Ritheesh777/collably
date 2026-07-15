import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: ['company', 'creator', 'admin'],
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    phone: { type: String, trim: true },

    // Display name — company name or creator full name
    name: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
      index: true,
    },
    isVerified: { type: Boolean, default: false }, // email verification
    isAdminVerified: { type: Boolean, default: false }, // admin trust badge (fake-follower check)

    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    profileCompleted: { type: Boolean, default: false },
    lastLoginAt: { type: Date },

    notificationPrefs: {
      email: { type: Boolean, default: true },
      browser: { type: Boolean, default: true },
    },

    /**
     * Subscription state (v2 §7, §8). Razorpay will populate this after a
     * backend-verified payment — the frontend must never activate a plan
     * (BR-NEW-005). Until billing ships, everyone stays on the free plan and
     * the 3-collaboration quota applies.
     */
    subscription: {
      status: {
        type: String,
        enum: ['none', 'active', 'expired', 'cancelled'],
        default: 'none',
      },
      plan: { type: String, default: '' }, // e.g. 'monthly'
      collabLimit: { type: Number, default: null }, // null = unlimited on plan
      startedAt: { type: Date },
      expiresAt: { type: Date },
      razorpaySubscriptionId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

export const User = mongoose.model('User', userSchema);
