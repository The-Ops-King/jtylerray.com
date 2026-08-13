import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./themes.css";
import App from "./App";
import Lab from "./Lab";

/** VITE_LAB=1 builds the exploration lab (/brand-1); default is the hero (/new-home) */
const Root = import.meta.env.VITE_LAB ? Lab : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
