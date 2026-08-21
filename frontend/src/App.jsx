import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Contexts
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/common/ProtectedRoute";

// Layouts
import { AuthLayout } from "./components/layout/AuthLayout";
import { AppLayout } from "./components/layout/AppLayout";

// Auth Pages
import { Welcome } from "./pages/auth/Welcome";
import { Login } from "./pages/auth/Login";
import { Signup } from "./pages/auth/Signup";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { ResetPassword } from "./pages/auth/ResetPassword";

// Application Pages
import { Dashboard } from "./pages/Dashboard";
import { Analytics } from "./pages/Analytics";
import { FeedbackExplorer } from "./pages/FeedbackExplorer";
import { FeatureRequests } from "./pages/FeatureRequests";
import { PRDGenerator } from "./pages/PRDGenerator";
import { RoadmapPlanner } from "./pages/RoadmapPlanner";
import { AIChatAssistant } from "./pages/AIChatAssistant";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>

            {/* Default Route */}
            <Route
              path="/"
              element={<Navigate to="/auth/welcome" replace />}
            />

            {/* Authentication Routes */}
            <Route path="/auth" element={<AuthLayout />}>
              <Route path="welcome" element={<Welcome />} />
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
            </Route>

            {/* Protected Application Routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="feedback" element={<FeedbackExplorer />} />
              <Route path="features" element={<FeatureRequests />} />
              <Route path="prd" element={<PRDGenerator />} />
              <Route path="roadmap" element={<RoadmapPlanner />} />
              <Route path="chat" element={<AIChatAssistant />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* 404 Route */}
            <Route
              path="*"
              element={<Navigate to="/auth/welcome" replace />}
            />

          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}