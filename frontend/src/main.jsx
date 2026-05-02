import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { Web3Provider } from "./context/Web3Context";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Web3Provider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "toast-custom",
            duration: 4000,
            style: { background: "#0D0D0F", color: "#F5F3EE" },
            success: { iconTheme: { primary: "#00D4AA", secondary: "#0D0D0F" } },
            error:   { iconTheme: { primary: "#FF5C00", secondary: "#F5F3EE" } },
          }}
        />
      </Web3Provider>
    </BrowserRouter>
  </React.StrictMode>
);
