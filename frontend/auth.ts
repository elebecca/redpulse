import NextAuth, { customFetch } from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

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
    authorized: async ({ auth, request }) => {
      const isLoggedIn = !!auth;
      const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

      if (isDashboard) {
        return isLoggedIn;
      }

      return true;
    },
  },
});
