process.env.JWT_ACCESS_SECRET = 'test-secret';

const request    = require('supertest');
const app        = require('../../src/app');
const CATEGORIES = require('../../src/data/categories');

// No DB needed — categories are served from a static module.

describe('GET /api/categories', () => {
  it('returns all 12 service categories without auth', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories).toHaveLength(12);
  });

  it('gives every category a slug, Hebrew name, English name and icon', async () => {
    const res = await request(app).get('/api/categories');

    for (const cat of res.body.categories) {
      expect(typeof cat.slug).toBe('string');
      expect(cat.slug.length).toBeGreaterThan(0);
      expect(typeof cat.name_he).toBe('string');
      expect(cat.name_he.length).toBeGreaterThan(0);
      expect(typeof cat.name_en).toBe('string');
      expect(typeof cat.icon).toBe('string');
    }
  });

  it('uses unique slugs', async () => {
    const res = await request(app).get('/api/categories');
    const slugs = res.body.categories.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('matches the categories module exactly', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.body.categories).toEqual(CATEGORIES);
  });

  it('includes the core Hebrew trades used across the app', async () => {
    const res = await request(app).get('/api/categories');
    const slugs = res.body.categories.map((c) => c.slug);

    expect(slugs).toEqual(
      expect.arrayContaining(['plumber', 'electrician', 'carpenter', 'painter', 'locksmith'])
    );
    const plumber = res.body.categories.find((c) => c.slug === 'plumber');
    expect(plumber.name_he).toBe('אינסטלטור');
  });
});
