import { IdempotencyKey } from '../models/IdempotencyKey.js';
import { ApiError } from './apiError.js';

/**
 * Runs `work()` at most once for a given Idempotency-Key (BR-NEW-001).
 *
 * Flow:
 *  1. Reserve the key (unique index). A concurrent duplicate fails here.
 *  2. If reservation fails, the request is a duplicate → return the resource the
 *     winning request created (or 409 if it's still in flight).
 *  3. Run the work, then record the resulting id against the key.
 *
 * Backend-enforced, so it holds even if the UI misbehaves or a proxy retries.
 */
export async function runOnce({ key, user, resource, work, load }) {
  if (!key) return { result: await work(), idempotent: false };

  let reservation;
  try {
    reservation = await IdempotencyKey.create({ key, user, resource });
  } catch (err) {
    if (err.code !== 11000) throw err;

    // Duplicate request — return whatever the first one produced.
    const existing = await IdempotencyKey.findOne({ key, user, resource });
    if (existing?.resourceId) {
      return { result: await load(existing.resourceId), idempotent: true };
    }
    // First request hasn't finished yet; tell the client to stop retrying.
    throw ApiError.conflict('This request is already being processed.');
  }

  try {
    const result = await work();
    reservation.resourceId = result?._id;
    await reservation.save();
    return { result, idempotent: false };
  } catch (err) {
    // Work failed — release the key so the user can genuinely retry.
    await IdempotencyKey.deleteOne({ _id: reservation._id }).catch(() => {});
    throw err;
  }
}
