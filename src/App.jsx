import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Layout/Navbar'
import Footer from './components/Layout/Footer'
import Home from './pages/Home'
import CheckDocument from './pages/CheckDocument'
import Guidelines from './pages/Guidelines'
import Login from './pages/Login'
import Register from './pages/Register'
import History from './pages/History'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/check" element={<CheckDocument />} />
          <Route path="/guidelines" element={<Guidelines />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/history" element={<History />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
