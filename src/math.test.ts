import { divide, sum } from './math';

describe('Math', () => {
  describe('addition', () => {
    it('adds 1 + 1 correctly', () => {
      const result = sum(1, 1);
      expect(result).toBe(2);
    });
  });

  describe('divide', () => {
    it('divides 2/1 correctly', () => {
      const result = divide(2, 1);
      expect(result).toBe(2);
      expect(divide(2, 2)).toBe(1);
    });

    it('throws and error when trying to divide by 0', () => {
      //const result = divide(2,0);
      expect(() => divide(2,0)).toThrow('Cannot divide by zero');
    })
  });
});
