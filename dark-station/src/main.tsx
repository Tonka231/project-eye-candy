import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Station from "./Station";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Station />
  </StrictMode>,
);
