import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReceiptPage, { ReceiptView } from './receipt';
import { receiptVerifyUrl, type PublicReceipt } from '@/lib/pay';

const receipt: PublicReceipt = {
  code: 'TSA-7K2QF-M9XWD',
  merchantName: 'Ada Bakes',
  amount: 1_515_152,
  currency: 'NGN',
  description: 'Birthday cake, 2 tiers',
  descriptionIsCustomerNote: false,
  paidAt: '2026-09-28T09:05:00Z',
  payerInitials: 'C.O.',
  refundStatus: 'none',
  refundedAmount: '0.00',
};
const VERIFY = 'https://tsaconnectworld.com/r/TSA-7K2QF-M9XWD';
const view = (r: PublicReceipt) => renderToStaticMarkup(<ReceiptView receipt={r} verifyUrl={VERIFY} />);

describe('ReceiptView', () => {
  it('shows who was paid, how much, for what, by whom (initials only), when, and its code', () => {
    const html = view(receipt);
    for (const want of ['Ada Bakes', '₦15,151.52', 'Birthday cake, 2 tiers', 'C.O.', 'TSA-7K2QF-M9XWD']) {
      expect(html).toContain(want);
    }
    // 09:05 UTC is 10:05 in Lagos.
    expect(html).toMatch(/Paid on.*10:05/);
    expect(html).not.toContain('Refund');
  });

  it('carries the seal and the QR, and prints', () => {
    const html = view(receipt);
    expect(html).toContain('Verified by TSA Connect');
    expect(html).toContain('Print / Save as PDF');
  });

  it("labels a customer's own note as hers", () => {
    const html = view({ ...receipt, description: 'for the party', descriptionIsCustomerNote: true });
    expect(html).toContain('Customer&#x27;s note:');
    expect(html).not.toMatch(/<dt[^>]*>For<\/dt>/);
  });

  it('leaves out what the API left empty', () => {
    const html = view({ ...receipt, description: '', payerInitials: '' });
    expect(html).not.toMatch(/<dt[^>]*>For<\/dt>/);
    expect(html).not.toContain('Paid by');
  });

  it('says when it was refunded', () => {
    expect(view({ ...receipt, refundStatus: 'partial', refundedAmount: '12.50' })).toContain('Partly refunded · 12.50 USD');
  });
});

describe('receiptVerifyUrl', () => {
  it("is the site's own domain and the formatted code, whatever origin served the page", () => {
    expect(receiptVerifyUrl('7K2QFM9XWD')).toBe('https://tsaconnectworld.com/r/TSA-7K2QF-M9XWD');
  });
});

describe('ReceiptPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  const settle = () => act(async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); });
  async function open(path: string) {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/r/:code" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    await settle();
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('asks the API for the receipt by its bare code and shows it', async () => {
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true, data: receipt }) }));
    vi.stubGlobal('fetch', f);
    await open('/r/TSA-7K2QF-M9XWD');
    expect(String((f.mock.calls[0] as unknown as [string])[0])).toMatch(/\/pay\/public\/receipt\/7K2QFM9XWD$/);
    expect(container.textContent).toContain('Ada Bakes');
    expect(document.title).toBe('Receipt · TSA Connect');
  });

  it('a receipt the API does not have says so, with nothing to retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false, status: 404, json: async () => ({ success: false, message: "We couldn't find that code. Check it and try again." }),
    })));
    await open('/r/TSA-AAAAA-AAAAA');
    expect(container.textContent).toContain("We couldn't find this receipt.");
    expect(container.textContent).not.toContain('Try again');
  });

  it('a link that cannot be a code is refused without a request', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    await open('/r/hello');
    expect(container.textContent).toContain("This receipt link isn't valid.");
    expect(f).not.toHaveBeenCalled();
  });
});
