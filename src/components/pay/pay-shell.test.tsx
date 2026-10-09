import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import css from '@/index.css?raw';
import { PayShell } from './pay-shell';

// Review Focus 5: a printout is the card alone, and a .reveal still waiting to
// scroll into view (opacity 0) prints anyway.
describe('printing a pay page', () => {
  it('hides the site header and footer on paper', () => {
    const html = renderToStaticMarkup(<MemoryRouter><PayShell>receipt</PayShell></MemoryRouter>);
    expect(html.match(/print:hidden/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('shows every reveal on paper', () => {
    expect(css).toMatch(/@media print\s*\{\s*\.reveal\s*\{[^}]*opacity:\s*1 !important/);
  });
});
