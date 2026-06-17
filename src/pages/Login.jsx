import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user);
        navigate('/');
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="container">
        <motion.div 
          className="auth-card glass-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="auth-header">
            <div className="icon-wrapper">
              <LogIn size={32} />
            </div>
            <h2>เข้าสู่ระบบ</h2>
            <p>ยินดีต้อนรับกลับสู่ระบบตรวจสอบเอกสาร</p>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>อีเมล</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input 
                  type="email" 
                  name="email" 
                  placeholder="name@example.com"
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>รหัสผ่าน</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input 
                  type="password" 
                  name="password" 
                  placeholder="••••••••"
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary full-width" disabled={loading}>
              {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="auth-footer">
            <p>ยังไม่มีบัญชีใช่หรือไม่? <Link to="/register">สมัครสมาชิกที่นี่</Link></p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
