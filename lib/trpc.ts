/**
 * RemoteCtrl – tRPC stub
 * Minimal no-op implementation – the app uses WebSocket directly, 
 * but the layout imports this for forward compatibility.
 */
import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient as createVanillaClient, httpBatchLink } from '@trpc/client';

// Minimal type placeholder
type AppRouter = Record<string, never>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc = createTRPCReact<any>();

export function createTRPCClient() {
  return createVanillaClient<AppRouter>({
    links: [
      httpBatchLink({
        url: 'http://localhost:3000/trpc',
      }),
    ],
  });
}
