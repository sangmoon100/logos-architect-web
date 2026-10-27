const { createOriginCallback } = require('./cors');

function checkOrigin(config, origin) {
  return new Promise((resolve, reject) => {
    createOriginCallback(config)(origin, (error, allowed) => {
      if (error) {
        reject(error);
      } else {
        resolve(allowed);
      }
    });
  });
}

describe('CORS origin policy', () => {
  it('allows loopback development origins on dynamically selected ports', async () => {
    const config = { appEnv: 'dev', clientOrigin: null };

    await expect(checkOrigin(config, 'http://localhost:5174')).resolves.toBe(true);
    await expect(checkOrigin(config, 'http://127.0.0.1:4173')).resolves.toBe(true);
    await expect(checkOrigin(config, 'https://localhost:5173')).resolves.toBe(false);
  });

  it('rejects non-loopback and invalid development origins', async () => {
    const config = { appEnv: 'dev', clientOrigin: null };

    await expect(checkOrigin(config, 'http://192.168.1.10:5173')).resolves.toBe(false);
    await expect(checkOrigin(config, 'http://localhost:70000')).resolves.toBe(false);
  });

  it('allows only the exact configured production origin', async () => {
    const config = { appEnv: 'prod', clientOrigin: 'https://logos.example.com' };

    await expect(checkOrigin(config, 'https://logos.example.com')).resolves.toBe(true);
    await expect(checkOrigin(config, 'https://other.example.com')).resolves.toBe(false);
  });

  it('also restricts QA origins to the configured client origin', async () => {
    const config = { appEnv: 'qa', clientOrigin: 'https://qa.logos.example.com' };

    await expect(
      checkOrigin(config, 'https://qa.logos.example.com'),
    ).resolves.toBe(true);
    await expect(checkOrigin(config, 'http://localhost:5173')).resolves.toBe(false);
  });

  it('allows requests without an Origin header', async () => {
    await expect(
      checkOrigin({ appEnv: 'prod', clientOrigin: 'https://logos.example.com' }, undefined),
    ).resolves.toBe(true);
  });
});
