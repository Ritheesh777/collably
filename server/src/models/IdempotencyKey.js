import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Idempotency records (BR-NEW-001: one request = exactly one campaign).
 *
 * The client sends an `Idempotency-Key` header that is generated once per form
 * submission. We reserve the key BEFORE doing the work — the unique index makes
 * concurrent duplicates (double-clicks, retries) fail fast, so only the first
 * request creates the resource and the rest return that same resource.
 *
 * Records self-expire after 24h; they only need to outlive retries.
 */
const idempotencyKeySchema = new Schema(
  {
    key: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    resource: { type: String, required: true }, // e.g. 'campaign'
    resourceId: { type: Schema.Types.ObjectId }, // filled once the work succeeds
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
  },
  { versionKey: false }
);

// One key per user per resource type — this is what blocks the double-click.
idempotencyKeySchema.index({ key: 1, user: 1, resource: 1 }, { unique: true });

export const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencyKeySchema);
