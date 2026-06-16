import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import PrivateRoute from './components/PrivateRoute';
import DashboardLayout from './layouts/DashboardLayout';
import PageLoader from './components/PageLoader';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CustomerMenu = lazy(() => import('./pages/CustomerMenu'));
const MenuManagement = lazy(() => import('./pages/MenuManagement'));
const TablesManagement = lazy(() => import('./pages/TablesManagement'));
const InventoryManagement = lazy(() => import('./pages/InventoryManagement'));
const OrdersManagement = lazy(() => import('./pages/OrdersManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Transactions = lazy(() => import('./pages/Transactions'));
const OffersManagement = lazy(() => import('./pages/OffersManagement'));
const LoyaltyManagement = lazy(() => import('./pages/LoyaltyManagement'));
const POS = lazy(() => import('./pages/POS'));

const Unauthorized = () => <div className="h-screen flex items-center justify-center font-light text-2xl tracking-tight text-slate-800">403 - Unauthorized Access</div>;

const App = () => {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Customer Facing Menu */}
              <Route path="/menu" element={<CustomerMenu />} />

              {/* Admin, Manager, Staff Access with Unified Layout */}
              <Route element={<PrivateRoute roles={['admin', 'manager', 'staff']}><DashboardLayout /></PrivateRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/kitchen" element={<OrdersManagement />} />
                
                {/* Manager & Admin Only Routes */}
                <Route element={<PrivateRoute roles={['admin', 'manager']} />}>
                  <Route path="/menu-management" element={<MenuManagement />} />
                  <Route path="/tables" element={<TablesManagement />} />
                  <Route path="/inventory" element={<InventoryManagement />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/offers" element={<OffersManagement />} />
                  <Route path="/loyalty" element={<LoyaltyManagement />} />
                </Route>

                {/* Admin Only Routes */}
                <Route element={<PrivateRoute roles={['admin']} />}>
                  <Route path="/users" element={<UserManagement />} />
                </Route>
              </Route>

              {/* Default Redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;

