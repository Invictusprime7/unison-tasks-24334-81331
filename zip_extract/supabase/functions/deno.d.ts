// Type definitions for Deno Edge Functions runtime
// This file suppresses TypeScript errors in VS Code for Deno-specific code

// Deno namespace declaration for VS Code TypeScript
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    has(key: string): boolean;
    toObject(): { [key: string]: string };
  }
  
  export const env: Env;
  
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
  
  export interface Reader {
    read(p: Uint8Array): Promise<number | null>;
  }
  
  export interface Writer {
    write(p: Uint8Array): Promise<number>;
  }
  
  export interface Closer {
    close(): void;
  }
  
  export interface Conn extends Reader, Writer, Closer {
    readonly localAddr: Deno.Addr;
    readonly remoteAddr: Deno.Addr;
    readonly rid: number;
    closeWrite(): Promise<void>;
  }
  
  export interface Addr {
    transport: "tcp" | "udp";
    hostname: string;
    port: number;
  }
  
  export interface ListenOptions {
    port: number;
    hostname?: string;
  }
  
  export interface Listener extends AsyncIterable<Conn> {
    readonly addr: Addr;
    readonly rid: number;
    accept(): Promise<Conn>;
    close(): void;
  }
  
  export function listen(options: ListenOptions): Listener;
  
  export interface ReadFileOptions {
    signal?: AbortSignal;
  }
  
  export function readFile(path: string | URL, options?: ReadFileOptions): Promise<Uint8Array>;
  export function readTextFile(path: string | URL, options?: ReadFileOptions): Promise<string>;
  export function writeFile(path: string | URL, data: Uint8Array): Promise<void>;
  export function writeTextFile(path: string | URL, data: string): Promise<void>;
}

declare module "https://deno.land/std@*/http/server.ts" {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@*" {
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): any;
}
