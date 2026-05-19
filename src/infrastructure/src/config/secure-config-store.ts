import { createCipheriv, randomBytes, createDecipheriv } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class SecureConfigStore {
  private key: Buffer;
  private filePath: string;

  constructor(private configDir: string, key?: Buffer) {
    this.key = key ?? randomBytes(KEY_LENGTH);
    this.filePath = path.join(configDir, 'provider-config.enc');
  }

  async saveConfig(config: Record<string, unknown>): Promise<void> {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const plaintext = JSON.stringify(config);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = bytesToHex(cipher.getAuthTag());
    const payload = { iv: bytesToHex(iv), authTag, data: encrypted };
    await fs.writeFile(this.filePath, JSON.stringify(payload));
  }

  async loadConfig(): Promise<Record<string, unknown> | null> {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      const payload = JSON.parse(content);
      const iv = Buffer.from(payload.iv, 'hex');
      const authTag = Buffer.from(payload.authTag, 'hex');
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(payload.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }
}
