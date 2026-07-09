import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Users, Shield, Trash2, ArrowUpCircle, ArrowDownCircle, Loader2, FileText, CheckCircle, XCircle } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [usersList, setUsersList] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user && user.role === 'admin') {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, statsRes] = await Promise.all([
                fetch('/api/admin/users', { headers: { 'admin-id': user.id } }),
                fetch('/api/admin/stats', { headers: { 'admin-id': user.id } })
            ]);
            
            if (usersRes.ok && statsRes.ok) {
                const usersData = await usersRes.json();
                const statsData = await statsRes.json();
                setUsersList(usersData);
                setStats(statsData);
            } else {
                setError('Failed to fetch data');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (targetUserId, newRole) => {
        if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนสิทธิ์ผู้ใช้นี้เป็น ${newRole}?`)) return;
        
        try {
            const res = await fetch(`/api/admin/users/${targetUserId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'admin-id': user.id
                },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                setUsersList(usersList.map(u => u.id === targetUserId ? { ...u, role: newRole } : u));
            } else {
                alert('ไม่สามารถเปลี่ยนสิทธิ์ได้');
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    const handleDelete = async (targetUserId) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้? (ข้อมูลประวัติทั้งหมดจะถูกลบด้วย)')) return;
        
        try {
            const res = await fetch(`/api/admin/users/${targetUserId}`, {
                method: 'DELETE',
                headers: {
                    'admin-id': user.id
                }
            });
            if (res.ok) {
                setUsersList(usersList.filter(u => u.id !== targetUserId));
                // Refresh stats
                fetchData();
            } else {
                alert('ไม่สามารถลบผู้ใช้ได้');
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    // Access Control: Only admins can view this page
    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="admin-dashboard container">
            <div className="admin-header">
                <h1 className="admin-title">
                    <div className="icon"><Shield size={28} /></div>
                    ระบบจัดการผู้ใช้ (Admin)
                </h1>
            </div>
            
            {stats && (
                <div className="admin-stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <Users size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>จำนวนผู้ใช้ทั้งหมด</h3>
                            <p className="stat-number">{stats.totalUsers}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                            <FileText size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>เอกสารที่ถูกตรวจสอบ</h3>
                            <p className="stat-number">{stats.totalDocs}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            <CheckCircle size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>เอกสารที่ผ่านเกณฑ์</h3>
                            <p className="stat-number">{stats.totalPassed}</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <XCircle size={24} />
                        </div>
                        <div className="stat-content">
                            <h3>เอกสารที่ไม่ผ่านเกณฑ์</h3>
                            <p className="stat-number">{stats.totalFailed}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="admin-card">
                {loading ? (
                    <div className="loading-container">
                        <Loader2 size={40} className="spin-anim" />
                    </div>
                ) : error ? (
                    <div style={{ color: '#ef4444', textAlign: 'center', padding: '2rem' }}>{error}</div>
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>ชื่อผู้ใช้</th>
                                    <th>อีเมล</th>
                                    <th>วันที่สมัคร</th>
                                    <th>สถานะ</th>
                                    <th style={{ textAlign: 'right' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersList.map((u) => (
                                    <tr key={u.id}>
                                        <td>#{u.id}</td>
                                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.name}</td>
                                        <td>{u.email}</td>
                                        <td>{new Date(u.created_at).toLocaleDateString('th-TH')}</td>
                                        <td>
                                            <span className={`role-badge ${u.role}`}>
                                                {u.role === 'admin' ? <Shield size={14} /> : <Users size={14} />}
                                                {u.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {u.role === 'user' ? (
                                                <button 
                                                    className="action-btn" 
                                                    title="เลื่อนขั้นเป็นแอดมิน"
                                                    onClick={() => handleRoleChange(u.id, 'admin')}
                                                >
                                                    <ArrowUpCircle size={20} />
                                                </button>
                                            ) : (
                                                <button 
                                                    className="action-btn" 
                                                    title="ลดขั้นเป็นผู้ใช้ทั่วไป"
                                                    onClick={() => handleRoleChange(u.id, 'user')}
                                                    disabled={u.id === user.id} // Cannot demote self
                                                >
                                                    <ArrowDownCircle size={20} />
                                                </button>
                                            )}
                                            <button 
                                                className="action-btn delete" 
                                                title="ลบบัญชีผู้ใช้"
                                                onClick={() => handleDelete(u.id)}
                                                disabled={u.id === user.id} // Cannot delete self
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {usersList.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                                            ไม่พบข้อมูลผู้ใช้
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
