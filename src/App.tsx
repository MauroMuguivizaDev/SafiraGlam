import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom"
import AppLayout from "./components/layout/AppLayout"

import Cambio from "./pages/Cambio"
import Dashboard from "./pages/Dashboard"
import Produtos from "./pages/Produtos"
import Stock from "./pages/Stock"
import Vendas from "./pages/Vendas"
import Caixa from "./pages/Caixa"
import Relatorios from "./pages/Relatorios"
import Definicoes from "./pages/Definicoes"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/caixa" element={<Caixa />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/cambio" element={<Cambio />} />
          <Route path="/definicoes" element={<Definicoes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App