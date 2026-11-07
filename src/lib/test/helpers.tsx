import {ReactElement} from "react";
import {render, RenderResult} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

import {vi} from "vitest";

import * as time from "../time";
import {noonUtc} from "./fixtures";

// Pins `now()` to noon UTC on the given date.
export const setNow = (yyyy: number, m: number, d: number): number => {
  const value = noonUtc(yyyy, m, d);
  vi.spyOn(time, "now").mockReturnValue(value);
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
