import React from 'react';
import { Link } from 'react-router-dom';
import { FileCheck2, Globe, MessageCircle, Mail } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-brand">
          <Link to="/" className="navbar-logo">
            <div className="logo-icon">
              <FileCheck2 size={24} color="white" />
            </div>
            <span className="logo-text">Check <span className="logo-subtext">documents</span></span>
          </Link>
          <p className="footer-desc">
            ระบบตรวจสอบมาตรฐานเอกสารโครงการอัตโนมัติ สำหรับนักเรียนระดับ ปวช. และ ปวส. 
            แผนกวิชาคอมพิวเตอร์ธุรกิจ วิทยาลัยเทคนิคประจวบคีรีขันธ์
          </p>
          <div className="social-links">
            <a href="#" className="social-link"><MessageCircle size={20} /></a>
            <a href="#" className="social-link"><Globe size={20} /></a>
            <a href="#" className="social-link"><Mail size={20} /></a>
          </div>
        </div>

        <div className="footer-links">
          <div className="link-group">
            <h4>เมนูหลัก</h4>
            <Link to="/">หน้าแรก</Link>
            <Link to="/check">ตรวจสอบเอกสาร</Link>
            <Link to="/guidelines">คู่มือและเทมเพลต</Link>
          </div>
          
          <div className="link-group">
            <h4>แหล่งข้อมูล</h4>
            <a href="#">ระเบียบการทำโครงการ</a>
            <a href="#">ดาวน์โหลดไฟล์แบบฟอร์ม</a>
            <a href="#">คำถามที่พบบ่อย (FAQ)</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} แผนกวิชาคอมพิวเตอร์ธุรกิจ วิทยาลัยเทคนิคประจวบคีรีขันธ์. สงวนลิขสิทธิ์. พีรพัฒน์</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
