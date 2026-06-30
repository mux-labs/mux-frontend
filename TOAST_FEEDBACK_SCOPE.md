# Toast Feedback Implementation Scope

## Overview

This document defines the scope for implementing comprehensive toast feedback throughout the Mux Protocol dashboard for Network & Stellar UX improvements. Toast notifications provide real-time visual feedback to users when critical actions occur.

## Goals

1. **Unified Toast System**: Consolidate existing Toast implementations into a single, consistent API
2. **Network Switching Feedback**: Notify users when network changes between Testnet and Mainnet
3. **Stellar Account Feedback**: Provide detailed feedback for wallet creation and account operations
4. **Transaction Feedback**: Show copy, send, and receive operation results
5. **Error Handling**: Display actionable error messages with context
6. **Persistence**: Ensure state persists through navigation and component remounting

## Current State Analysis

### Existing Toast Implementations

1. **`src/components/ui/Toast.tsx`** (Primary)
   - Type: Single-instance toast with auto-dismiss
   - API: `useToast()` hook returning `{ toast, showToast, hideToast }`
   - Variants: success, error, info
   - Features: Auto-dismiss timer (default 3000ms), custom duration
   - Style: Modern dark theme with backdrop blur
   - Usage: Centralized rendering in pages with `<Toast open={} />`

2. **`src/components/ui/toast.tsx`** (Secondary - deprecated)
   - Type: Multi-instance toast container
   - API: `useToast()` hook returning `{ toasts, addToast, dismissToast }`
   - Variants: success, error, info, warning
   - Features: Position control, description field, auto-dismiss, manual dismiss
   - Style: Light/dark theme support with Tailwind
   - Usage: Not currently integrated

### Usage Patterns

- **SpendingLimitsCard**: Manual toast state management with setTimeout
- **WalletsPage**: Uses secondary `useToast` implementation with Toast component
- **Copy operations**: Callbacks trigger toast display

## Scope: Areas for Toast Integration

### 1. Network Switching (HIGH PRIORITY)
**Location**: `src/context/NetworkContext.tsx`, `src/components/layouts/TopNav.tsx`

**Feedback needs**:
- Success: "Switched to Mainnet" / "Switched to Testnet"
- Error: "Failed to switch network" with reason
- Duration: 4000ms (longer to ensure users notice)

### 2. Stellar Account Creation (HIGH PRIORITY)
**Location**: `src/components/wallet/AddWalletModal.tsx`

**Feedback needs**:
- Success: "Account [address] created successfully"
- Error: "Failed to create account: [reason]"
- Info: "Creating Stellar account..." (optional)
- Duration: 5000ms for success, 0 (manual) for errors

### 3. Transaction Operations (MEDIUM PRIORITY)
**Location**: `src/components/wallet/WalletTable.tsx`, `src/components/wallet/SendWalletModal.tsx`, `src/components/wallet/ReceiveWalletModal.tsx`

**Feedback needs**:
- Copy address: "Address copied to clipboard"
- Send: "Transaction sent successfully", "Transfer initiated"
- Receive: "Ready to receive funds"
- Error: Transaction-specific error messages
- Duration: 3000ms standard

### 4. Recovery Operations (MEDIUM PRIORITY)
**Location**: `src/components/recovery/InitiateRecoveryCTA.tsx`

**Feedback needs**:
- Recovery initiated: "Recovery process started"
- Status updates: "Recovery in progress"
- Success: "Account recovered successfully"
- Error: Detailed recovery failure reasons
- Duration: Context-dependent

### 5. API Key Management (LOWER PRIORITY)
**Location**: `src/components/dashboard/ApiKeysTable.tsx`

**Feedback needs**:
- Generate: "API key generated"
- Copy: "API key copied to clipboard"
- Revoke: "API key revoked"
- Error: Operation failures
- Duration: 3000ms

## Design Requirements

### Visual Design
- **Position**: Top-right corner (default), customizable
- **Styling**: Consistent with existing dark theme
- **Icons**: Success (✓), Error (✕), Info (ℹ), Warning (⚠)
- **Animations**: Smooth fade-in/fade-out (300ms)
- **Z-index**: 50 (above modals, below tooltips)

### UX Requirements
- **Non-blocking**: Toasts float above content, don't interrupt workflow
- **Auto-dismiss**: Default 3000ms, longer for important messages
- **Manual dismiss**: Close button always available
- **Stacking**: Multiple toasts stack vertically with 8px gaps
- **Accessibility**: ARIA labels, role="alert", aria-live="assertive"

### Technical Requirements
- **Single instance**: One toast visible at a time (or allow stacking with position control)
- **Contextual**: Show appropriate variant (success/error/info/warning)
- **Detailed messages**: Include titles and descriptions where relevant
- **Error context**: Include error codes or API responses where helpful
- **State persistence**: Survive component remounting and navigation

## Implementation Strategy

### Phase 1: Consolidation
1. Evaluate both Toast implementations
2. Choose primary implementation (recommend: `Toast.tsx` multi-instance)
3. Update `useToast` hook for consistency
4. Update tests and Storybook stories

### Phase 2: Integration
1. Add Toast context/provider for app-wide access
2. Integrate into each target area (network, accounts, transactions, etc.)
3. Wire state management (context, hooks, or services)
4. Add error handling and message formatting

### Phase 3: Testing & Verification
1. Unit tests for each integration point
2. Integration tests for user flows
3. Manual testing across browsers and devices
4. CI verification

## File Structure

```
src/
├── components/ui/
│   ├── Toast.tsx                 # Primary toast component (unified)
│   ├── Toast.stories.tsx         # Storybook stories
│   └── Toast.test.tsx            # Component tests
├── context/
│   ├── ToastContext.tsx          # New: centralized toast state (optional)
│   └── __tests__/
│       └── ToastContext.test.ts
├── hooks/
│   ├── useToast.ts               # Unified hook (updated)
│   └── __tests__/
│       └── useToast.test.ts      # Updated tests
├── services/
│   ├── toastService.ts           # New: service for coordinating toasts
│   └── __tests__/
│       └── toastService.test.ts
└── app/layout.tsx                # Add Toast provider/renderer
```

## Success Criteria

✓ All existing toast functionality preserved
✓ No duplicate toast implementations
✓ Network switching shows toast feedback
✓ Wallet creation shows success/error toasts
✓ Transaction operations provide user feedback
✓ All unit tests pass (≥80% coverage)
✓ All integration tests pass
✓ CI pipeline passes
✓ Documentation complete and accurate

## Out of Scope

- Custom toast animations beyond fade-in/fade-out
- Toast themes (only dark theme required)
- Toast sound notifications
- Webhook integrations for server-sent toasts
- Toast history/archive UI

## References

- Existing Toast tests: `src/__tests__/Toast.test.tsx`, `src/hooks/__tests__/useToast.test.ts`
- Existing Toast stories: `src/components/ui/Toast.stories.tsx`
- Current usage: `src/app/demo/dashboard/wallets/page.tsx`
- Network context: `src/context/NetworkContext.tsx`
- Recovery API: `src/services/recoveryApi.ts`
