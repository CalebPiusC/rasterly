import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { RenderError } from './errors.js';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'instance-data',
]);

function ipv4ToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const long = ipv4ToLong(ip);
  const inRange = (base: string, bits: number) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (long & mask) === (ipv4ToLong(base) & mask);
  };
  return (
    inRange('10.0.0.0', 8) ||
    inRange('127.0.0.0', 8) ||
    inRange('169.254.0.0', 16) ||
    inRange('172.16.0.0', 12) ||
    inRange('192.168.0.0', 16) ||
    inRange('100.64.0.0', 10) ||
    inRange('0.0.0.0', 8) ||
    inRange('192.0.0.0', 24) ||
    inRange('192.0.2.0', 24) ||
    inRange('198.18.0.0', 15) ||
    inRange('198.51.100.0', 24) ||
    inRange('203.0.113.0', 24) ||
    inRange('224.0.0.0', 4) ||
    inRange('240.0.0.0', 4) ||
    long === 0xffffffff
  );
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fe80')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
  if (lower.startsWith('ff')) return true; // multicast
  // IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIPv4(address);
  if (family === 6) return isPrivateIPv6(address);
  return true;
}

export interface SsrfOptions {
  allowedHosts?: Set<string>;
  blockedHosts?: Set<string>;
}

export interface ValidatedUrl {
  url: URL;
  resolvedAddresses: string[];
}

/**
 * Validate a user-supplied URL for safe server-side fetching.
 * Blocks non-http(s) protocols, private/internal addresses (both literal and
 * DNS-resolved), and explicitly blocked hosts. Throws RenderError('SSRF_BLOCKED').
 */
export async function validateUrl(rawUrl: string, options: SsrfOptions = {}): Promise<ValidatedUrl> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new RenderError('INVALID_INPUT', `Invalid URL: ${rawUrl}`);
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new RenderError('SSRF_BLOCKED', `Protocol not allowed: ${url.protocol}`);
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost')) {
    throw new RenderError('SSRF_BLOCKED', `Host is blocked: ${hostname}`);
  }
  if (options.blockedHosts?.has(hostname)) {
    throw new RenderError('SSRF_BLOCKED', `Host is blocked: ${hostname}`);
  }

  // Literal IP in the URL.
  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new RenderError('SSRF_BLOCKED', `Private address blocked: ${hostname}`);
    }
    return { url, resolvedAddresses: [hostname] };
  }

  // Resolve DNS and verify every answer is public.
  let addresses: string[];
  try {
    const results = await lookup(hostname, { all: true });
    addresses = results.map((r) => r.address);
  } catch {
    throw new RenderError('NAVIGATION_ERROR', `Could not resolve host: ${hostname}`);
  }

  if (addresses.length === 0) {
    throw new RenderError('NAVIGATION_ERROR', `No addresses for host: ${hostname}`);
  }

  for (const address of addresses) {
    if (isPrivateAddress(address)) {
      throw new RenderError('SSRF_BLOCKED', `Host resolves to private address: ${address}`);
    }
  }

  return { url, resolvedAddresses: addresses };
}