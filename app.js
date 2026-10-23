const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'app.log');
const crashFile = path.join(__dirname, 'crash.log');

try {
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] Node ${process.version} launching app.js (pid ${process.pid})\n`);
} catch (_) {}

process.on('uncaughtException', (err) => {
  try {
    fs.appendFileSync(crashFile, `[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${err.stack || err}\n`);
  } catch (_) {}
  console.error(err);
});

process.on('unhandledRejection', (reason) => {
  try {
    fs.appendFileSync(crashFile, `[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason && reason.stack ? reason.stack : reason}\n`);
  } catch (_) {}
  console.error(reason);
});

try {
  require('./server/server.js');
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] Express server started successfully\n`);
  } catch (_) {}
} catch (err) {
  try {
    fs.appendFileSync(crashFile, `[${new Date().toISOString()}] STARTUP ERROR: ${err.stack || err}\n`);
  } catch (_) {}
  console.error(err);
  throw err;
}
