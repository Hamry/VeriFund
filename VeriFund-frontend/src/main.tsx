// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Import the CDP React Provider
import { CDPReactProvider } from "@coinbase/cdp-react";

// Get environment variables
const cdpProjectId = import.meta.env.VITE_COINBASE_PROJECT_ID;

if (!cdpProjectId) {
  throw new Error("VITE_COINBASE_PROJECT_ID is not set in .env.local");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CDPReactProvider
      config={{
        projectId: cdpProjectId,

        // Configure Smart Accounts for users
        // Smart Accounts enable gas sponsorship (you pay gas fees for donors)
        ethereum: {
          createOnLogin: "smart", // Create Smart Account on login (instead of regular EOA)
        },

        // App metadata (displayed in wallet UI)
        appName: "VeriFund",
        appLogoUrl: "https://via.placeholder.com/64", // Replace with your logo

        // Authentication methods
        authMethods: ["email"], // Only email OTP for now
      }}
    >
      <App />
    </CDPReactProvider>
  </React.StrictMode>
);
