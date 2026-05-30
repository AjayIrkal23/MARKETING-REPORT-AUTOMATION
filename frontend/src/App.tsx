import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { LoginPage } from "@/pages/LoginPage"
import { HomePage } from "@/pages/HomePage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
