import {ReactElement} from "react";
import {render, RenderResult} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

import * as time from "../time";

export const setNow = (yyyy: number, m: number, d: number): number => {
  const value: number = Date.UTC(yyyy, m - 1, d, 12) / 1000;
  // Stay on the `jest` global, not `vi`: functions/src/doCron.spec.ts (the
  // Worker's own jest suite, out of scope to edit) imports setNow from this
  // exact file (see PR #54 / #55 — this file's API is load-bearing for the
  // Worker's test build). setupTests.ts shims `globalThis.jest = vi` so this
  // still works under the frontend's vitest suite too.
  jest.spyOn(time, "now").mockReturnValue(value);
  return value;
};


export function r(ui: ReactElement): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 0,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>
    {ui}</QueryClientProvider>);
}

// react-query v5 no longer logs query errors, so there is nothing to mute;
// kept so specs can keep wrapping error-path assertions.
export async function withMutedReactQueryLogger<T>(
    func: () => Promise<T>,
): Promise<T> {
  return func();
}
