/** Supabase session pooling reserves a backend for each warm function.
 * Vercel uses the transaction endpoint; local scripts retain their configured mode.
 * Our queries use unnamed statements and transaction-scoped locks only.
 */
export function databasePoolOptions(connectionString:string,serverless:boolean){
 const url=new URL(connectionString);
 if(serverless&&url.hostname.endsWith('.pooler.supabase.com')&&url.port==='5432')url.port='6543';
 return {connectionString:url.toString(),max:serverless?2:4,connectionTimeoutMillis:15000,idleTimeoutMillis:serverless?5000:30000,maxLifetimeSeconds:serverless?60:0,allowExitOnIdle:serverless};
}
