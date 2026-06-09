import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/colors_and_type.css";
import "./styles/piano.css";
import "./styles/staff.css";
import "./styles/play.css";
import "./styles/load.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
