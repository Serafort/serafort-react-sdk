# @serafort/react-sdk

Headless React SDK for embedding Serafort authentication in a third-party app.
No MUI, no styling — session state, background token refresh, and renderless
sign-in/passkey/MFA state machines only. Pair with [`@serafort/react-elements`](../react-elements)
for drop-in styled components, or build your own UI directly on these hooks.

## Quickstart

```tsx
import { SerafortProvider } from '@serafort/react-sdk'

function App() {
  return (
    <SerafortProvider domain="auth.acme.com" publishableKey="pk_live_...">
      <YourApp />
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

## What's included

- `SerafortProvider` — resumes a session from the backend's HttpOnly refresh
  cookie on mount, and proactively refreshes the access token in the
  background ahead of expiry (plus a 401-triggered retry-once on any request,
  same as the internal app's `api.client.ts`).
- `useSession()` / `useUser()` — session status and the current user.
- `useSignIn()` — renderless sign-in state machine: email → SSO-domain
  detection → password or passkey or SSO redirect → optional MFA challenge.
- `useSsoDiscovery()`, `usePasskey()`, `useMfaChallenge()` — the building
  blocks `useSignIn()` composes, also usable standalone.

## Notes on scope

- This SDK calls the same backend endpoints as the internal
  `boilerplate/packages/modules/auth` module, but does not import it or any
  `workspace:*` package — see the comment header in `src/endpoints.ts` for why.
- The `publishableKey` → tenant resolution on the backend is a documented TODO
  (see `SerafortConfig` in `src/types.ts`); today the header is sent
  defensively and the backend still resolves tenant via existing means.
