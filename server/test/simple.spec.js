import app from '../WebStore.js';

describe('Simple Test', () => {
  it('should have an Express app instance', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
    expect(app.get).toBeDefined();
    expect(app.post).toBeDefined();
    expect(app.put).toBeDefined();
    expect(app.delete).toBeDefined();
  });
});
