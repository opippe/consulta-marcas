import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import faviconUrl from "../../public/55-marcas-brand-kit/brand/icon.png";

document.querySelector<HTMLLinkElement>("#app-favicon")?.setAttribute("href", faviconUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
