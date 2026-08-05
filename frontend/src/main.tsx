
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { analytics } from "./lib/analytics";

analytics.initRouteTracking();

createRoot(document.getElementById("root")!).render(<App />);
  