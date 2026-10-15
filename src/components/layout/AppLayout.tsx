import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import BottomNav from "./BottomNav"

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <div className="min-h-screen md:pl-[236px]">
        <Outlet />
      </div>

      <BottomNav />
    </div>
  )
}