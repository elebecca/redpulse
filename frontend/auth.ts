import NextAuth, { customFetch } from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

// Custom fetch used only by the Keycloak provider.
// Keycloak advertises itself as localhost:8080 for the browser,
// but inside Docker the frontend must reach it using the service name "keycloak".
const keycloakFetch: typeof fetch = (input, init) => {
  const request = input instanceof Request ? input : undefined;
  const url = new URL(request?.url ?? input.toString());

  if (url.hostname === 'localhost' && url.port === '8080') {
    url.hostname = 'keycloak';
  }

  return fetch(request ? new Request(url, request) : url, init);
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      [customFetch]: keycloakFetch,
    }),
  ],

  callbacks: {
    // Protect dashboard routes.
    authorized: async ({ auth, request }) => {
      const isLoggedIn = !!auth;
      const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

      if (isDashboard) {
        return isLoggedIn;
      }

      return true;
    },

    // Store and refresh Keycloak tokens.
    jwt: async ({ token, account }) => {
      // First login: save tokens returned by Keycloak.
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at;

        return token;
      }

      // Access token is still valid.
      if (
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires * 1000
      ) {
        return token;
      }

      // We cannot refresh without a refresh token.
      if (!token.refreshToken) {
        return token;
      }

      // Access token expired: ask Keycloak for a new one.
      const response = await keycloakFetch(
        'http://localhost:8080/realms/red-pulse/protocol/openid-connect/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.AUTH_KEYCLOAK_ID!,
            client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken,
          }),
        },
      );

      const refreshedTokens = await response.json();

      // If refresh fails, keep the existing token for now.
      if (!response.ok) {
        return token;
      }

      // Save the newly issued access token and expiry.
      return {
        ...token,
        accessToken: refreshedTokens.access_token,
        accessTokenExpires:
          Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
        refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      };
    },

    // Expose the access token through auth().
    session: async ({ session, token }) => {
      session.accessToken = token.accessToken as string;

      return session;
    },
  },
});
