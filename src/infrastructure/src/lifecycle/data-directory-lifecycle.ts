import { createDataDirectoryLayout, DataDirectoryLayout } from '../files/data-directory.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export class DataDirectoryLifecycle {
  private layout: DataDirectoryLayout | null = null;

  async bootstrap(rootDirectory: string): Promise<void> {
    this.layout = await createDataDirectoryLayout(rootDirectory);
    // ensure all scope directories exist
    await this.ensureDirectories();
  }

  private async ensureDirectories() {
    if (!this.layout) throw new Error('layout not initialized');
    for (const scopeDir of Object.values(this.layout.scopes)) {
      await fs.mkdir(scopeDir, { recursive: true });
    }
  }

  getLayout(): DataDirectoryLayout {
    if (!this.layout) throw new Error('layout not initialized');
    return this.layout;
  }

  async cleanOldSnapshots(retentionDays: number): Promise<void> {
    // placeholder for snapshot rotation
  }

  async cleanExportDirectory(): Promise<void> {
    if (!this.layout) return;
    const exportDir = this.layout.scopes.exports;
    // remove all files in export dir
    const entries = await fs.readdir(exportDir);
    for (const entry of entries) {
      await fs.rm(path.join(exportDir, entry), { recursive: true, force: true });
    }
  }
}
