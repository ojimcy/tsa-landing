import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GroupInviteView } from './group';
import { groupAppUrl, isGroupInviteCode } from '@/lib/group';

const CODE = 'Ab3_-defghijklmnopqrst';

describe('group invite page', () => {
  it('accepts only the code shape the API makes', () => {
    expect(isGroupInviteCode(CODE)).toBe(true);
    expect(isGroupInviteCode('short')).toBe(false);
    expect(isGroupInviteCode(`${CODE.slice(0, 21)}/`)).toBe(false);
  });

  it('hands the code to the app', () => {
    expect(groupAppUrl(CODE)).toBe(`tsaconnect://group/${CODE}`);
  });

  it('offers the app', () => {
    const html = renderToStaticMarkup(<GroupInviteView code={CODE} />);
    expect(html).toContain('Open in TSA Connect');
    expect(html).toContain('TSA Connect chat');
  });
});
