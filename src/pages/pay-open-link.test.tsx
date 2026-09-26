import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import PayOpenLinkPage from './pay-open-link';
import type { PublicOpenLink } from '@/lib/pay';

const SLUG = 'mama-ngozi-store-7k3q';
const PAYMENT_ID = '3f2c1a9e-8b7d-4c6e-9f10-1a2b3c4d5e6f';

const link: PublicOpenLink = {
  merchantName: 'Mama Ngozi Store',
  label: 'Rice and beans — Shop 12',
  mode: 'live',
  minAmount: 10_000,
  maxAmount: 50_000_000,
  active: true,
};

const ok = (data: unknown, status = 200) => ({ ok: true, status, json: async () => ({ success: true, data }) });
const fail = (status: number, message: string, code?: string) => ({
  ok: false,
  status,
  json: async () => ({ success: false, message, code }),
});

function CheckoutStub() {
  const { id } = useParams();
  return <p>checkout {id}</p>;
}

let container: HTMLDivElement;
let root: Root;

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {});
  }
}

async function renderAt(path: string) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/pay/l/:slug" element={<PayOpenLinkPage />} />
          <Route path="/pay/:id" element={<CheckoutStub />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await flush();
}

function type(selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector)!;
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setValue.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const continueButton = () =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Continue'))!;

async function pressContinue() {
  await act(async () => {
    continueButton().click();
  });
  await flush();
}

const text = () => container.textContent ?? '';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('open link page', () => {
  it('shows the business, the link label as the heading, and the amount limits', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(link)));
    await renderAt(`/pay/l/${SLUG}`);
    expect(text()).toContain('Mama Ngozi Store');
    expect(container.querySelector('h1')?.textContent).toBe('Rice and beans — Shop 12');
    expect(text()).toContain('Between ₦100.00 and ₦500,000.00');
    expect(container.querySelector('#link-amount')).not.toBeNull();
    expect(text()).not.toContain('no real money moves');
    expect(text()).toContain("Don't have TSA Connect? Get the app, sign up, then come back to this link.");
    expect(container.querySelector('a[href^="https://play.google.com/"]')).not.toBeNull();
  });

  it('shows a test banner in test mode', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ ...link, mode: 'test' })));
    await renderAt(`/pay/l/${SLUG}`);
    expect(text()).toContain('Test payment link — no real money moves.');
    expect(container.querySelector('#link-amount')).not.toBeNull();
  });

  it('says the link is closed when it is paused, replaced or unknown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ ...link, active: false })));
    await renderAt(`/pay/l/${SLUG}`);
    expect(text()).toContain("This payment link isn't accepting payments right now.");
    expect(text()).toContain('Mama Ngozi Store');

    act(() => root.unmount());
    root = createRoot(container);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(404, 'Link not found', 'link_not_found')));
    await renderAt(`/pay/l/${SLUG}`);
    expect(text()).toContain("This payment link isn't accepting payments right now.");
    expect(container.querySelector('form')).toBeNull();
  });

  it('never calls the API for a junk slug', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    await renderAt('/pay/l/Not_A_Slug!');
    expect(text()).toContain("This payment link isn't accepting payments right now.");
    expect(f).not.toHaveBeenCalled();
  });

  it('offers a retry when the link fails to load', async () => {
    const f = vi.fn().mockResolvedValueOnce(fail(500, 'boom')).mockResolvedValueOnce(ok(link));
    vi.stubGlobal('fetch', f);
    await renderAt(`/pay/l/${SLUG}`);
    expect(text()).toContain('Unable to load this payment link. Please try again.');
    const retry = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Try again')!;
    await act(async () => retry.click());
    await flush();
    expect(text()).toContain('Rice and beans — Shop 12');
  });

  it('refuses an amount outside the limits without calling the API', async () => {
    const f = vi.fn().mockResolvedValue(ok(link));
    vi.stubGlobal('fetch', f);
    await renderAt(`/pay/l/${SLUG}`);
    type('#link-amount', '50');
    await pressContinue();
    expect(text()).toContain('The least you can pay here is ₦100.00.');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('starts the payment and hands off to the checkout page', async () => {
    let resolvePost: (v: unknown) => void = () => {};
    const f = vi
      .fn()
      .mockResolvedValueOnce(ok(link))
      .mockReturnValueOnce(new Promise((r) => (resolvePost = r)));
    vi.stubGlobal('fetch', f);
    await renderAt(`/pay/l/${SLUG}`);
    type('#link-amount', '45,000');
    type('#link-note', '  2 bags of rice ');
    await pressContinue();

    // In flight: Continue can't be pressed twice.
    expect(continueButton().disabled).toBe(true);
    expect(f.mock.calls[1][1].body).toBe(JSON.stringify({ amount: 4_500_000, note: '2 bags of rice' }));

    await act(async () => resolvePost(ok({ id: PAYMENT_ID }, 201)));
    await flush();
    expect(text()).toContain(`checkout ${PAYMENT_ID}`);
  });

  it("shows the API's refusal and lets the payer try again", async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(ok(link))
        .mockResolvedValueOnce(fail(422, 'Your note has characters we can’t show. Remove them and try again.')),
    );
    await renderAt(`/pay/l/${SLUG}`);
    type('#link-amount', '5000');
    await pressContinue();
    expect(text()).toContain('Your note has characters we can’t show.');
    expect(continueButton().disabled).toBe(false);
  });

  it('switches to the closed state if the link closes before the payer continues', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(ok(link))
        .mockResolvedValueOnce(fail(409, 'This link is closed', 'link_closed')),
    );
    await renderAt(`/pay/l/${SLUG}`);
    type('#link-amount', '5000');
    await pressContinue();
    expect(text()).toContain("This payment link isn't accepting payments right now.");
    expect(container.querySelector('form')).toBeNull();
  });

  it('lets a long unbroken business name and label wrap inside the card', async () => {
    const long = 'x'.repeat(200);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ ...link, merchantName: long, label: long })));
    await renderAt(`/pay/l/${SLUG}`);
    const wrapped = [...container.querySelectorAll('.wrap-anywhere')].filter((el) => el.textContent === long);
    expect(wrapped).toHaveLength(2);
  });
});
