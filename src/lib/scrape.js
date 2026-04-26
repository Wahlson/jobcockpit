function normaliseUrl(url) {
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    return new URL(url).toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function rootDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

const EMAIL_RX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JUNK_RX = /(noreply|no-reply|do[-_]?not[-_]?reply|example\.com|sentry\.io|wixpress|cloudflare|sentry-next|@sentry|@2x|@3x|@\.\.\.)/i;
const CAREER_PREFIX_RX = /^(careers?|jobs?|recruit(ing)?|hiring|hr|talent|join|people|work|apply|cv|resume)@/i;
const CAREER_PATHS = ['', '/careers', '/jobs', '/about', '/contact', '/about-us', '/company', '/team'];

async function fetchViaJina(url) {
  const res = await fetch('https://r.jina.ai/' + url, {
    headers: { 'X-Return-Format': 'text', Accept: 'text/plain' },
  });
  if (!res.ok) throw new Error('Jina ' + res.status);
  return res.text();
}

async function fetchViaCorsProxy(url) {
  const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(url));
  if (!res.ok) throw new Error('Proxy ' + res.status);
  const html = await res.text();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ');
}

async function fetchPageText(url) {
  try {
    return await fetchViaJina(url);
  } catch {
    return await fetchViaCorsProxy(url);
  }
}

function rankEmails(emails, domain) {
  const seen = new Set();
  const clean = emails
    .map((e) => e.replace(/[.,;:)]+$/, ''))
    .filter((e) => e.length < 80 && !JUNK_RX.test(e))
    .filter((e) => {
      const k = e.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  const onDomain = clean.filter((e) =>
    domain && e.toLowerCase().endsWith('@' + domain)
  );
  const pool = onDomain.length ? onDomain : clean;

  return pool.sort((a, b) => {
    const ac = CAREER_PREFIX_RX.test(a) ? 0 : 1;
    const bc = CAREER_PREFIX_RX.test(b) ? 0 : 1;
    if (ac !== bc) return ac - bc;
    return a.length - b.length;
  });
}

export async function findCareersEmail(siteUrl, { onProgress } = {}) {
  const base = normaliseUrl(siteUrl);
  if (!base) throw new Error('Invalid URL');
  const domain = rootDomain(base);
  const collected = new Set();
  let visited = 0;

  for (const path of CAREER_PATHS) {
    const target = base + path;
    visited++;
    onProgress?.({ stage: 'fetching', target, visited, total: CAREER_PATHS.length });
    try {
      const text = await fetchPageText(target);
      const matches = text.match(EMAIL_RX) || [];
      matches.forEach((m) => collected.add(m));
      const ranked = rankEmails([...collected], domain);
      if (ranked.length && CAREER_PREFIX_RX.test(ranked[0])) {
        return { domain, emails: ranked, source: target };
      }
    } catch {
      // continue with next path
    }
  }

  const ranked = rankEmails([...collected], domain);
  return { domain, emails: ranked, source: base };
}

export function inferCompanyFromUrl(url) {
  const domain = rootDomain(normaliseUrl(url));
  if (!domain) return '';
  const stem = domain.split('.')[0];
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}
