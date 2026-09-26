import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  closedPaymentCopy,
  fetchPublicPayment,
  formatKobo,
  formatLagosDateTime,
  isUuid,
  shouldPollAgain,
  withPaymentParams,
  type PublicPayment,
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
});
