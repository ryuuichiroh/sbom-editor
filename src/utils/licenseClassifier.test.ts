import { describe, it, expect } from '@jest/globals';
import {
  classifyLicense,
  evaluateLicenseExpression,
  getCategoryDisplayName,
  getCategorySortOrder,
} from './licenseClassifier';
import type { LicenseCategory } from '../types/unified';

describe('licenseClassifier', () => {
  describe('classifyLicense', () => {
    it('should classify copyleft licenses correctly', () => {
      expect(classifyLicense('GPL-2.0-only')).toBe('copyleft');
      expect(classifyLicense('GPL-2.0-or-later')).toBe('copyleft');
      expect(classifyLicense('GPL-3.0-only')).toBe('copyleft');
      expect(classifyLicense('GPL-3.0-or-later')).toBe('copyleft');
      expect(classifyLicense('AGPL-3.0-only')).toBe('copyleft');
      expect(classifyLicense('AGPL-3.0-or-later')).toBe('copyleft');
      expect(classifyLicense('EUPL-1.0')).toBe('copyleft');
      expect(classifyLicense('OSL-3.0')).toBe('copyleft');
    });

    it('should classify weak copyleft licenses correctly', () => {
      expect(classifyLicense('LGPL-2.0-only')).toBe('weak-copyleft');
      expect(classifyLicense('LGPL-2.1-only')).toBe('weak-copyleft');
      expect(classifyLicense('LGPL-3.0-only')).toBe('weak-copyleft');
      expect(classifyLicense('MPL-1.0')).toBe('weak-copyleft');
      expect(classifyLicense('MPL-2.0')).toBe('weak-copyleft');
      expect(classifyLicense('EUPL-1.2')).toBe('weak-copyleft');
      expect(classifyLicense('CDDL-1.0')).toBe('weak-copyleft');
      expect(classifyLicense('EPL-1.0')).toBe('weak-copyleft');
      expect(classifyLicense('EPL-2.0')).toBe('weak-copyleft');
    });

    it('should classify permissive licenses correctly', () => {
      expect(classifyLicense('MIT')).toBe('permissive');
      expect(classifyLicense('MIT-0')).toBe('permissive');
      expect(classifyLicense('Apache-2.0')).toBe('permissive');
      expect(classifyLicense('Apache-1.1')).toBe('permissive');
      expect(classifyLicense('BSD-2-Clause')).toBe('permissive');
      expect(classifyLicense('BSD-3-Clause')).toBe('permissive');
      expect(classifyLicense('0BSD')).toBe('permissive');
      expect(classifyLicense('ISC')).toBe('permissive');
      expect(classifyLicense('Unlicense')).toBe('permissive');
      expect(classifyLicense('Zlib')).toBe('permissive');
      expect(classifyLicense('PSF-2.0')).toBe('permissive');
      expect(classifyLicense('CC0-1.0')).toBe('permissive');
    });

    it('should classify proprietary licenses correctly', () => {
      expect(classifyLicense('LicenseRef-Commercial')).toBe('proprietary');
      expect(classifyLicense('LicenseRef-Proprietary')).toBe('proprietary');
      expect(classifyLicense('LicenseRef-Custom-License')).toBe('proprietary');
    });

    it('should classify other licenses correctly', () => {
      expect(classifyLicense('Artistic-1.0')).toBe('other');
      expect(classifyLicense('Artistic-1.0-Perl')).toBe('other');
    });

    it('should classify unknown licenses correctly', () => {
      expect(classifyLicense('NOASSERTION')).toBe('unknown');
      expect(classifyLicense('NONE')).toBe('unknown');
      expect(classifyLicense('')).toBe('unknown');
      expect(classifyLicense('UnknownLicense')).toBe('unknown');
      expect(classifyLicense('CustomLicense-1.0')).toBe('unknown');
    });
  });

  describe('evaluateLicenseExpression', () => {
    it('should return unknown for empty or special values', () => {
      expect(evaluateLicenseExpression('')).toBe('unknown');
      expect(evaluateLicenseExpression('NOASSERTION')).toBe('unknown');
      expect(evaluateLicenseExpression('NONE')).toBe('unknown');
    });

    it('should evaluate single license expressions', () => {
      expect(evaluateLicenseExpression('MIT')).toBe('permissive');
      expect(evaluateLicenseExpression('GPL-3.0-only')).toBe('copyleft');
      expect(evaluateLicenseExpression('LGPL-2.1-only')).toBe('weak-copyleft');
    });

    it('should evaluate OR expressions and return the strongest category', () => {
      // permissive OR permissive = permissive
      expect(evaluateLicenseExpression('MIT OR Apache-2.0')).toBe('permissive');

      // permissive OR weak-copyleft = weak-copyleft
      expect(evaluateLicenseExpression('MIT OR LGPL-2.1-only')).toBe('weak-copyleft');

      // permissive OR copyleft = copyleft
      expect(evaluateLicenseExpression('MIT OR GPL-3.0-only')).toBe('copyleft');

      // weak-copyleft OR copyleft = copyleft
      expect(evaluateLicenseExpression('LGPL-2.1-only OR GPL-3.0-only')).toBe('copyleft');
    });

    it('should evaluate AND expressions and return the strongest category', () => {
      // permissive AND permissive = permissive
      expect(evaluateLicenseExpression('MIT AND Apache-2.0')).toBe('permissive');

      // permissive AND copyleft = copyleft
      expect(evaluateLicenseExpression('MIT AND GPL-3.0-only')).toBe('copyleft');

      // weak-copyleft AND copyleft = copyleft
      expect(evaluateLicenseExpression('LGPL-2.1-only AND GPL-3.0-only')).toBe('copyleft');
    });

    it('should evaluate WITH expressions', () => {
      expect(evaluateLicenseExpression('GPL-2.0-only WITH Classpath-exception-2.0')).toBe(
        'copyleft'
      );
      expect(evaluateLicenseExpression('Apache-2.0 WITH LLVM-exception')).toBe('permissive');
    });

    it('should evaluate complex expressions', () => {
      // (MIT OR Apache-2.0) AND GPL-3.0-only = copyleft (strongest)
      expect(evaluateLicenseExpression('MIT OR Apache-2.0 AND GPL-3.0-only')).toBe('copyleft');

      // MIT OR LGPL-2.1-only OR GPL-3.0-only = copyleft (strongest)
      expect(evaluateLicenseExpression('MIT OR LGPL-2.1-only OR GPL-3.0-only')).toBe('copyleft');
    });

    it('should handle expressions with unknown licenses', () => {
      expect(evaluateLicenseExpression('MIT OR UnknownLicense')).toBe('permissive');
      expect(evaluateLicenseExpression('UnknownLicense OR MIT')).toBe('permissive');
      expect(evaluateLicenseExpression('UnknownLicense1 OR UnknownLicense2')).toBe('unknown');
    });

    it('should handle case-insensitive operators', () => {
      expect(evaluateLicenseExpression('MIT or Apache-2.0')).toBe('permissive');
      expect(evaluateLicenseExpression('MIT and GPL-3.0-only')).toBe('copyleft');
      expect(evaluateLicenseExpression('GPL-2.0-only with Classpath-exception-2.0')).toBe(
        'copyleft'
      );
    });
  });

  describe('getCategoryDisplayName', () => {
    it('should return correct display names for all categories', () => {
      expect(getCategoryDisplayName('copyleft')).toBe('Copyleft');
      expect(getCategoryDisplayName('weak-copyleft')).toBe('Weak Copyleft');
      expect(getCategoryDisplayName('permissive')).toBe('Permissive');
      expect(getCategoryDisplayName('proprietary')).toBe('Proprietary');
      expect(getCategoryDisplayName('other')).toBe('Other');
      expect(getCategoryDisplayName('unknown')).toBe('Unknown');
    });
  });

  describe('getCategorySortOrder', () => {
    it('should return correct sort order (strongest first)', () => {
      const categories: LicenseCategory[] = [
        'copyleft',
        'weak-copyleft',
        'permissive',
        'proprietary',
        'other',
        'unknown',
      ];

      const sortOrders = categories.map((cat) => getCategorySortOrder(cat));

      // copyleft should have the smallest (most negative) value
      expect(sortOrders[0]).toBeLessThan(sortOrders[1]); // copyleft < weak-copyleft
      expect(sortOrders[1]).toBeLessThan(sortOrders[2]); // weak-copyleft < permissive
      expect(sortOrders[2]).toBeLessThan(sortOrders[5]); // permissive < unknown
    });

    it('should sort categories correctly when used in array sort', () => {
      const categories: LicenseCategory[] = ['unknown', 'permissive', 'copyleft', 'weak-copyleft'];

      const sorted = [...categories].sort(
        (a, b) => getCategorySortOrder(a) - getCategorySortOrder(b)
      );

      expect(sorted).toEqual(['copyleft', 'weak-copyleft', 'permissive', 'unknown']);

      // proprietary and other have the same strength, so their relative order is not guaranteed
      expect(getCategorySortOrder('proprietary')).toBe(getCategorySortOrder('other'));
    });
  });
});
