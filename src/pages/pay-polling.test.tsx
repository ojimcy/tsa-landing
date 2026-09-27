import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PayPage from './pay';

const ID = '3f2c1a9e-8b7d-4c6e-9f10-1a2b3c4d5e6f';

const pending = {
  ok: true,
  status: 200,
  json: async () => ({
    success: true,
    data: {
      id: ID,
      merchantName: 'Ada Bakes',
      status: 'pending',
      amount: 500_000,
      customerTotal: 500_000,
      currency: 'NGN',
      expiresAt: '2026-10-03T13:30:00Z',
      appUrl: `tsaconnect://pay?id=${ID}`,
    },
  }),
};
const outage = { ok: false, status: 503, json: async () => ({ success: false }) };

let container: HTMLDivElement;
let root: Root;
let hidden = false;

const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

async function renderPay() {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[`/pay/${ID}`]}>
        <Routes>
          <Route path="/pay/:id" element={<PayPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await advance(0);
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('checkout status polling', () => {
  it('pauses while the tab is hidden and checks straight away when it comes back', async () => {
    const f = vi.fn().mockResolvedValue(pending);
    vi.stubGlobal('fetch', f);
    await renderPay();
    expect(f).toHaveBeenCalledTimes(1);

    hidden = true;
    await advance(60_000);
    expect(f).toHaveBeenCalledTimes(1);

    hidden = false;
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await advance(0);
    expect(f).toHaveBeenCalledTimes(2);

    await advance(5000);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('backs off after failed checks and returns to the normal pace once one succeeds', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(outage)
      .mockResolvedValueOnce(outage)
      .mockResolvedValue(pending);
    vi.stubGlobal('fetch', f);
    await renderPay();

    await advance(5000); // first failure
    expect(f).toHaveBeenCalledTimes(2);
    await advance(9999);
    expect(f).toHaveBeenCalledTimes(2);
    await advance(1); // 10s later: second failure
    expect(f).toHaveBeenCalledTimes(3);
    await advance(19_999);
    expect(f).toHaveBeenCalledTimes(3);
    await advance(1); // 20s later: success
    expect(f).toHaveBeenCalledTimes(4);
    await advance(5000);
    expect(f).toHaveBeenCalledTimes(5);
    // The payment stayed on screen through the outage.
    expect(container.textContent).toContain('Ada Bakes');
  });
});
