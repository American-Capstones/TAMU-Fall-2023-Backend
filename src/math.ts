export const sum = (a: number, b: number) => a + b;

export const divide = (a: number, b: number) => {
  if (b !== 0) {
    return a/b;
  }
  throw new Error('Cannot divide by zero');
};
