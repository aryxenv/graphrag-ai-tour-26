import type { BrandVariants } from "@fluentui/react-components";
import { FluentProvider, createDarkTheme } from "@fluentui/react-components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

const foundryBrand: BrandVariants = {
  10: "#050208",
  20: "#1a1130",
  30: "#2a1750",
  40: "#371d6b",
  50: "#442387",
  60: "#5129a3",
  70: "#5e30c0",
  80: "#7b53e6",
  90: "#8c66ea",
  100: "#9c7aee",
  110: "#ab8ef1",
  120: "#baa2f4",
  130: "#c9b6f7",
  140: "#d7caf9",
  150: "#e5defc",
  160: "#f2f0fe",
};

const darkTheme = {
  ...createDarkTheme(foundryBrand),
  colorNeutralBackground1: "#151515",
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <FluentProvider theme={darkTheme}>
        <App />
      </FluentProvider>
    </QueryClientProvider>
  </StrictMode>,
);
