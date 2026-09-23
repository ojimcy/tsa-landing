import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicPayment, formatKobo, isUuid, shouldPollAgain, withPaymentParams } from './pay';

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
});
