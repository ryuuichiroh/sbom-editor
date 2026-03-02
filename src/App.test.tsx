import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// SVG インポートをモック
jest.mock('./assets/react.svg', () => 'react-logo.svg');
jest.mock('/vite.svg', () => 'vite-logo.svg');

// configLoader をモックして fetch エラーを防ぐ
jest.mock('./services/configLoader', () => ({
  loadFieldRequirements: jest.fn().mockResolvedValue({
    version: '1.0.0',
    spdx: { document: {}, package: {}, file: {} },
    cyclonedx: { metadata: {}, component: {} },
  }),
  loadCustomAttributes: jest.fn().mockResolvedValue({
    version: '1.0.0',
    attributes: [],
  }),
}));

describe('App', () => {
  it('renders the SBOM Editor heading', async () => {
    render(<App />);
    await waitFor(() => {
      const heading = screen.getByText(/SBOM Editor/i);
      expect(heading).toBeInTheDocument();
    });
  });

  it('renders the upload button', async () => {
    render(<App />);
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /アップロード/i });
      expect(buttons.length).toBeGreaterThan(0);
      expect(buttons[0]).toBeInTheDocument();
    });
  });
});
