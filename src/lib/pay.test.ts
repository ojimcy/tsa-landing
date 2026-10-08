import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  closedPaymentCopy,
  createOpenLinkPayment,
  fetchPublicPayment,
  fetchPublicOpenLink,
  formatKobo,
  formatLagosDateTime,
  isHandheld,
  isLinkSlug,
  isOpenLinkClosedError,
  isUuid,
  ownOpenLinkUrl,
  ownReceiptUrl,
  normalizePayCode,
  receiptRefundLine,
  fetchPublicReceipt,
  parseNairaToKobo,
  paymentPurpose,
  pollDelayMs,
  resolveOpenLinkAmount,
  shouldPollAgain,
  withPaymentParams,
  type PublicPayment,
  type PublicOpenLink,
} from './pay';

const ID = '3f2c1a9e-8b7d-4c6e-9f10-1a2b3c4d5e6f';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isHandheld', () => {
  const ANDROID =
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
  // What Chrome on Android sends with "Desktop site" switched on.
  const ANDROID_DESKTOP_SITE =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  // iPadOS Safari calls itself a Mac.
  const IPAD =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';

  it('knows a phone by its user agent', () => {
    expect(isHandheld({ userAgent: ANDROID, coarsePointer: false })).toBe(true);
  });

  it('knows a phone that claims to be a desktop by its touch screen', () => {
    expect(isHandheld({ userAgent: ANDROID_DESKTOP_SITE, coarsePointer: true })).toBe(true);
    expect(isHandheld({ userAgent: IPAD, coarsePointer: true })).toBe(true);
  });

  it('leaves a real desktop alone', () => {
    expect(isHandheld({ userAgent: ANDROID_DESKTOP_SITE, coarsePointer: false })).toBe(false);
    expect(isHandheld({ userAgent: IPAD, coarsePointer: false })).toBe(false);
  });
});

