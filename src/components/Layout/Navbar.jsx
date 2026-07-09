import React, { useState, useEffect, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileCheck2, Menu, X, BookOpen, Home, History, LogOut, Shield } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { name: 'หน้าแรก', path: '/', icon: <Home size={18} /> },
    { name: 'ตรวจสอบเอกสาร', path: '/check', icon: <FileCheck2 size={18} /> },
    { name: 'คู่มือและเทมเพลต', path: '/guidelines', icon: <BookOpen size={18} /> },
  ];

  if (user) {
    navLinks.push({ name: 'ประวัติการใช้งาน', path: '/history', icon: <History size={18} /> });
    if (user.role === 'admin') {
      navLinks.push({ name: 'จัดการผู้ใช้', path: '/admin', icon: <Shield size={18} /> });
    }
  }

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">
            <FileCheck2 size={24} color="white" />
          </div>
          <span className="logo-text">Check <span className="logo-subtext">documents</span></span>
        </Link>

        {/* Desktop Menu */}
        <div className="desktop-menu">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
              <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '20px', color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: 600 }}>
                {user.name}
              </div>
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 0.5rem', display: 'flex', alignItems: 'center' }} title="ออกจากระบบ">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', marginLeft: '1rem' }}>
              <Link to="/login" className="btn btn-outline" style={{ padding: '0.5rem 1.2rem' }}>เข้าสู่ระบบ</Link>
              <Link to="/register" className="btn btn-primary nav-cta">สมัครสมาชิก</Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
          {user ? (
            <button onClick={handleLogout} className="mobile-link" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-color)' }}>
              <LogOut size={18} /> ออกจากระบบ
            </button>
          ) : (
            <>
              <Link to="/login" className="mobile-link" onClick={() => setIsMobileMenuOpen(false)}>เข้าสู่ระบบ</Link>
              <Link to="/register" className="mobile-link" style={{ color: 'var(--primary-color)' }} onClick={() => setIsMobileMenuOpen(false)}>สมัครสมาชิก</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
