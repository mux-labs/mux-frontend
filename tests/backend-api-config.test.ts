import { describe, it, expect } from 'vitest';
import { getBackendApiBaseUrl } from '../src/lib/api/config';

describe('getBackendApiBaseUrl', () => {
  it('returns the normalized base URL with no trailing slash', () => {
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'https://api.example.com' })).toBe(
      'https://api.example.com',
    );
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'https://api.example.com/' })).toBe(
      'https://api.example.com',
    );
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'https://api.example.com/v1///' })).toBe(
      'https://api.example.com/v1',
    );
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: '  https://api.example.com/v1/  ' })).toBe(
      'https://api.example.com/v1',
    );
  });

  it('returns null when unset, blank, or malformed', () => {
    expect(getBackendApiBaseUrl({})).toBeNull();
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: undefined })).toBeNull();
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: '' })).toBeNull();
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: '   ' })).toBeNull();
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'not a url' })).toBeNull();
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: '/relative/path' })).toBeNull();
  });

  it('accepts only http: and https: URLs', () => {
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'http://localhost:8080' })).toBe(
      'http://localhost:8080',
    );
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'https://api.example.com' })).toBe(
      'https://api.example.com',
    );
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'ftp://api.example.com' })).toBeNull();
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'javascript:alert(1)' })).toBeNull();
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'file:///etc/passwd' })).toBeNull();
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'ws://api.example.com' })).toBeNull();
  });

  it('rejects URLs with embedded credentials', () => {
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'https://user:pass@api.example.com' })).toBeNull();
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'https://user@api.example.com' })).toBeNull();
    expect(getBackendApiBaseUrl({ MUX_BACKEND_URL: 'http://:pass@api.example.com' })).toBeNull();
  });

  it('defaults to process.env when no env argument is given', () => {
    const original = process.env.MUX_BACKEND_URL;
    try {
      process.env.MUX_BACKEND_URL = 'https://env.example.com/';
      expect(getBackendApiBaseUrl()).toBe('https://env.example.com');
      delete process.env.MUX_BACKEND_URL;
      expect(getBackendApiBaseUrl()).toBeNull();
    } finally {
      if (original === undefined) {
        delete process.env.MUX_BACKEND_URL;
      } else {
        process.env.MUX_BACKEND_URL = original;
      }
    }
  });
});
