import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PaymentStatusView } from './pay';
import type { PublicPayment } from '@/lib/pay';

const ID = '3f2c1a9e-8b7d-4c6e-9f10-1a2b3c4d5e6f';

const link: PublicPayment = {
  id: ID,
  merchantName: 'Ada Bakes',
  status: 'pending',
  amount: 1_500_000,
  customerTotal: 1_500_000,
  currency: 'NGN',
  expiresAt: '2026-10-03T13:30:00Z',
  appUrl: `tsaconnect://pay?id=${ID}`,
  description: 'Birthday cake, 2 tiers',
  customerName: 'Chidi Okafor',
};

const render = (payment: PublicPayment, returnHref: string | null = null) =>
  renderToStaticMarkup(<PaymentStatusView payment={payment} returnHref={returnHref} />);

const DESKTOP_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const onDevice = (userAgent: string, coarsePointer: boolean) => {
  vi.stubGlobal('navigator', { userAgent });
  vi.stubGlobal('matchMedia', () => ({ matches: coarsePointer }));
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('opening the app from an open payment', () => {
  it('gives a phone in "Desktop site" mode the button, not a QR code to scan', () => {
    onDevice(DESKTOP_UA, true);
    const html = render(link);
    expect(html).toContain('Open TSA Connect');
    expect(html).not.toContain('Scan with your phone camera');
  });

  it('gives a desktop the QR code, and still a way to open the app', () => {
    onDevice(DESKTOP_UA, false);
    const html = render(link);
    expect(html).toContain('Scan with your phone camera');
    expect(html).toContain('Already on your phone? Open TSA Connect');
  });
});

describe('PaymentStatusView', () => {
  it('shows what the link is for, who it is for, and until when it is open', () => {
    const html = render(link);
    expect(html).toContain('Birthday cake, 2 tiers');
    expect(html).toContain('Requested for Chidi Okafor');
    expect(html).toContain('Link open until 3 Oct 2026');
  });

  it('leaves out the optional lines when the API does not send them', () => {
    const html = render({ ...link, description: undefined, customerName: undefined });
    expect(html).not.toContain('Requested for');
    expect(html).toContain('Awaiting payment');
  });

  it('does not show the open-until line once the payment is processing', () => {
    expect(render({ ...link, status: 'processing' })).not.toContain('Link open until');
  });

  it('shows a receipt when a paid link has nowhere to return to', () => {
    const html = render({ ...link, status: 'succeeded', succeededAt: '2026-09-28T09:05:00Z' });
    expect(html).toContain('Paid to');
    expect(html).toContain('Ada Bakes');
    expect(html).toContain('₦15,000.00');
    expect(html).toContain('Birthday cake, 2 tiers');
    // 09:05 UTC is 10:05 in Lagos.
    expect(html).toMatch(/Paid on.*10:05/);
    expect(html).not.toContain(ID);
    expect(html).not.toContain('Return to');
  });

  it('keeps the return button when the merchant set a return URL', () => {
    const html = render({ ...link, status: 'succeeded' }, 'https://adabakes.ng/done');
    expect(html).toContain('Return to Ada Bakes');
    expect(html).not.toContain('Paid to');
  });

  it('says a cancelled link was cancelled, not expired', () => {
    const html = render({ ...link, status: 'expired', cancelled: true });
    expect(html).toContain('This payment link was cancelled by Ada Bakes.');
    expect(html).toContain('Contact them for a new one.');
    expect(html).not.toContain('has expired');
  });

  it('still says an uncancelled link has expired', () => {
    expect(render({ ...link, status: 'expired' })).toContain('This payment link has expired.');
  });

  it('warns that a test link moves no real money, in every state', () => {
    const banner = 'Test payment link — no real money moves.';
    expect(render({ ...link, mode: 'test' })).toContain(banner);
    expect(render({ ...link, mode: 'test', status: 'succeeded' })).toContain(banner);
    expect(render({ ...link, mode: 'live' })).not.toContain(banner);
    // An older API sends no mode at all — treat it as live.
    expect(render(link)).not.toContain(banner);
  });

  it('lets long unbroken names and descriptions wrap inside the card', () => {
    const long = 'x'.repeat(200);
    const payment = { ...link, merchantName: long, description: long, customerName: long };
    const wrapped = (html: string) => html.match(/<[^>]*wrap-anywhere[^>]*>[^<]*x{200}/g)?.length ?? 0;
    // Merchant name, description, customer name.
    expect(wrapped(render(payment))).toBe(3);
    // Receipt rows: paid to, for, requested for.
    expect(wrapped(render({ ...payment, status: 'succeeded' }))).toBe(3);
    // Cancelled title names the merchant.
    expect(render({ ...payment, status: 'expired', cancelled: true })).toMatch(
      /wrap-anywhere[^>]*>This payment link was cancelled by x{200}/,
    );
  });

  it('renders an API-made payment without the link-only fields', () => {
    const html = render({
      ...link,
      source: 'api',
      description: undefined,
      customerName: undefined,
      mode: undefined,
    });
    expect(html).toContain('Ada Bakes');
    expect(html).toContain('₦15,000.00');
    expect(html).not.toContain('Requested for');
  });

  it('points a payer without the app to Google Play while the payment is open', () => {
    const html = render(link);
    expect(html).toContain('Don&#x27;t have TSA Connect? Get the app, sign up, then come back to this link.');
    expect(html).toContain('href="https://play.google.com/store/apps/details?id=com.tsaconnectworld.mobile"');
    // No App Store listing yet.
    expect(html).not.toContain('App Store');
    expect(render({ ...link, status: 'succeeded' })).not.toContain('Get the app');
  });

  it("shows a reusable link's label as what's paid for, and the payer's note as a note", () => {
    const open: PublicPayment = {
      ...link,
      source: 'open',
      linkLabel: 'Ada Bakes — Shop 12',
      description: '2 bags of rice',
      customerName: undefined,
    };
    const html = render(open);
    expect(html).toContain('Ada Bakes — Shop 12');
    expect(html).toContain('Note from customer: 2 bags of rice');
    expect(html).toContain('Pay by 3 Oct 2026');
    expect(html).not.toContain('Link open until');

    const receipt = render({ ...open, status: 'succeeded' });
    expect(receipt).toMatch(/For<\/dt><dd[^>]*>Ada Bakes — Shop 12/);
    expect(receipt).toMatch(/Note from customer<\/dt><dd[^>]*>2 bags of rice/);
  });

  it('offers to start again when a reusable-link payment timed out', () => {
    const html = render({
      ...link,
      source: 'open',
      status: 'expired',
      openLinkUrl: 'https://tsaconnectworld.com/pay/l/ada-bakes-7k3q',
    });
    expect(html).toContain('This payment timed out.');
    expect(html).toContain('href="https://tsaconnectworld.com/pay/l/ada-bakes-7k3q"');
    expect(html).toContain('Start a new payment');
    expect(html).not.toContain('Ask the store');
  });

  it('offers to start again when a reusable-link payment failed, but only to our own host', () => {
    const failed: PublicPayment = { ...link, source: 'open', status: 'failed' };
    const html = render({ ...failed, openLinkUrl: 'https://tsaconnectworld.com/pay/l/ada-bakes-7k3q' });
    expect(html).toContain('This payment failed.');
    expect(html).toContain('Start a new payment');

    const foreign = render({ ...failed, openLinkUrl: 'https://evil.example/pay/l/ada-bakes-7k3q' });
    expect(foreign).not.toContain('Start a new payment');
    expect(foreign).toContain('Ask the store for a new payment link.');
  });
});

describe('payment codes and receipts', () => {
  const coded: PublicPayment = { ...link, payCode: 'TSA-7K2QF-M9XWD' };
  const paidLive: PublicPayment = {
    ...coded,
    mode: 'live',
    status: 'succeeded',
    succeededAt: '2026-09-28T09:05:00Z',
    receiptUrl: 'https://tsaconnectworld.com/r/TSA-7K2QF-M9XWD',
  };

  it('a pending payment shows its code, how to pay with it in the app, and Print', () => {
    onDevice(DESKTOP_UA, false);
    const html = render(coded);
    expect(html).toContain('TSA-7K2QF-M9XWD');
    expect(html).toContain('Or pay in the TSA Connect app: Wallet → TSA Pay → enter this code');
    expect(html).toMatch(/<button[^>]*>Copy<\/button>/);
    expect(html).toMatch(/<button[^>]*>Print<\/button>/);
  });

  it('a processing payment shows its code but no longer how to pay with it', () => {
    onDevice(DESKTOP_UA, false);
    const html = render({ ...coded, status: 'processing' });
    expect(html).toContain('TSA-7K2QF-M9XWD');
    expect(html).not.toContain('Wallet → TSA Pay');
    expect(html).not.toMatch(/>Print</);
  });

  // Review Focus 4.
  it('a payment from before codes shows no code line', () => {
    onDevice(DESKTOP_UA, false);
    const html = render(link);
    expect(html).not.toContain('Payment code');
    expect(html).not.toContain('Wallet → TSA Pay');
  });

  it('a live receipt carries the code, a QR to its verify page, the seal and Print — with or without a return URL', () => {
    for (const html of [render(paidLive), render(paidLive, 'https://adabakes.ng/done')]) {
      expect(html).toContain('TSA-7K2QF-M9XWD');
      expect(html).toContain('Verified by TSA Connect');
      expect(html).toContain('Print / Save as PDF');
    }
    expect(render(paidLive, 'https://adabakes.ng/done')).toContain('Return to Ada Bakes');
  });

  it('a test receipt never carries the seal', () => {
    const html = render({ ...paidLive, mode: 'test', receiptUrl: undefined });
    expect(html).toContain('TSA-7K2QF-M9XWD');
    expect(html).not.toContain('Verified by TSA Connect');
  });

  it('ignores a receipt link that is not https', () => {
    expect(render({ ...paidLive, receiptUrl: 'javascript:alert(1)' })).not.toContain('Verified by TSA Connect');
  });
});
