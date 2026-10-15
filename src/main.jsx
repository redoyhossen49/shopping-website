import { StrictMode, Suspense, lazy } from "react";
import * as ReactDOM from "react-dom/client";
import "./index.css";

import { createBrowserRouter, RouterProvider } from "react-router-dom";

import MainLayout from "./layout/MainLayout.jsx";
import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";

import RequireAuth from "./components/RequireAuth.jsx";
import RouteFallback from "./components/RouteFallback.jsx";

import MenuProvider from "./components/Context/MenuProvider.jsx";
import { CartProvider } from "./components/Context/CartContext.jsx";
import { ProductsProvider } from "./components/Context/ProductsContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AppConfigProvider } from "./context/AppConfigContext.jsx";

import { AdminAuthProvider } from "./admin/context/AdminAuthContext.jsx";
import { ToastProvider } from "./admin/components/Toast.jsx";
import AdminProtectedRoute from "./admin/components/AdminProtectedRoute.jsx";

// Public pages are split into their own chunks and only downloaded on demand.
const About = lazy(() => import("./pages/About.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const CheckOut = lazy(() => import("./pages/CheckOut.jsx"));
const SingleProductPage = lazy(() => import("./pages/SingleProductPage.jsx"));
const OrderResult = lazy(() => import("./pages/OrderResult.jsx"));
const TrackOrder = lazy(() => import("./pages/TrackOrder.jsx"));

const AccountLayout = lazy(() => import("./pages/account/AccountLayout.jsx"));
const AccountOverview = lazy(() => import("./pages/account/AccountOverview.jsx"));
const AccountOrders = lazy(() => import("./pages/account/AccountOrders.jsx"));
const AccountOrderDetail = lazy(
  () => import("./pages/account/AccountOrderDetail.jsx")
);
const AccountReturns = lazy(() => import("./pages/account/AccountReturns.jsx"));
const AccountAddresses = lazy(
  () => import("./pages/account/AccountAddresses.jsx")
);
const AccountProfile = lazy(() => import("./pages/account/AccountProfile.jsx"));

// Admin pages are a large, rarely used area: keep them out of the main bundle.
const AdminLayout = lazy(() => import("./admin/AdminLayout.jsx"));
const AdminLogin = lazy(() => import("./admin/pages/AdminLogin.jsx"));
const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard.jsx"));
const AdminProducts = lazy(() => import("./admin/pages/AdminProducts.jsx"));
const ProductForm = lazy(() => import("./admin/pages/ProductForm.jsx"));
const AdminCategories = lazy(() => import("./admin/pages/AdminCategories.jsx"));
const AdminOrders = lazy(() => import("./admin/pages/AdminOrders.jsx"));
const AdminOrderDetail = lazy(
  () => import("./admin/pages/AdminOrderDetail.jsx")
);
const AdminCustomers = lazy(() => import("./admin/pages/AdminCustomers.jsx"));
const AdminCustomerDetail = lazy(
  () => import("./admin/pages/AdminCustomerDetail.jsx")
);
const AdminInventory = lazy(() => import("./admin/pages/AdminInventory.jsx"));
const AdminAnalytics = lazy(() => import("./admin/pages/AdminAnalytics.jsx"));
const AdminSettings = lazy(() => import("./admin/pages/AdminSettings.jsx"));
const AdminReturns = lazy(() => import("./admin/pages/AdminReturns.jsx"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "products", element: <Products /> },
      { path: "about", element: <About /> },
      { path: "contact", element: <Contact /> },
      { path: "cart", element: <Cart /> },
      { path: "register", element: <Register /> },
      { path: "login", element: <Login /> },
      { path: "checkout", element: <CheckOut /> },
      { path: "order/result", element: <OrderResult /> },
      { path: "track-order", element: <TrackOrder /> },
      {
        path: "account",
        element: (
          <RequireAuth>
            <AccountLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <AccountOverview /> },
          { path: "orders", element: <AccountOrders /> },
          { path: "orders/:orderNumber", element: <AccountOrderDetail /> },
          { path: "returns", element: <AccountReturns /> },
          { path: "addresses", element: <AccountAddresses /> },
          { path: "profile", element: <AccountProfile /> },
        ],
      },
      { path: "product/:id", element: <SingleProductPage /> },
    ],
  },

  // Admin authentication (public)
  {
    path: "/admin/login",
    element: <AdminLogin />,
  },

  // Admin dashboard (guarded)
  {
    path: "/admin",
    element: (
      <AdminProtectedRoute>
        <AdminLayout />
      </AdminProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "products", element: <AdminProducts /> },
      { path: "products/new", element: <ProductForm /> },
      { path: "products/:id/edit", element: <ProductForm /> },
      { path: "categories", element: <AdminCategories /> },
      { path: "orders", element: <AdminOrders /> },
      { path: "orders/:id", element: <AdminOrderDetail /> },
      { path: "returns", element: <AdminReturns /> },
      { path: "customers", element: <AdminCustomers /> },
      { path: "customers/:id", element: <AdminCustomerDetail /> },
      { path: "inventory", element: <AdminInventory /> },
      { path: "analytics", element: <AdminAnalytics /> },
      { path: "settings", element: <AdminSettings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MenuProvider>
      <AppConfigProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <ToastProvider>
              <CartProvider>
                <ProductsProvider>
                  <Suspense fallback={<RouteFallback />}>
                    <RouterProvider router={router} />
                  </Suspense>
                </ProductsProvider>
              </CartProvider>
            </ToastProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </AppConfigProvider>
    </MenuProvider>
  </StrictMode>
);
