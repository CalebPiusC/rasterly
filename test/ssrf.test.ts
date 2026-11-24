import { describe, it, expect } from 'vitest';
import { validateUrl, isPrivateAddress } from '../src/engine/ssrf.js';
import { RenderError } from '../src/engine/errors.js';

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.5',
    '192.168.1.1',
    '172.16.0.1',
    '169.254.1.1',
    '0.0.0.0',
    '::1',
    'fe80::1',
    'fc00::1',
  ])('flags private address %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '203.0.113.10', '2001:4860:4860::8888'])(
    'allows public address %s',
    (ip) => {
      // 203.0.113.10 is TEST-NET-3 and is treated as private/reserved.
      if (ip === '203.0.113.10') {
        expect(isPrivateAddress(ip)).toBe(true);
      } else {
        expect(isPrivateAddress(ip)).toBe(false);
      }
    },
  );
});

describe('validateUrl', () => {
  it('rejects non-http protocols', async () => {
    await expect(validateUrl('file:///etc/passwd')).rejects.toMatchObject({
      code: 'SSRF_BLOCKED',
    });
    await expect(validateUrl('ftp://example.com')).rejects.toBeInstanceOf(RenderError);
  });

  it('rejects malformed URLs', async () => {
    await expect(validateUrl('not a url')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('blocks localhost by hostname', async () => {
    await expect(validateUrl('http://localhost:3000')).rejects.toMatchObject({
      code: 'SSRF_BLOCKED',
    });
  });

  it('blocks literal private IPs', async () => {
    await expect(validateUrl('http://192.168.0.1/')).rejects.toMatchObject({
      code: 'SSRF_BLOCKED',
    });
    await expect(validateUrl('http://127.0.0.1:8080/')).rejects.toBeInstanceOf(RenderError);
  });

  it('allows a literal public IP without DNS', async () => {
    const result = await validateUrl('http://8.8.8.8/');
    expect(result.resolvedAddresses).toContain('8.8.8.8');
  });

  it('honors explicitly blocked hosts', async () => {
    await expect(
      validateUrl('http://public.example.com/', { blockedHosts: new Set(['public.example.com']) }),
    ).rejects.toMatchObject({ code: 'SSRF_BLOCKED' });
  });
});