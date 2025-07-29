import { describe, it, expect } from 'vitest';
import { formatCZK, parseCZK } from '../utils';

describe('formatCZK', () => {
  it('formats positive numbers with thousand separators', () => {
    expect(formatCZK(123456789)).toBe('1\u00A0234\u00A0567\u00A0CZK');
  });

  it('formats zero correctly', () => {
    expect(formatCZK(0)).toBe('0\u00A0CZK');
  });

  it('formats negative numbers by flooring', () => {
    expect(formatCZK(-12345)).toBe('-124\u00A0CZK');
  });
});

describe('parseCZK', () => {
  it('parses formatted currency strings', () => {
    expect(parseCZK('1\u00A0234\u00A0CZK')).toBe(123400);
  });

  it('handles strings with commas and spaces', () => {
    expect(parseCZK('1,234 CZK')).toBe(123400);
  });

  it('returns 0 for invalid input', () => {
    expect(parseCZK('invalid')).toBe(0);
    expect(parseCZK('')).toBe(0);
  });

  it('ignores negative sign when parsing', () => {
    expect(parseCZK('-123 CZK')).toBe(12300);
  });
});
