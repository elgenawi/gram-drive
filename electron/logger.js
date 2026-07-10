const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LOG_LEVELS.DEBUG;

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(level, tag, msg, ...args) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
  const prefix = `[${timestamp()}] [${level.padEnd(5)}] [${tag}]`;
  if (args.length) {
    console.log(prefix, msg, ...args);
  } else {
    console.log(prefix, msg);
  }
}

const logger = {
  debug: (tag, msg, ...args) => log('DEBUG', tag, msg, ...args),
  info: (tag, msg, ...args) => log('INFO', tag, msg, ...args),
  warn: (tag, msg, ...args) => log('WARN', tag, msg, ...args),
  error: (tag, msg, ...args) => log('ERROR', tag, msg, ...args),
};

module.exports = logger;
