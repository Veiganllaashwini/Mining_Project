// import React from "react";
// import { createRoot } from "react-dom/client";
// import LoginPage from "./LoginPage.jsx";
// import "./styles.css";

// createRoot(document.getElementById("root")).render(
//   <React.StrictMode>
//     <LoginPage />
//   </React.StrictMode>
// );
import React from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import LoginPage from "./LoginPage.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
    >
      <LoginPage />
    </GoogleOAuthProvider>
  </React.StrictMode>
);