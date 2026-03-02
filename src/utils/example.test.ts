/**
 * Example unit test to verify Jest setup
 */
describe('Jest Setup', () => {
  it('should run basic assertions', () => {
    expect(true).toBe(true);
    expect(1 + 1).toBe(2);
  });

  it('should handle arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it('should handle objects', () => {
    const obj = { name: 'test', version: '1.0.0' };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('test');
  });
});