describe('pay helpers', () => {
  it('recognises payment ids', () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid('../x')).toBe(false);
  });
  it('formats kobo', () => {
    expect(formatKobo(5_050_506)).toBe('₦50,505.06');
  });
  it('adds payment params before a fragment, https only', () => {
    expect(withPaymentParams('https://skyair.ng/done?x=1#top', ID, 'succeeded')).toBe(`https://skyair.ng/done?x=1&payment_id=${ID}&status=succeeded#top`);
    expect(withPaymentParams('javascript:alert(1)', ID, 'succeeded')).toBeNull();
  });
  it('fetches without custom headers', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { id: ID } }) });
    vi.stubGlobal('fetch', f);
    await fetchPublicPayment(ID);
    expect(f.mock.calls[0][1]?.headers).toBeUndefined();
  });
  it('keeps polling through a transient error after a successful fetch, but not before one', () => {
    // A dropped request / 500 on a later tick must not stop the loop — the
    // customer already has a known pending/processing payment.
    expect(shouldPollAgain({ fetchedOnce: true, error: true })).toBe(true);
    // The very first fetch failing is fatal — nothing confirmed to retry toward.
    expect(shouldPollAgain({ fetchedOnce: false, error: true })).toBe(false);
  });
  it('stops polling once a terminal status is reached', () => {
    expect(shouldPollAgain({ fetchedOnce: true, error: false, status: 'pending' })).toBe(true);
    expect(shouldPollAgain({ fetchedOnce: true, error: false, status: 'processing' })).toBe(true);
    expect(shouldPollAgain({ fetchedOnce: true, error: false, status: 'succeeded' })).toBe(false);
    expect(shouldPollAgain({ fetchedOnce: true, error: false, status: 'failed' })).toBe(false);
    expect(shouldPollAgain({ fetchedOnce: true, error: false, status: 'expired' })).toBe(false);
  });
  it('surfaces the API message for a 4xx, and a fixed friendly message for anything else', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ success: false, message: "This payment link isn't valid." }),
      }),
    );
    await expect(fetchPublicPayment(ID)).rejects.toThrow("This payment link isn't valid.");

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ success: false, message: 'internal database error: relation missing' }),
      }),
    );
    await expect(fetchPublicPayment(ID)).rejects.toThrow('Unable to load this payment. Please try again.');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    await expect(fetchPublicPayment(ID)).rejects.toThrow('Unable to load this payment. Please try again.');
  });
  it('formats a timestamp in Lagos time, not the viewer\'s', () => {
    // 13:30 UTC is 14:30 in Lagos (UTC+1, no daylight saving).
    const text = formatLagosDateTime('2026-10-03T13:30:00Z');
    expect(text).toContain('3 Oct 2026');
    expect(text).toContain('14:30');
    expect(formatLagosDateTime(undefined)).toBeNull();
    expect(formatLagosDateTime('not a date')).toBeNull();
  });
  it('tells a cancelled link apart from an expired or failed one', () => {
    const base: PublicPayment = {
      id: ID,
      merchantName: 'Ada Bakes',
      status: 'expired',
      amount: 500_000,
      customerTotal: 500_000,
      currency: 'NGN',
      expiresAt: '2026-10-03T13:30:00Z',
      appUrl: `tsaconnect://pay?id=${ID}`,
    };
    expect(closedPaymentCopy({ ...base, cancelled: true })).toEqual({
      title: 'This payment link was cancelled by Ada Bakes.',
      hint: 'Contact them for a new one.',
    });
    expect(closedPaymentCopy(base).title).toBe('This payment link has expired.');
    expect(closedPaymentCopy({ ...base, status: 'failed' }).title).toBe('This payment failed.');
  });
  it('lets the payer start again when a reusable-link payment timed out and the link is still open', () => {
    const open: PublicPayment = {
      id: ID,
      merchantName: 'Ada Bakes',
      status: 'expired',
      amount: 500_000,
      customerTotal: 500_000,
      currency: 'NGN',
      expiresAt: '2026-10-03T13:30:00Z',
      appUrl: `tsaconnect://pay?id=${ID}`,
      source: 'open',
    };
    const url = 'https://tsaconnectworld.com/pay/l/ada-bakes-7k3q';
    expect(closedPaymentCopy({ ...open, openLinkUrl: url })).toEqual({
      title: 'This payment timed out.',
      restartHref: url,
    });
    // The link was paused or replaced — nothing to start again from.
    expect(closedPaymentCopy(open)).toEqual({
      title: 'This payment timed out.',
      hint: 'Ask the store for a new payment link.',
    });
    expect(closedPaymentCopy({ ...open, openLinkUrl: 'javascript:alert(1)' }).restartHref).toBeUndefined();
    // A failed payment can be started again the same way.
    expect(closedPaymentCopy({ ...open, status: 'failed', openLinkUrl: url })).toEqual({
      title: 'This payment failed.',
      restartHref: url,
    });
    // A one-time link keeps its own wording.
    expect(closedPaymentCopy({ ...open, source: 'link', openLinkUrl: url }).title).toBe('This payment link has expired.');
  });
  it('only sends the payer back to a reusable link on our own checkout host', () => {
    expect(ownOpenLinkUrl('https://tsaconnectworld.com/pay/l/ada-7k3q')).toBe('https://tsaconnectworld.com/pay/l/ada-7k3q');
    expect(ownOpenLinkUrl('https://www.tsaconnectworld.com/pay/l/ada-7k3q')).toBe('https://www.tsaconnectworld.com/pay/l/ada-7k3q');
    expect(ownOpenLinkUrl('https://evil.example/pay/l/ada-7k3q')).toBeNull();
    expect(ownOpenLinkUrl('https://tsaconnectworld.com.evil.example/pay/l/ada-7k3q')).toBeNull();
    expect(ownOpenLinkUrl('http://tsaconnectworld.com/pay/l/ada-7k3q')).toBeNull();
    expect(ownOpenLinkUrl('https://tsaconnectworld.com/admin')).toBeNull();
    expect(ownOpenLinkUrl(undefined)).toBeNull();
  });
  it('backs off after failed status checks, up to a minute', () => {
    expect(pollDelayMs(0)).toBe(5000);
    expect(pollDelayMs(1)).toBe(10_000);
    expect(pollDelayMs(2)).toBe(20_000);
    expect(pollDelayMs(10)).toBe(60_000);
  });
  it("uses a reusable link's label as what's paid for, and the description as the payer's note", () => {
    const base = { description: '2 bags of rice', linkLabel: 'Ada Bakes — Shop 12' } as PublicPayment;
    expect(paymentPurpose({ ...base, source: 'open' })).toEqual({
      paidFor: 'Ada Bakes — Shop 12',
      customerNote: '2 bags of rice',
    });
    expect(paymentPurpose({ ...base, source: 'link' })).toEqual({ paidFor: '2 bags of rice' });
    expect(paymentPurpose({ ...base, source: undefined })).toEqual({ paidFor: '2 bags of rice' });
  });
});

