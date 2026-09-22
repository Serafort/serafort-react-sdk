# @serafort/react-elements

Clerk-style drop-in styled components for Serafort authentication:
`<SignIn/>` / `<LoginBox/>`, `<MfaChallenge/>`, and `<UserProfile/>`. Built on
[`@serafort/react-sdk`](../react-sdk)'s headless hooks + MUI v7. Uses theme tokens
throughout — no hardcoded colors.

## Quickstart

```tsx
import { SerafortProvider } from '@serafort/react-sdk'
import { LoginBox } from '@serafort/react-elements'

function App() {
  return (
    <SerafortProvider domain="auth.acme.com" publishableKey="pk_live_...">
      <LoginBox />
    </SerafortProvider>
  )
}
```

```tsx
import { useUser, useSession } from '@serafort/react-sdk'

function AccountMenu() {
  const { user, isLoaded } = useUser()
  const { signOut } = useSession()

  if (!isLoaded) return null
  if (!user) return <a href="/sign-in">Sign in</a>

  return (
    <div>
      {user.email}
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  )
}
```

(`useUser`/`useSession` are re-exported here from `@serafort/react-sdk` for
convenience — install `@serafort/react-sdk` directly if you only need the headless
hooks without any styled UI.)

## Components

- `<SignIn/>` — email → SSO-domain auto-routing → password or passkey →
  MFA challenge. Unstyled container, styled controls.
- `<LoginBox/>` — `<SignIn/>` inside a themed card. The `<LoginBox/>` from the
  plan.
- `<MfaChallenge/>` — standalone MFA entry screen (TOTP / SMS / recovery
  code); also rendered automatically inside `<SignIn/>` when a challenge is
  pending.
- `<UserProfile/>` — self-serve password change, active-session review and
  revocation, TOTP enrollment/disable, and passkey management.
- `<SerafortThemeProvider/>` — optional MUI theme fallback for host apps with
  no MUI setup of their own.

## Theming

Components read colors from the ambient MUI `theme` (`useTheme()`) and use
CSS custom properties with fallbacks for non-palette values (e.g.
`var(--sf-radius-lg, 12px)`) — the same convention the internal auth module's
`AuthSocialButton` uses. They do **not** depend on `@cap/theme`: that package
pulls in `@cap/platform-core`/`@cap/platform-store` (the internal app's
Zustand store, tenant theme resolution, IndexedDB persistence), which a
third-party host app installing this package from npm has no use for. See the
comment header in `src/theme/tokens.ts` for the full rationale.
