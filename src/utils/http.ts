// ============================================================================
// DEVWEAVER – HTTP Client (pure Node.js, no external dependencies)
// ============================================================================

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import type { HttpRequestOptions, HttpResponse } from '../types/index.js';

/**
 * Make an HTTP request using only built-in Node modules.
 */
export function request<T = unknown>(
  url: string,
  opts: HttpRequestOptions = {}
): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const method = (opts.method || 'GET').toUpperCase();
    const headers: Record<string, string> = { ...opts.headers };

    let payload: string | Buffer | null = null;
    if (opts.body !== undefined && opts.body !== null) {
      if (typeof opts.body === 'string' || Buffer.isBuffer(opts.body)) {
        payload = opts.body;
      } else {
        payload = JSON.stringify(opts.body);
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
      headers['Content-Length'] = String(Buffer.byteLength(payload));
    }

    // Add basic auth if provided
    if (opts.auth) {
      const auth = Buffer.from(`${opts.auth.username}:${opts.auth.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const reqOpts: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers,
      timeout: opts.timeout || 30_000,
    };

    const req = transport.request(reqOpts, (res) => {
      const chunks: Buffer[] = [];

      res.on('data', (chunk: Buffer) => chunks.push(chunk));

      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        let data: T | string = raw;
        const ct = res.headers['content-type'] || '';

        if (ct.includes('application/json')) {
          try {
            data = JSON.parse(raw) as T;
          } catch {
            // Keep raw string if JSON parse fails
          }
        }

        resolve({
          status: res.statusCode || 0,
          statusText: res.statusMessage || '',
          headers: res.headers as Record<string, string>,
          data: data as T,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

/**
 * Convenience helpers
 */
export function get<T = unknown>(
  url: string,
  headers: Record<string, string> = {}
): Promise<HttpResponse<T>> {
  return request<T>(url, { method: 'GET', headers });
}

export function post<T = unknown>(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<HttpResponse<T>> {
  return request<T>(url, { method: 'POST', body, headers });
}

export function put<T = unknown>(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<HttpResponse<T>> {
  return request<T>(url, { method: 'PUT', body, headers });
}

export function del<T = unknown>(
  url: string,
  headers: Record<string, string> = {}
): Promise<HttpResponse<T>> {
  return request<T>(url, { method: 'DELETE', headers });
}

export function patch<T = unknown>(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<HttpResponse<T>> {
  return request<T>(url, { method: 'PATCH', body, headers });
}
