/** Theme domain contracts for the manual light/dark `ThemeProvider`. */

export type Theme = "light" | "dark"

/** Value exposed by the `ThemeContext`. */
export interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}
