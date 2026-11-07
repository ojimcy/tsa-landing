import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductView } from './product';
import { isProductId, productAppUrl, type PublicProduct } from '@/lib/product';

const ID = '6371b866-6d16-4adb-aac5-5631e0e7674b';
const digital: PublicProduct = {
  id: ID,
  name: 'Be still and know',
  price: 0.36,
  kind: 'digital',
  categoryName: 'Other',
  images: [{ url: 'https://res.cloudinary.com/x/cover.png' }],
  digital: { creatorName: 'Ada', licence: 'commercial', preview: { kind: 'pdf' } },
};

describe('ProductView', () => {
  it('names the product, its creator, price and licence, and offers the app', () => {
    const html = renderToStaticMarkup(<ProductView product={digital} />);
    for (const want of ['Be still and know', 'by Ada', '$0.36', 'Digital product · Other', 'Free preview in the app', 'Commercial-use licence', 'Open in TSA Connect']) {
      expect(html).toContain(want);
    }
  });

  it('a general product shows its seller and no licence', () => {
    const html = renderToStaticMarkup(<ProductView product={{ id: ID, name: 'Shoes', price: 20, kind: 'general', companyName: 'Kicks' }} />);
    expect(html).toContain('by Kicks');
    expect(html).not.toContain('licence');
  });
});

describe('product links', () => {
  it('opens the app on the listing, and takes only a UUID', () => {
    expect(productAppUrl(ID)).toBe(`tsaconnect://product/${ID}`);
    expect(isProductId(ID)).toBe(true);
    expect(isProductId('../../admin')).toBe(false);
  });
});
