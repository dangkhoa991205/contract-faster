import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as { openai: OpenAI };

function getOpenAI(): OpenAI {
  if (globalForOpenAI.openai) return globalForOpenAI.openai;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  // Strip BOM (U+FEFF) and whitespace that PowerShell/CLI injects into env vars
  const stripBom = (s?: string) => s?.replace(/^﻿/, "").trim();
  const client = new OpenAI({
    apiKey: stripBom(process.env.OPENAI_API_KEY),
    baseURL: stripBom(process.env.OPENAI_BASE_URL) || undefined,
  });
  if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = client;
  return client;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (getOpenAI() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
