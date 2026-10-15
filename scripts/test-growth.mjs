// Integration checks use only fixtures inside a transaction that is always rolled back.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import ts from 'typescript';
const env = { ...parseEnv(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')), ...process.env };
const db = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const moduleText = ts.transpileModule(readFileSync(new URL('../lib/growth-report.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { growthReportSql } = await import('data:text/javascript;base64,' + Buffer.from(moduleText).toString('base64'));
try {
 await db.connect(); await db.query('BEGIN');
 // Use a temporary shadow table so existing application events cannot affect test results.
 const name = 'growth_test_' + randomUUID().replaceAll('-', '');
 await db.query(`CREATE TEMP TABLE ${name} (LIKE snaproom.growth_events INCLUDING ALL)`);
 const query = growthReportSql.replaceAll('snaproom.growth_events', name);
 const people = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
 const [host, guest, third, wrongGuest] = people, album = randomUUID(), otherAlbum = randomUUID(), group = randomUUID();
 for (const id of people) await db.query('INSERT INTO snaproom.viewers(id) VALUES($1)', [id]);
 await db.query("INSERT INTO snaproom.groups(id,owner_id,name) VALUES($1,$2,'Analytics test')", [group, host]);
 for (const id of [album, otherAlbum]) await db.query("INSERT INTO snaproom.folders(id,owner_id,name,group_id) VALUES($1,$2,'Analytics test',$3)", [id, host, id === album ? group : null]);
 const event = async (type, who, context, hours, properties = {}) => db.query(`INSERT INTO ${name}(event_key,event,viewer_id,context_id,environment,properties,created_at) VALUES($1,$2,$3,$4,'development',$5,now()-($6::int*interval '1 hour'))`, [randomUUID(), type, who, context, properties, hours]);
 await event('album_created',host,album,50,{source:'organizer'});
 for(let i=0;i<20;i++) await db.query("INSERT INTO snaproom.photos(id,folder_id,owner_id,name,object_path,mime,size_bytes,shared,captured_at) VALUES($1,$2,$3,'test',$4,'image/jpeg',10,true,now())", [randomUUID(),album,people[i%3],`test/${randomUUID()}`]);
 await event('invite_opened',guest,group,48); await event('invite_joined',guest,group,47);
 await event('upload_succeeded',guest,album,46,{shared:true,media_type:'image'});
 await event('invite_opened',wrongGuest,album,48); await event('invite_joined',wrongGuest,album,47);
 await event('upload_succeeded',wrongGuest,otherAlbum,46,{shared:true,media_type:'image'});
 await event('upload_succeeded',wrongGuest,album,49,{shared:true,media_type:'image'}); // Before join: must not convert.
 await event('upload_succeeded',wrongGuest,album,45,{shared:false,media_type:'image'}); // Private: must not convert.
 await event('organizer_landing_view',host,null,54); await event('organizer_cta_clicked',host,null,53);
 let report = (await db.query(query,['development',30])).rows[0].report;
 assert.equal(report.albums,1); assert.equal(report.activatedAlbums,1); assert.equal(report.sharedPhotos,20);
 assert.deepEqual(report.hostFunnel,{viewed:1,clicked:1,created:1});
 assert.equal(report.guestFunnel.opened,2); assert.equal(report.guestFunnel.joined,2); assert.equal(report.guestFunnel.uploaded,1); assert.equal(report.guestFunnel.medianMinutes,120);
 await db.query('UPDATE snaproom.photos SET safety_hidden=true WHERE folder_id=$1 AND owner_id=$2',[album,third]);
 report = (await db.query(query,['development',30])).rows[0].report;
 assert.equal(report.activatedAlbums,0);
 assert.equal((await db.query(query,['production',30])).rows[0].report.albums,0);
 console.log('PASS: activation, ordered same-group funnel, private/hidden exclusions, host conversion, environment isolation. Fixtures rolled back.');
} catch (error) { console.error('Growth integration check failed:', error.code || error.name, error instanceof assert.AssertionError || ['42601','42703'].includes(error.code) ? error.message : 'Database details omitted'); process.exitCode=1; }
finally { await db.query('ROLLBACK').catch(()=>{}); await db.end(); }
