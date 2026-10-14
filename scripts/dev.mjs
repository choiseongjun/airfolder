import {spawn} from 'node:child_process';

// Keep the media queue alive for the entire local development session.
let stopping=false,worker,restart;
const options={stdio:'inherit',windowsHide:true};
function startWorker(){
 worker=spawn(process.execPath,['scripts/process-media.mjs'],options);
 worker.on('error',error=>console.error('Media worker could not start:',error.message));
 worker.on('exit',()=>{if(!stopping){console.error('Media worker stopped; restarting in 5 seconds.');restart=setTimeout(startWorker,5000);}});
}
startWorker();
const web=spawn(process.execPath,['node_modules/next/dist/bin/next','dev',...process.argv.slice(2)],options);
function stop(){stopping=true;clearTimeout(restart);worker?.kill();web.kill();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
web.on('error',error=>{console.error(error.message);stop();process.exitCode=1;});
web.on('exit',code=>{stop();process.exitCode=code||0;});
