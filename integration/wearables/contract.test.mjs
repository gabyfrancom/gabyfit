import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateBatch} from './health-validation.mjs';
import {saveWearableBatch} from './health-storage.mjs';
new vm.Script(readFileSync(new URL('./amazfit-ui.js',import.meta.url),'utf8'));
const timestamp='2026-01-01T00:00:00Z';
const specs=[['speed','m/s',3],['cadence','steps/min',150],['power','watts',90],['elevation_gain','meters',10]];
const records=specs.map(([metric,unit,value])=>({source:'com.example.synthetic',source_record_id:'synthetic-'+metric,metric,unit,value,start_time:timestamp,end_time:timestamp}));
const batch={sync_id:'synthetic-contract-v1',records};
assert.equal(validateBatch(batch),null);
for(const row of records){
 assert.equal(validateBatch({...batch,records:[{...row,value:-1}]}),'Invalid value');
 assert.equal(validateBatch({...batch,records:[{...row,unit:'wrong'}]}),'Invalid metric/unit');
 assert.equal(validateBatch({...batch,records:[{...row,end_time:'2026-02-30T00:00:00Z'}]}),'Invalid calendar date');
}
assert.equal(validateBatch({...batch,records:[]}),'Expected 1-250 records');
assert.equal(validateBatch({...batch,records:[{...records[0],metric:'zepp_training_load'}]}),'Invalid metric/unit');
const statements=[];
const DB={prepare(sql){return {bind(...params){const s={sql,params};statements.push(s);return s;}};},async batch(q){return q.map(()=>({success:true}));}};
const ack=await saveWearableBatch({DB,ownerId:'synthetic-owner',batch});
assert.equal(ack.ok,true);assert.equal(ack.accepted,4);
assert.ok(statements.slice(0,4).every(x=>x.sql.includes('wearable_sport_readings')&&x.sql.includes('ON CONFLICT')));
assert.ok(statements.every(x=>x.params[0]==='synthetic-owner'));
console.log('PASS: UI JavaScript syntax; four optional metrics, invalid records, storage routing and owner binding.');