describe('open link helpers', () => {
  const link: PublicOpenLink = {
    merchantName: 'Mama Ngozi Store',
    label: 'Mama Ngozi Store — Shop 12',
    minAmount: 10_000,
    maxAmount: 50_000_000,
    active: true,
  };
  const SLUG = 'mama-ngozi-store-7k3q';

  it('recognises link slugs', () => {
    expect(isLinkSlug(SLUG)).toBe(true);
    // The server lowercases slugs, so a shouted QR still works.
    expect(isLinkSlug('Mama-Ngozi')).toBe(true);
    expect(isLinkSlug('mama--ngozi')).toBe(false);
    expect(isLinkSlug('../x')).toBe(false);
    expect(isLinkSlug('a'.repeat(65))).toBe(false);
  });

  it('reads typed naira as kobo without floating-point drift', () => {
    expect(parseNairaToKobo('45000')).toBe(4_500_000);
    expect(parseNairaToKobo(' 45,000.5 ')).toBe(4_500_050);
    expect(parseNairaToKobo('0.29')).toBe(29);
    expect(parseNairaToKobo('1.005')).toBeNull();
    expect(parseNairaToKobo('-5')).toBeNull();
    expect(parseNairaToKobo('0')).toBeNull();
    expect(parseNairaToKobo('5k')).toBeNull();
    expect(parseNairaToKobo('')).toBeNull();
  });

  it('reads a comma only as a thousands separator, never as a decimal point', () => {
    expect(parseNairaToKobo('1,234,567.89')).toBe(123_456_789);
    expect(parseNairaToKobo('999,000')).toBe(99_900_000);
    // Not ₦500,050 — a payer who typed a decimal comma must be asked again.
    expect(parseNairaToKobo('5000,50')).toBeNull();
    expect(parseNairaToKobo('1,00')).toBeNull();
    expect(parseNairaToKobo('45,00.50')).toBeNull();
    expect(parseNairaToKobo(',500')).toBeNull();
    expect(parseNairaToKobo('500,')).toBeNull();
  });

  it('checks the typed amount against the link limits', () => {
    expect(resolveOpenLinkAmount(link, '5000')).toEqual({ amount: 500_000 });
    expect(resolveOpenLinkAmount(link, 'abc')).toEqual({ error: 'Enter an amount, like 5000 or 5000.50.' });
    expect(resolveOpenLinkAmount(link, '50')).toEqual({ error: 'The least you can pay here is ₦100.00.' });
    expect(resolveOpenLinkAmount(link, '600000')).toEqual({ error: 'The most you can pay here is ₦500,000.00.' });
  });

  it('posts the amount and note as JSON and treats unknown or closed links as closed', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ success: true, data: { id: ID } }) });
    vi.stubGlobal('fetch', f);
    await expect(createOpenLinkPayment(SLUG, { amount: 500_000, note: 'Rice' })).resolves.toEqual({ id: ID });
    expect(f.mock.calls[0][0]).toMatch(new RegExp(`/pay/public/open/${SLUG}/payments$`));
    expect(f.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ amount: 500_000, note: 'Rice' }) });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ success: false, message: 'closed', code: 'link_closed' }) }),
    );
    expect(isOpenLinkClosedError(await createOpenLinkPayment(SLUG, { amount: 500_000, note: '' }).catch((e) => e))).toBe(true);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ success: false, code: 'link_not_found' }) }),
    );
    expect(isOpenLinkClosedError(await fetchPublicOpenLink('nope').catch((e) => e))).toBe(true);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ success: false }) }));
    const outage = await fetchPublicOpenLink(SLUG).catch((e) => e);
    expect(isOpenLinkClosedError(outage)).toBe(false);
    expect(outage.message).toBe('Unable to load this payment link. Please try again.');
  });
});

