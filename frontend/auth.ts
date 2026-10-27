import NextAuth, { customFetch } from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

// Custom fetch used only by the Keycloak provider.
// Keycloak advertises itself as localhost:8080 for the browser,
// but inside Docker the frontend must reach it using the service name "keycloak".
const keycloakFetch: typeof fetch = (input, init) => {
  const request = input instanceof Request ? input : undefined;
  const url = new URL(request?.url ?? input.toString());

  // Rewrite only server-side Keycloak requests made from inside Docker.
  if (url.hostname === 'localhost' && url.port === '8080') {
    url.hostname = 'keycloak';
  }

  return fetch(request ? new Request(url, request) : url, init);
};

// Configure Auth.js and export the helpers used by the app.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Use Keycloak as the authentication provider.
    Keycloak({
      [customFetch]: keycloakFetch,
    }),
  ],

  callbacks: {
    // Controls access to protected routes.
    authorized: async ({ auth, request }) => {
      const isLoggedIn = !!auth;
      const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

      // Only authenticated users can access dashboard routes.
      if (isDashboard) {
        return isLoggedIn;
      }

      // All other routes remain public.
      return true;
    },

    // Runs when Auth.js creates or updates its JWT.
    // Store the Keycloak access token so it can be used later.
    jwt: async ({ token, account }) => {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      return token;
    },

    // Copies the stored access token into the session object.
    // This makes it available through auth().
    session: async ({ session, token }) => {
      session.accessToken = token.accessToken as string;

      return session;
    },
  },
});
