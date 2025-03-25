import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer'; // ✅ Import Footer

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import JobSearch from './pages/JobSearch';
import ResumeTool from './pages/ResumeTool';
import ApplicationTracker from './pages/ApplicationTracker';
import SavedJobs from './pages/SavedJobs';

const AppRoutes = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50"> {/* ✅ Added layout classes */}
      <Navbar />

      <div className="flex-grow max-w-7xl mx-auto px-4 py-6"> {/* ✅ This grows to fill space */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <JobSearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume"
            element={
              <ProtectedRoute>
                <ResumeTool />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracker"
            element={
              <ProtectedRoute>
                <ApplicationTracker />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>

      <Footer /> {/* ✅ This stays pinned at the bottom */}
    </div>
  );
};

export default AppRoutes;
