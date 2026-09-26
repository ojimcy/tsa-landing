import { describe, expect, it } from 'vitest';
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
});
