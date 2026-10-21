import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE = 'study_session';
const SESSION_DAYS = 30;

export interface Auth {
  /** True when a password is configured, so every API call except login needs a valid cookie. */
  enabled: boolean;
  check(password: unknown): boolean;
  issue(now: Date): { token: string; maxAge: number };
  verify(cookieHeader: string | undefined, now: Date): boolean;
}

const sha = (s: string) => createHash('sha256').update(s).digest();

export function createAuth(env: NodeJS.ProcessEnv): Auth {
  const password = env.STUDY_PASSWORD ?? '';
  const secret = env.STUDY_SESSION_SECRET || `study-session:${password}`;
  const sign = (payload: string) => createHmac('sha256', secret).update(payload).digest('hex');
  const maxAge = SESSION_DAYS * 86_400;

  return {
    enabled: password.length > 0,
    check(input) {
      if (!password || typeof input !== 'string') return false;
      return timingSafeEqual(sha(input), sha(password));
    },
    issue(now) {
      const exp = Math.floor(now.getTime() / 1000) + maxAge;
      return { token: `${exp}.${sign(String(exp))}`, maxAge };
    },
    verify(cookieHeader, now) {
      if (!password || !cookieHeader) return false;
      const raw = cookieHeader
        .split(';')
        .map((p) => p.trim())
        .find((p) => p.startsWith(`${COOKIE}=`))
        ?.slice(COOKIE.length + 1);
      if (!raw) return false;
      const [exp, sig] = raw.split('.');
      if (!exp || !sig || !/^\d+$/.test(exp) || !/^[0-9a-f]{64}$/.test(sig)) return false;
      if (Number(exp) * 1000 < now.getTime()) return false;
      return timingSafeEqual(Buffer.from(sig), Buffer.from(sign(exp)));
    },
  };
}

export function sessionCookie(token: string, maxAge: number, secure: boolean): string {
  return `${COOKIE}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`;
}

export const clearCookie = (secure: boolean) => sessionCookie('', 0, secure);
