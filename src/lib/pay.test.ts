import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  closedPaymentCopy,
  createOpenLinkPayment,
  fetchPublicPayment,
  fetchPublicOpenLink,
  formatKobo,
  formatLagosDateTime,
  isLinkSlug,
  isOpenLinkClosedError,
  isUuid,
  parseNairaToKobo,
  paymentPurpose,
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
    // A one-time link keeps its own wording.
    expect(closedPaymentCopy({ ...open, source: 'link', openLinkUrl: url }).title).toBe('This payment link has expired.');
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
    expect(isLinkSlug('Mama-Ngozi')).toBe(false);
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
