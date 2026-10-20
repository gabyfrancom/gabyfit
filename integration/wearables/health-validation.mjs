/** Data contract for Health Connect -> EvoluSalud. Not an exposed Worker route. */
const metrics = new Map([['steps','count'], ['heart_rate','bpm'], ['sleep_duration','minutes'], ['workout_duration','minutes']]);
const maxValue = new Map([['steps',1000000],['heart_rate',300],['sleep_duration',1440],['workout_duration',1440]]);

metrics.set("oxygen_saturation","percent");maxValue.set("oxygen_saturation",100);
metrics.set("resting_heart_rate","bpm");maxValue.set("resting_heart_rate",300);
metrics.set("distance","meters");maxValue.set("distance",2000000);
metrics.set("active_calories","kcal");maxValue.set("active_calories",50000);
metrics.set("total_calories","kcal");maxValue.set("total_calories",100000);
metrics.set("hrv_rmssd","ms");maxValue.set("hrv_rmssd",1000);
metrics.set("respiratory_rate","rpm");maxValue.set("respiratory_rate",200);
metrics.set("vo2_max","ml/kg/min");maxValue.set("vo2_max",150);
metrics.set("weight","kg");maxValue.set("weight",700);
metrics.set("body_fat","percent");maxValue.set("body_fat",100);
metrics.set("body_temperature","celsius");maxValue.set("body_temperature",60);
metrics.set("speed","m/s");maxValue.set("speed",100);
metrics.set("cadence","steps/min");maxValue.set("cadence",350);
metrics.set("power","watts");maxValue.set("power",5000);
metrics.set("elevation_gain","meters");maxValue.set("elevation_gain",30000);
export function validateBatch(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.records) || data.records.length < 1 || data.records.length > 250) return 'Expected 1-250 records';
  if (typeof data.sync_id !== 'string' || !/^[\w-]{8,80}$/.test(data.sync_id)) return 'Invalid sync_id';
  for (const r of data.records) {
    if (!r || typeof r.source !== 'string' || !/^[a-zA-Z0-9._-]{3,160}$/.test(r.source)) return 'Invalid source';
    if (typeof r.source_record_id !== 'string' || !/^[a-zA-Z0-9:._-]{1,160}$/.test(r.source_record_id)) return 'Invalid source_record_id';
    if (!metrics.has(r.metric) || r.unit !== metrics.get(r.metric)) return 'Invalid metric/unit';
    if (typeof r.value !== 'number' || !Number.isFinite(r.value) || r.value < 0 || r.value > maxValue.get(r.metric)) return 'Invalid value';
    if (![r.start_time,r.end_time].every(t=>typeof t === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(t) && Number.isFinite(Date.parse(t)))) return 'Invalid timestamps';
    for (const t of [r.start_time,r.end_time]) {
      const [y,m,d]=t.slice(0,10).split('-').map(Number);
      const check=new Date(Date.UTC(y,m-1,d));
      if(check.getUTCFullYear()!==y || check.getUTCMonth()!==m-1 || check.getUTCDate()!==d) return 'Invalid calendar date';
    }
    if (r.metric==='steps' && !Number.isSafeInteger(r.value)) return 'Steps must be integer';
    if (Date.parse(r.end_time) < Date.parse(r.start_time)) return 'Invalid time order';
    if (Date.parse(r.end_time) > Date.now() + 300000) return 'Future record';
  }
  return null;
}
