import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Users, Shield, Trash2, ArrowUpCircle, ArrowDownCircle, Loader2, FileText, CheckCircle, XCircle, Eye, X } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const [usersList, setUsersList] = useState([]);
    const [stats, setStats] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('users'); // 'users' | 'submissions'
    
    // Modal states
    const [selectedUser, setSelectedUser] = useState(null);
    const [userHistory, setUserHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        if (user && user.role === 'admin') {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, statsRes, subRes] = await Promise.all([
                fetch('/api/admin/users', { headers: { 'admin-id': user.id } }),
                fetch('/api/admin/stats', { headers: { 'admin-id': user.id } }),
                fetch('/api/admin/submissions', { headers: { 'admin-id': user.id } })
            ]);
            
            if (usersRes.ok && statsRes.ok && subRes.ok) {
                const usersData = await usersRes.json();
                const statsData = await statsRes.json();
                const subData = await subRes.json();
                setUsersList(usersData);
                setStats(statsData);
                setSubmissions(subData);
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
                fetchData();
            } else {
                alert('ไม่สามารถลบผู้ใช้ได้');
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    const handleViewHistory = async (targetUser) => {
        setSelectedUser(targetUser);
        setHistoryLoading(true);
        try {
            const res = await fetch(`/api/history?userId=${targetUser.id}`);
            if (res.ok) {
                const data = await res.json();
                setUserHistory(data);
            } else {
                setUserHistory([]);
                alert('ไม่สามารถดึงข้อมูลประวัติได้');
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ');
        } finally {
            setHistoryLoading(false);
        }
    };

    const closeHistoryModal = () => {
        setSelectedUser(null);
        setUserHistory([]);
    };

    if (!user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="admin-dashboard container">
            <div className="admin-header" style={{ display: 'none' }}>
                {/* Hide old header title since mockup looks very clean without big header */}
                <h1 className="admin-title">
                    <div className="icon"><Shield size={28} /></div>
                    ระบบจัดการผู้ใช้ (Admin)
                </h1>
            </div>

            <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button 
                    className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`} 
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={18} /> จัดการผู้ใช้
                </button>
                <button 
                    className={`btn ${activeTab === 'submissions' ? 'btn-primary' : 'btn-outline'}`} 
                    onClick={() => setActiveTab('submissions')}
                >
                    <CheckCircle size={18} /> เอกสารที่ส่งมาแล้ว
                </button>
            </div>
            
            {activeTab === 'users' && stats && (
                <div className="admin-stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
                            <Users size={20} />
                        </div>
                        <div className="stat-content">
                            <h3>จำนวนผู้ใช้ทั้งหมด</h3>
                            <span className="stat-number">{stats.totalUsers ?? 0}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                            <FileText size={20} />
                        </div>
                        <div className="stat-content">
                            <h3>เอกสารที่ถูกตรวจสอบ</h3>
                            <span className="stat-number">{stats.totalDocs ?? 0}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                            <CheckCircle size={20} />
                        </div>
                        <div className="stat-content">
                            <h3>เอกสารที่ผ่านเกณฑ์</h3>
                            <span className="stat-number">{stats.totalPassed ?? 0}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                            <XCircle size={20} />
                        </div>
                        <div className="stat-content">
                            <h3>เอกสารที่ไม่ผ่านเกณฑ์</h3>
                            <span className="stat-number">{stats.totalFailed ?? 0}</span>
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
                ) : activeTab === 'users' ? (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>ชื่อผู้ใช้</th>
                                    <th>อีเมล</th>
                                    <th>วันที่สมัคร</th>
                                    <th style={{ textAlign: 'center' }}>สถานะ</th>
                                    <th style={{ textAlign: 'right' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersList.map((u) => (
                                    <tr key={u.id}>
                                        <td>#{u.id}</td>
                                        <td style={{ fontWeight: 600, color: '#111827' }}>{u.name}</td>
                                        <td style={{ color: '#4b5563' }}>{u.email}</td>
                                        <td style={{ color: '#4b5563' }}>{new Date(u.created_at).toLocaleDateString('th-TH')}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`role-badge ${u.role}`}>
                                                {u.role === 'admin' ? <Shield size={14} /> : <Users size={14} />}
                                                {u.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                className="action-btn inspect-btn" 
                                                title="ดูประวัติการตรวจสอบ"
                                                onClick={() => handleViewHistory(u)}
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {u.role === 'user' ? (
                                                <button 
                                                    className="action-btn promote-btn" 
                                                    title="เลื่อนขั้นเป็นแอดมิน"
                                                    onClick={() => handleRoleChange(u.id, 'admin')}
                                                >
                                                    <ArrowUpCircle size={18} />
                                                </button>
                                            ) : (
                                                <button 
                                                    className="action-btn demote-btn" 
                                                    title="ลดขั้นเป็นผู้ใช้ทั่วไป"
                                                    onClick={() => handleRoleChange(u.id, 'user')}
                                                    disabled={u.id === user.id}
                                                >
                                                    <ArrowDownCircle size={18} />
                                                </button>
                                            )}
                                            <button 
                                                className="action-btn delete-btn" 
                                                title="ลบบัญชีผู้ใช้"
                                                onClick={() => handleDelete(u.id)}
                                                disabled={u.id === user.id}
                                            >
                                                <Trash2 size={18} />
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
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>ชื่อนักศึกษา</th>
                                    <th>ไฟล์ Word อ้างอิง</th>
                                    <th>ไฟล์ PDF ที่ส่ง</th>
                                    <th>วันที่ส่ง</th>
                                    <th style={{ textAlign: 'right' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((s) => (
                                    <tr key={s.id}>
                                        <td>#{s.id}</td>
                                        <td style={{ fontWeight: 600, color: '#111827' }}>
                                            {s.user_name} <br/>
                                            <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal' }}>{s.user_email}</span>
                                        </td>
                                        <td style={{ color: '#4b5563' }}>{s.docx_name}</td>
                                        <td style={{ color: '#10b981', fontWeight: 500 }}>{s.pdf_name}</td>
                                        <td style={{ color: '#4b5563' }}>{new Date(s.created_at).toLocaleString('th-TH')}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <a 
                                                href={`/api/download-pdf/${s.id}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="btn btn-outline"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem' }}
                                            >
                                                <Download size={16} /> โหลด PDF
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                                {submissions.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                                            ยังไม่มีการส่งเอกสาร
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* User History Modal */}
            {selectedUser && (
                <div className="admin-modal-overlay" onClick={closeHistoryModal}>
                    <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={closeHistoryModal}>
                            <X size={24} />
                        </button>
                        <h2 className="admin-modal-title">
                            ประวัติของ {selectedUser.name}
                        </h2>
                        <p className="admin-modal-subtitle">รหัส: #{selectedUser.id} | {selectedUser.email}</p>
                        
                        <div className="admin-modal-body">
                            {historyLoading ? (
                                <div className="loading-container">
                                    <Loader2 size={30} className="spin-anim" />
                                </div>
                            ) : userHistory.length > 0 ? (
                                <div className="history-list">
                                    {userHistory.map(item => (
                                        <div key={item.id} className={`history-item ${item.status}`}>
                                            <div className="history-item-header">
                                                <div className="history-item-title">
                                                    <FileText size={16} />
                                                    <span>{item.file_name}</span>
                                                </div>
                                                <div className={`history-status-badge ${item.status}`}>
                                                    {item.score_percent}% - {item.status === 'success' ? 'ผ่าน' : item.status === 'warning' ? 'แก้ไขบางส่วน' : 'ไม่ผ่าน'}
                                                </div>
                                            </div>
                                            <div className="history-item-date">
                                                ตรวจสอบเมื่อ: {new Date(item.created_at).toLocaleString('th-TH')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-history">
                                    ผู้ใช้นี้ยังไม่มีประวัติการตรวจสอบเอกสาร
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
