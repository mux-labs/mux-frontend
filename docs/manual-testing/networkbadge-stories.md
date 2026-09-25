# Network badge stories

Manual testing guide for the `NetworkBadge` component and its Storybook stories.

## Scope

- Component: `src/components/network-badge.tsx`
- Stories: `src/components/network-badge.stories.tsx`
- Storybook title: `Components/NetworkBadge`

The badge is presentational only. It performs no network calls and exposes no
privileged surfaces.

## Supported states

| Input | Rendered state | Label |
| --- | --- | --- |
| `mainnet`, `public`, `pubnet` | `mainnet` | Mainnet |
| `testnet` | `testnet` | Testnet |
| `futurenet` | `futurenet` | Futurenet |
| anything else / missing / non-string | `unknown` | Unknown network |

## Fail-closed behavior

Unrecognized, empty, or missing network values render the neutral
`Unknown network` badge. The badge never falls back to mainnet styling, so a
misconfigured or spoofed network value cannot be presented as production.

## Manual checklist

1. Run Storybook and open `Components/NetworkBadge`.
2. Verify `Mainnet`, `Testnet`, and `Futurenet` stories show the expected label
   and color.
3. Verify `Unknown` and `Missing` stories show the neutral `Unknown network`
   badge.
4. Verify `AllStates` renders every state side by side without layout issues.
5. Confirm the badge exposes `data-network` and an accessible `aria-label`.

## Notes

- No secrets, tokens, or key material are involved.
- No mainnet-affecting behavior; no feature flag required.
