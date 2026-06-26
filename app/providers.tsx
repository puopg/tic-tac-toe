"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type Props = {
  children: React.ReactNode;
};

/**
 * App-root client providers. Owns a single, stable `QueryClient` (created once
 * via `useState`, never per render) shared by every React Query consumer.
 *
 * Defaults mirror the old `usePolling` hook so behaviour is unchanged: no
 * automatic retries (a failed fetch is simply retried on the next poll), and no
 * refetch-on-focus (polling resumes on its own interval). Background polling is
 * already off by React Query's `refetchIntervalInBackground: false` default,
 * matching the hook's "skip while the tab is hidden" behaviour.
 */
const Providers = (props: Props) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );
};

export default Providers;
