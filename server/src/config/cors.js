function createOriginCallback({ appEnv, clientOrigin }) {
  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (appEnv !== 'dev') {
      callback(null, origin === clientOrigin);
      return;
    }

    const match = /^http:\/\/(?:localhost|127\.0\.0\.1):(\d{1,5})$/.exec(origin);
    const port = match ? Number(match[1]) : 0;
    callback(null, Boolean(match && port >= 1 && port <= 65535));
  };
}

module.exports = { createOriginCallback };
