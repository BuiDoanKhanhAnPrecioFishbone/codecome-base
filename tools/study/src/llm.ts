import { existsSync, readFileSync } from 'node:fs';

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_cache_hit_tokens?: number;
}

export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

export function loadConfig(
  envFile: string,
  env: NodeJS.ProcessEnv = process.env,
): LlmConfig | null {
  const fileEnv = existsSync(envFile) ? parseEnvFile(readFileSync(envFile, 'utf8')) : {};
  const get = (k: string) => env[k] || fileEnv[k];
  const apiKey = get('DEEPSEEK_API_KEY');
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (get('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com').replace(/\/+$/, ''),
    model: get('DEEPSEEK_MODEL') || 'deepseek-flash',
  };
}

export interface JsonRequest<T> {
  system: string;
  user: string;
  validate: (raw: unknown) => T;
  /** Thinking mode costs more tokens; leave it off unless a task needs deeper reasoning. */
  thinking?: boolean;
  maxTokens?: number;
}

type FetchLike = typeof fetch;

async function callOnce(
  cfg: LlmConfig,
  messages: { role: string; content: string }[],
  req: { thinking?: boolean; maxTokens?: number },
  fetchImpl: FetchLike,
): Promise<{ content: string; usage: Usage }> {
  const res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      response_format: { type: 'json_object' },
      thinking: { type: req.thinking ? 'enabled' : 'disabled' },
      max_tokens: req.maxTokens ?? 4096,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`DeepSeek API lỗi ${res.status}: ${body}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: Usage;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek trả về nội dung rỗng');
  return { content, usage: json.usage ?? {} };
}

/** Calls the model in JSON mode and validates the result; retries once, telling the model what was wrong. */
export async function chatJson<T>(
  cfg: LlmConfig,
  req: JsonRequest<T>,
  fetchImpl: FetchLike = fetch,
): Promise<{ data: T; usage: Usage }> {
  const messages = [
    { role: 'system', content: req.system },
    { role: 'user', content: req.user },
  ];
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const { content, usage } = await callOnce(cfg, messages, req, fetchImpl);
    try {
      return { data: req.validate(JSON.parse(content)), usage };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      messages.push(
        { role: 'assistant', content },
        { role: 'user', content: `The previous JSON was invalid: ${lastError}. Return corrected JSON only.` },
      );
    }
  }
  throw new Error(`Model trả JSON không hợp lệ sau 2 lần thử: ${lastError}`);
}
