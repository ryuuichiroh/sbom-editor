# Testing Setup Guide

## Installed Packages

The following testing packages have been installed:

- **jest** - Testing framework
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers for DOM
- **@testing-library/user-event** - User interaction simulation
- **@types/jest** - TypeScript types for Jest
- **jest-environment-jsdom** - JSDOM environment for Jest
- **ts-jest** - TypeScript support for Jest
- **identity-obj-proxy** - CSS module mocking

## Configuration Files

### jest.config.ts
Main Jest configuration file with:
- TypeScript support via ts-jest
- JSDOM test environment for React components
- CSS and image file mocking
- Coverage collection settings
- Test timeout of 10 seconds

### src/setupTests.ts
Setup file that imports @testing-library/jest-dom for custom matchers.

### tsconfig.test.json
TypeScript configuration for test files with Jest types.

### src/__mocks__/fileMock.ts
Mock for static assets (images, SVG files).

## Available Test Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Writing Tests

### Example Component Test

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Example Unit Test

```typescript
import { parseComponent } from './parser';

describe('parseComponent', () => {
  it('parses valid component data', () => {
    const input = { name: 'test', version: '1.0.0' };
    const result = parseComponent(input);
    
    expect(result.name).toBe('test');
    expect(result.version).toBe('1.0.0');
  });

  it('throws error for invalid data', () => {
    expect(() => parseComponent(null)).toThrow();
  });
});
```

## Test File Naming

Tests should be placed next to the files they test with one of these naming patterns:
- `*.test.ts` or `*.test.tsx`
- `*.spec.ts` or `*.spec.tsx`
- Inside `__tests__` directory

## Best Practices

1. **Test behavior, not implementation** - Focus on what the component does, not how it does it
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Test user interactions** - Use `@testing-library/user-event` for realistic interactions
4. **Keep tests simple** - One assertion per test when possible
5. **Mock external dependencies** - Mock API calls, external services, etc.

## Testing Strategy for SBOM Editor

### Unit Tests
- Parser functions (SPDX, CycloneDX)
- Validator functions
- Exporter functions
- License classifier utility
- Data transformation utilities

### Component Tests
- FileUploadDialog
- ComponentEditor
- ComponentTreeView
- LicenseListView
- CustomAttributeEditor
- SettingsDialog

### Integration Tests
- Full workflow: upload → edit → download
- Format conversion
- Validation with custom field requirements
- Custom attribute management

## Troubleshooting

### Tests hanging or not running
- Ensure Jest is not in watch mode: use `--runInBand` flag
- Check for async operations without proper cleanup
- Verify test timeout is sufficient (default: 10000ms)

### Module resolution errors
- Check `moduleNameMapper` in jest.config.ts
- Verify TypeScript configuration in tsconfig.test.json
- Ensure all dependencies are installed

### React component errors
- Verify @testing-library/react version matches React version
- Check that setupTests.ts is being loaded
- Ensure JSDOM environment is configured
