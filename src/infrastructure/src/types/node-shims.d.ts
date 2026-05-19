declare module "node:fs/promises" {
  export function access(path: string): Promise<void>;
  export function mkdir(
    path: string,
    options?: {
      recursive?: boolean;
    }
  ): Promise<string | undefined>;
  export function readFile(
    path: string,
    options?: {
      encoding?: string;
    }
  ): Promise<string>;
  export function readFile(path: string): Promise<Buffer>;
  export function rm(
    path: string,
    options?: {
      force?: boolean;
      recursive?: boolean;
    }
  ): Promise<void>;
  export function writeFile(
    path: string,
    data: string | Uint8Array,
    options?: {
      encoding?: string;
    }
  ): Promise<void>;
}

declare type Buffer = Uint8Array;

declare module "node:buffer" {
  export const Buffer: {
    from(data: string, encoding: string): Uint8Array;
  };
}

declare module "node:crypto" {
  export interface CipherLike {
    update(data: string, inputEncoding: string, outputEncoding: string): string;
    final(outputEncoding: string): string;
    getAuthTag(): Uint8Array;
  }

  export interface DecipherLike {
    setAuthTag(tag: Uint8Array): void;
    update(data: string, inputEncoding: string, outputEncoding: string): string;
    final(outputEncoding: string): string;
  }

  export function randomBytes(size: number): Uint8Array;
  export function createCipheriv(
    algorithm: string,
    key: Uint8Array,
    iv: Uint8Array
  ): CipherLike;
  export function createDecipheriv(
    algorithm: string,
    key: Uint8Array,
    iv: Uint8Array
  ): DecipherLike;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function join(...paths: string[]): string;
  export function normalize(path: string): string;
  export function relative(from: string, to: string): string;
  export function resolve(...paths: string[]): string;
}
