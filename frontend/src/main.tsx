import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"

import { store } from "@/app/store"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import App from "./App.tsx"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <TooltipProvider delayDuration={200}>
          <App />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
