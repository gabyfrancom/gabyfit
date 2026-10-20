import {validateBatch} from './health-validation.mjs';
/**
 * CALL ONLY AFTER the existing Worker authenticates the device and resolves
 * ownerId from a trusted server-side identity (NEVER from request JSON).
 * This helper deliberately does not define an HTTP route.
 */
export async function saveWearableBatch({DB,ownerId,batch}) {
  if (!DB || typeof ownerId !== 'string' || !ownerId || ownerId.length > 200) throw new Error('Trusted owner/database required');
  const invalid = validateBatch(batch);
  if (invalid) return {ok:false,error:invalid};
  const queries = batch.records.map(r => DB.prepare(`
    INSERT INTO ${['steps','heart_rate','sleep_duration','workout_duration'].includes(r.metric)?'wearable_readings':['speed','cadence','power','elevation_gain'].includes(r.metric)?'wearable_sport_readings':'wearable_extra_readings'} (owner_id,source,source_record_id,metric,start_time,end_time,value,unit)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(owner_id,source,source_record_id,metric) DO UPDATE SET
      start_time=excluded.start_time,end_time=excluded.end_time,
      value=excluded.value,unit=excluded.unit,recorded_at=CURRENT_TIMESTAMP
  `).bind(ownerId,r.source,r.source_record_id,r.metric,new Date(r.start_time).toISOString(),new Date(r.end_time).toISOString(),r.value,r.unit));
  queries.push(DB.prepare(`INSERT OR IGNORE INTO wearable_sync_runs(owner_id,sync_id,accepted,client_name) VALUES (?,?,?,?)`)
    .bind(ownerId,batch.sync_id,batch.records.length,'gabyfit-android'));
  await DB.batch(queries);
  return {ok:true,accepted:batch.records.length};
}
export async function getLastWearableSync({DB,ownerId}) {
  if (!ownerId) throw new Error('Trusted owner required');
  return DB.prepare('SELECT MAX(submitted_at) AS last_sync FROM wearable_sync_runs WHERE owner_id = ?').bind(ownerId).first();
}
