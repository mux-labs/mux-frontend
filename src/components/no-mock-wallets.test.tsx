import { render, screen } from '@testing-library/react';
import { NoMockWallets } from './NoMockWallets';
import { useWallets } from '@/hooks/useWallets';

jest.mock('@/hooks/useWallets', () => ({
  useWallets: jest.fn(),
}));

const mockedUseWallets = useWallets as jest.MockedFunction<typeof useWallets>;

const mockWallet = { id: 'mock-1', name: 'Mock Wallet', type: 'mock' };
const realWallet = { id: 'real-1', name: 'Real Wallet', type: 'injected' };

function setWallets(wallets: unknown[]) {
  mockedUseWallets.mockReturnValue({ wallets } as ReturnType<typeof useWallets>);
}

describe('NoMockWallets', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  it('renders nothing in a non-production environment even with a mock wallet', () => {
    process.env.NODE_ENV = 'development';
    setWallets([mockWallet]);

    const { container } = render(<NoMockWallets />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/Mock Wallets Blocked/i)).not.toBeInTheDocument();
  });

  it('renders nothing when no wallet has type mock', () => {
    process.env.NODE_ENV = 'production';
    setWallets([realWallet]);

    const { container } = render(<NoMockWallets />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/Mock Wallets Blocked/i)).not.toBeInTheDocument();
  });

  it('renders the blocking overlay in production when a mock wallet exists', () => {
    process.env.NODE_ENV = 'production';
    setWallets([mockWallet]);

    render(<NoMockWallets />);

    expect(screen.getByText(/Mock Wallets Blocked/i)).toBeInTheDocument();
    expect(screen.getByText('Mock Wallet')).toBeInTheDocument();
  });
});
