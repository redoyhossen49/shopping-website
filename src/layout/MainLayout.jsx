
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";
import ScrollToTop from "../components/ScrollToTop";
import Footer from "../components/Footer";
import DemoBanner from "../components/DemoBanner.jsx";

const MainLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white text-slate-900">
      <ScrollToTop />

      <Navbar />

      <DemoBanner />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default MainLayout;
