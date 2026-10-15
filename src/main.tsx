import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"

function applySavedTheme() {
  try {
    const saved = localStorage.getItem("diverse_settings")

    if (!saved) {
      document.documentElement.dataset.theme = "light"
      return
    }

    const settings = JSON.parse(saved)

    const theme =
      settings.theme === "dark"
        ? "dark"
        : "light"

    document.documentElement.dataset.theme = theme
  } catch {
    document.documentElement.dataset.theme = "light"
  }
}

/*
 * Aplica o tema antes da aplicação React aparecer.
 */
applySavedTheme()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)