describe('ownReceiptUrl', () => {
  it('accepts only /r/<code> on our own host', () => {
    const ok = 'https://tsaconnectworld.com/r/TSA-7K2QF-M9XWD';
    expect(ownReceiptUrl(ok)).toBe(ok);
    expect(ownReceiptUrl('https://evil.example/r/TSA-7K2QF-M9XWD')).toBeNull();
    expect(ownReceiptUrl('https://tsaconnectworld.com/pay/x')).toBeNull();
    expect(ownReceiptUrl('https://tsaconnectworld.com/r/TSA-7K2QF-M9XWD/x')).toBeNull();
    expect(ownReceiptUrl('http://tsaconnectworld.com/r/TSA-7K2QF-M9XWD')).toBeNull();
    expect(ownReceiptUrl(undefined)).toBeNull();
  });
});

describe('payment codes (mirrors the API)', () => {
  it.each([
    ['TSA-7K2QF-M9XWD', '7K2QFM9XWD'],
    ['tsa-7k2qf-m9xwd', '7K2QFM9XWD'],
    ['7K2QF M9XWD', '7K2QFM9XWD'],
    ['7k2qfm9xwd', '7K2QFM9XWD'],
    ['TSA 7K2QF M9XWD\n', '7K2QFM9XWD'],
    ['\u00a0TSA\u20137K2QF\u2014M9XWD', '7K2QFM9XWD'],
    ['TSA-7K2QF-M9XWO', '7K2QFM9XW0'],
    ['TSA-7K2QF-M9XIL', '7K2QFM9X11'],
    ['TSA12345XY', 'TSA12345XY'],
    ['TSA-TSA12-345XY', 'TSA12345XY'],
    ['TSA\u30007K2QF\u{10EAD}M9XWD', '7K2QFM9XWD'], // ideographic space, astral Yezidi hyphen: on the explicit lists
  ])('%j is %s', (input, want) => {
    expect(normalizePayCode(input)).toBe(want);
  });

  it.each([
    '', 'TSA', 'hello', '7K2QF-M9XW', '7K2QF-M9XWDD', 'TSA-7K2QF-M9XWU', '7K2QF-M9XW!',
    'TSA-7K2QF-M9XWD-1', 'A'.repeat(100),
    'TSA-7K2QF-M9XW\u0131', 'TSA-7K2QF-M9XW\u017f', 'TSA-7K2QF-M9XW\u00df', '7K2QFM9X\u00df',
    // The Garay hyphen (Unicode 16 Pd) is on no list — the dash set must not follow the browser's Unicode; BOM is no space.
    '7K2QF\u{10D6E}M9XWD', '7K2QF\ufeffM9XWD',
  ])('%j is not a code', (input) => {
    expect(normalizePayCode(input)).toBeNull();
  });

  it('says how much of a payment was refunded', () => {
    expect(receiptRefundLine({ refundStatus: 'none', refundedAmount: '0.00' })).toBeNull();
    expect(receiptRefundLine({ refundStatus: 'partial', refundedAmount: '12.50' })).toBe('Partly refunded · 12.50 USD');
    expect(receiptRefundLine({ refundStatus: 'full', refundedAmount: '15.00' })).toBe('Refunded in full · 15.00 USD');
  });

  it('fetches a receipt by its bare code without custom headers', async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: {} }) }));
    vi.stubGlobal('fetch', f);
    await fetchPublicReceipt('7K2QFM9XWD');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/pay\/public\/receipt\/7K2QFM9XWD$/);
    expect(init.headers).toBeUndefined();
  });
});
