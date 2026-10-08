import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useCopy } from './use-copy';

function Probe({ text, legacyFallback }: { text: string; legacyFallback?: boolean }) {
  const { status, copy } = useCopy({ legacyFallback });
  return <button onClick={() => copy(text)}>{status ?? ''}</button>;
}

async function mount(text: string, legacyFallback?: boolean) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const el = document.createElement('div');
  document.body.appendChild(el);
  await act(async () => createRoot(el).render(<Probe text={text} legacyFallback={legacyFallback} />));
  return el;
}
const click = (el: HTMLElement) => act(async () => { el.querySelector('button')!.click(); });
const clipboard = (writeText: () => Promise<void>) =>
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

it('copies the text and says so for two seconds', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  clipboard(writeText);
  const el = await mount('TSA-7K2QF-M9XWD');
  await click(el);
  expect(writeText).toHaveBeenCalledWith('TSA-7K2QF-M9XWD');
  expect(el.textContent).toBe('copied');
  await act(async () => { vi.advanceTimersByTime(2000); });
  expect(el.textContent).toBe('');
});

it("says it couldn't copy when the clipboard refuses", async () => {
  clipboard(vi.fn().mockRejectedValue(new Error('denied')));
  const el = await mount('x');
  await click(el);
  expect(el.textContent).toBe('failed');
});

it('a repeat copy restarts the two seconds', async () => {
  clipboard(vi.fn().mockResolvedValue(undefined));
  const el = await mount('x');
  await click(el);
  await act(async () => { vi.advanceTimersByTime(1500); });
  await click(el);
  await act(async () => { vi.advanceTimersByTime(1500); });
  expect(el.textContent).toBe('copied');
  await act(async () => { vi.advanceTimersByTime(500); });
  expect(el.textContent).toBe('');
});

it('with the legacy fallback, a refused clipboard copies through a selected textarea', async () => {
  clipboard(vi.fn().mockRejectedValue(new Error('denied')));
  let selected = '';
  const exec = vi.fn(() => {
    selected = (document.activeElement as HTMLTextAreaElement | null)?.value ?? document.querySelector('textarea')?.value ?? '';
    return true;
  });
  Object.defineProperty(document, 'execCommand', { value: exec, configurable: true });
  const el = await mount('0xDEPOSIT', true);
  await click(el);
  expect(exec).toHaveBeenCalledWith('copy');
  expect(selected).toBe('0xDEPOSIT');
  expect(document.querySelector('textarea')).toBeNull();
  expect(el.textContent).toBe('copied');
});
