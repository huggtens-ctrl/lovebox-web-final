// src/lib/utils.js

// 1. Hàm format tiền tệ (Ví dụ: 150000 -> 150.000đ)
export function money(value) {
    if (!value || isNaN(value)) return '0đ';
    return parseInt(value).toLocaleString('vi-VN') + 'đ';
}

// 2. Hàm lấy giờ hiện tại chuẩn YYYY-MM-DD HH:MM:SS
export function nowStr() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 19).replace('T', ' ');
    return localISOTime;
}

// 3. Hàm hiển thị giờ ngắn gọn (VD: 14:30 15/08)
export function fmtDt(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${h}:${m} ${day}/${month}`;
}

// 4. Hàm tính Quá giờ hiển thị chữ Đỏ
export function overdueText(expectedTimeStr) {
    if (!expectedTimeStr) return '';
    const expected = new Date(expectedTimeStr);
    const now = new Date();
    
    if (now <= expected) return '';
    
    const diffMins = Math.floor((now - expected) / 60000);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    
    if (h > 0) return `QUÁ GIỜ ${h}g${m < 10 ? '0' + m : m}p`;
    return `QUÁ GIỜ ${m}p`;
}