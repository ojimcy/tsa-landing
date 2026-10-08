import { afterEach, expect, it, vi } from 'vitest';
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
