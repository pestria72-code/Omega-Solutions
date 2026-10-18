import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';

const BUCKET = 'uploads';
const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class ProductImageStorageService {
  private config() {
    const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION } = process.env;
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_ENDPOINT_URL_S3 || !AWS_REGION) {
      throw new ServiceUnavailableException('Product image storage is not configured for this environment.');
    }
    return { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY, endpoint: AWS_ENDPOINT_URL_S3.replace(/\/$/, ''), region: AWS_REGION };
  }

  newKey(companyId: string, productId: string, extension: 'jpg' | 'png' | 'webp') {
    return `companies/${companyId}/products/${productId}/${randomUUID()}.${extension}`;
  }

  async upload(key: string, bytes: Buffer, contentType: string): Promise<void> {
    if (bytes.length < 1 || bytes.length > MAX_BYTES) throw new Error('Product images must be between 1 byte and 5 MB.');
    const cfg = this.config();
    const url = this.objectUrl(cfg.endpoint, key);
    const now = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = now.slice(0, 8);
    const payloadHash = createHash('sha256').update(bytes).digest('hex');
    const headers: Record<string, string> = {
      host: url.host, 'content-type': contentType, 'x-amz-content-sha256': payloadHash, 'x-amz-date': now,
    };
    headers.authorization = this.authorization('PUT', url.pathname, '', headers, payloadHash, cfg, date, now);
    const requestHeaders = { ...headers };
    delete requestHeaders.host;
    const response = await fetch(url, { method: 'PUT', headers: requestHeaders, body: new Uint8Array(bytes) });
    if (!response.ok) throw new ServiceUnavailableException(`Image storage upload failed (HTTP ${response.status}).`);
  }

  async remove(key: string): Promise<void> {
    const cfg = this.config();
    const url = this.objectUrl(cfg.endpoint, key);
    const now = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = now.slice(0, 8);
    const payloadHash = createHash('sha256').update('').digest('hex');
    const headers: Record<string, string> = { host: url.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': now };
    headers.authorization = this.authorization('DELETE', url.pathname, '', headers, payloadHash, cfg, date, now);
    const requestHeaders = { ...headers };
    delete requestHeaders.host;
    const response = await fetch(url, { method: 'DELETE', headers: requestHeaders });
    if (!response.ok && response.status !== 404) throw new ServiceUnavailableException(`Image storage removal failed (HTTP ${response.status}).`);
  }

  signedReadUrl(key: string, expiresIn = 900): string {
    const cfg = this.config();
    const url = this.objectUrl(cfg.endpoint, key);
    const now = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = now.slice(0, 8);
    const scope = `${date}/${cfg.region}/s3/aws4_request`;
    const query: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${cfg.accessKeyId}/${scope}`,
      'X-Amz-Date': now,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': 'host',
    };
    const canonicalQuery = Object.entries(query).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${this.enc(k)}=${this.enc(v)}`).join('&');
    const canonical = ['GET', url.pathname, canonicalQuery, `host:${url.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
    const toSign = ['AWS4-HMAC-SHA256', now, scope, createHash('sha256').update(canonical).digest('hex')].join('\n');
    query['X-Amz-Signature'] = this.sign(toSign, cfg.secretAccessKey, date, cfg.region);
    const finalQuery = Object.entries(query).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${this.enc(k)}=${this.enc(v)}`).join('&');
    return `${url.origin}${url.pathname}?${finalQuery}`;
  }

  private objectUrl(endpoint: string, key: string): URL {
    const url = new URL(endpoint);
    url.pathname = `${url.pathname.replace(/\/$/, '')}/${BUCKET}/${key.split('/').map((part) => this.enc(part)).join('/')}`;
    return url;
  }

  private authorization(method: string, uri: string, query: string, headers: Record<string, string>, payloadHash: string, cfg: ReturnType<ProductImageStorageService['config']>, date: string, now: string): string {
    const names = Object.keys(headers).map((key) => key.toLowerCase()).sort();
    const canonicalHeaders = names.map((name) => `${name}:${headers[name].trim()}\n`).join('');
    const signedHeaders = names.join(';');
    const canonical = [method, uri, query, canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const scope = `${date}/${cfg.region}/s3/aws4_request`;
    const toSign = ['AWS4-HMAC-SHA256', now, scope, createHash('sha256').update(canonical).digest('hex')].join('\n');
    return `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${this.sign(toSign, cfg.secretAccessKey, date, cfg.region)}`;
  }

  private sign(value: string, secret: string, date: string, region: string): string {
    const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();
    const kDate = hmac(`AWS4${secret}`, date);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    return createHmac('sha256', kSigning).update(value).digest('hex');
  }

  private enc(value: string): string {
    return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  }
}
