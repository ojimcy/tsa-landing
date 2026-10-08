import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { PayCodeLine, PrintButton } from './pay-code';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

async function mount(node: ReactNode) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(node));
  return el;
}

it('Copy puts the code on the clipboard and says so', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  const el = await mount(<PayCodeLine code="TSA-7K2QF-M9XWD" payable />);
  await act(async () => { el.querySelector('button')!.click(); });
  expect(writeText).toHaveBeenCalledWith('TSA-7K2QF-M9XWD');
  expect(el.textContent).toContain('Copied');
});

it('Print opens the browser print dialog, which also saves a PDF', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  const el = await mount(<PrintButton label="Print" />);
  await act(async () => { el.querySelector('button')!.click(); });
  expect(print).toHaveBeenCalled();
});

describe('Copy button feedback', () => {
  const clipboard = (writeText: () => Promise<void>) =>
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  const status = (el: HTMLElement) => el.querySelector('[role="status"]')!.textContent;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('labels the button for screen readers', async () => {
    const el = await mount(<PayCodeLine code="TSA-7K2QF-M9XWD" payable />);
    expect(el.querySelector('button')!.getAttribute('aria-label')).toBe('Copy payment code');
  });

  it("says when it couldn't copy", async () => {
    clipboard(vi.fn().mockRejectedValue(new Error('denied')));
    const el = await mount(<PayCodeLine code="TSA-7K2QF-M9XWD" payable />);
    await act(async () => { el.querySelector('button')!.click(); });
    expect(status(el)).toBe("Couldn't copy");
  });

  it('forgets the message after two seconds', async () => {
    clipboard(vi.fn().mockResolvedValue(undefined));
    const el = await mount(<PayCodeLine code="TSA-7K2QF-M9XWD" payable />);
    await act(async () => { el.querySelector('button')!.click(); });
    expect(status(el)).toBe('Copied');
    await act(async () => { vi.advanceTimersByTime(1999); });
    expect(status(el)).toBe('Copied');
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(status(el)).toBe('');
  });

  it('a repeat click restarts the two seconds', async () => {
    clipboard(vi.fn().mockResolvedValue(undefined));
    const el = await mount(<PayCodeLine code="TSA-7K2QF-M9XWD" payable />);
    await act(async () => { el.querySelector('button')!.click(); });
    await act(async () => { vi.advanceTimersByTime(1500); });
    await act(async () => { el.querySelector('button')!.click(); });
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(status(el)).toBe('Copied');
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(status(el)).toBe('');
  });
});
