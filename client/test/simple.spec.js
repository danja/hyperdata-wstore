import { WStoreClient } from '../wstore.js';

describe('Simple Test', () => {
  it('should be able to create a WStoreClient instance', () => {
    const client = new WStoreClient('http://localhost:4500/');
    expect(client).toBeDefined();
    expect(client.baseUrl).toBe('http://localhost:4500/');
  });
});
