import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { privateSale } from '@/data/content';
import { PrivateSale } from './private-sale';

async function mount() {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const el = document.createElement('div');
  document.body.appendChild(el);
  await act(async () => createRoot(el).render(<PrivateSale />));
  return el;
}
const copyButton = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button[aria-label="Copy address"]')!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

it('Copy puts the deposit address on the clipboard and shows Copied for two seconds', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  const el = await mount();
  await act(async () => { copyButton(el).click(); });
  expect(writeText).toHaveBeenCalledWith(privateSale.depositAddress);
  expect(copyButton(el).textContent).toBe('Copied');
  await act(async () => { vi.advanceTimersByTime(2000); });
  expect(copyButton(el).textContent).toBe('Copy');
});

it('falls back to the old copy command when the clipboard refuses, and still shows Copied', async () => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true });
  const exec = vi.fn(() => true);
  Object.defineProperty(document, 'execCommand', { value: exec, configurable: true });
  const el = await mount();
  await act(async () => { copyButton(el).click(); });
  expect(exec).toHaveBeenCalledWith('copy');
  expect(copyButton(el).textContent).toBe('Copied');
});
