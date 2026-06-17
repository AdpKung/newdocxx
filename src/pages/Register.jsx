import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, User, Mail, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import '../pages/Login.css'; // Reusing some base styles from Login

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
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

    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Auto login after register
        login({ id: data.userId, name: formData.name, email: formData.email });
        navigate('/');
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
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
              <UserPlus size={32} />
            </div>
            <h2>สมัครสมาชิก</h2>
            <p>สร้างบัญชีเพื่อบันทึกประวัติการตรวจสอบเอกสาร</p>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>ชื่อ-นามสกุล</label>
              <div className="input-with-icon">
                <User size={18} />
                <input 
                  type="text" 
                  name="name" 
                  placeholder="สมชาย ใจดี"
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

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
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                  minLength="6"
                />
              </div>
            </div>

            <div className="form-group">
              <label>ยืนยันรหัสผ่าน</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input 
                  type="password" 
                  name="confirmPassword" 
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                  required 
                  minLength="6"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary full-width" disabled={loading}>
              {loading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิก'}
            </button>
          </form>

          <div className="auth-footer">
            <p>มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link></p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
