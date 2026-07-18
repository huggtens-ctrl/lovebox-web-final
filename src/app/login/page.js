"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [view, setView] = useState("login"); // login, register, forgot, otp
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // States mới cho Form Đăng Ký
  const [licenseKey, setLicenseKey] = useState("");
  const [branchInput, setBranchInput] = useState("");

  // States cho Vua
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { 
      alert("❌ Lỗi: Sai tài khoản hoặc mật khẩu!"); 
      setLoading(false); 
      return; 
    }

    // 🔥 FIX 1: Thêm chữ 'permissions' vào select() để móc chùm chìa khóa ra
    const { data: userData, error: fetchError } = await supabase.from('app_users').select('role, branch_id, permissions').eq('email', email).single();
    
    if (fetchError || !userData) {
      alert("❌ LỖI PHÂN QUYỀN: Tài khoản này chưa được cấp quyền trong hệ thống!\n👉 Vui lòng liên hệ VUA để được cấp quyền vào bảng app_users.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (userData.role === 'SUPER_ADMIN') {
      const { data: branches } = await supabase.from('app_users').select('branch_id').not('branch_id', 'is', null);
      const uniqueBranches = [...new Set((branches || []).map(b => b.branch_id))];
      setAvailableBranches(uniqueBranches.length > 0 ? uniqueBranches : ["1"]);
      setSelectedBranch(uniqueBranches.length > 0 ? uniqueBranches[0] : "1");
      setIsSuperAdmin(true);
    } else if (userData.branch_id) {
      localStorage.setItem('branch_id', userData.branch_id);
      localStorage.setItem('user_email', email);
      localStorage.setItem('user_role', userData.role);
      
      // 🔥 FIX 2: Nhét chùm chìa khóa vào LocalStorage để thanh Menu đọc được
      localStorage.setItem('user_permissions', JSON.stringify(userData.permissions || {}));
      
      window.location.href = "/dashboard";
    } else {
      alert("❌ CẤM CỬA: Tài khoản chưa được phân công Chi nhánh!"); 
      await supabase.auth.signOut();
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // 🛑 KIỂM TRA MÃ LICENSE KEY TỪ Ô INPUT
    const secretKey = "DAI_HIEP_XIN_DUNG_CHAN"; 
    
    if (licenseKey !== secretKey) {
      alert("❌ SAI MÃ CẤP PHÉP!\nVui lòng liên hệ Zalo 0868200059 để được cấp mã hợp lệ!");
      return; 
    }

    if (!branchInput) {
      alert("❌ Vui lòng nhập mã chi nhánh ngài muốn mở!");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { alert("❌ Lỗi: " + error.message); setLoading(false); return; }
    
    // 🔥 FIX 3: Đổi tên chìa khóa khớp 100% với tên sếp gửi
    const fullManagerPermissions = {
      M_TONGQUAN: true,
      M_SODOPHONG: true,
      M_NHOMPHONG: true,
      M_COMBO: true,
      M_DICHVU: true,
      M_KHACHQUEN: true,
      M_THUCHI: true,
      M_BAOCAO: true,
      M_NHANSU: true
    };

    await supabase.from('app_users').insert([{ 
      email, 
      role: 'MANAGER', 
      branch_id: branchInput.trim().toUpperCase(),
      permissions: fullManagerPermissions // Gắn giáp xịn vào đây!
    }]);

    alert(`✅ Tạo tài khoản Quản lý cho Chi nhánh ${branchInput} thành công! Hãy đăng nhập lại.`);
    
    // Xóa form và quay về đăng nhập
    setLicenseKey("");
    setBranchInput("");
    setView("login"); 
    setLoading(false);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) alert("❌ Lỗi gửi mail: " + error.message);
    else { alert("✅ Đã gửi mã OTP 6 số vào Email của sếp!"); setView("otp"); }
    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
    if (error) { alert("❌ Mã OTP sai hoặc hết hạn!"); setLoading(false); return; }
    
    const { error: updateErr } = await supabase.auth.updateUser({ password: password });
    if (updateErr) alert("❌ Lỗi lưu mật khẩu: " + updateErr.message);
    else { alert("✅ Đổi mật khẩu thành công! Sếp đăng nhập lại nhé."); setView("login"); }
    setLoading(false);
  };

  const handleAdminEnter = () => {
    localStorage.setItem('branch_id', selectedBranch);
    localStorage.setItem('user_email', email);
    localStorage.setItem('user_role', 'SUPER_ADMIN');
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#EAF7EA] p-4 sm:p-8 overflow-y-auto">
      
      <div className="w-full max-w-md my-auto py-6 flex flex-col shrink-0">
        
        <div className="mb-6 md:mb-8 text-center shrink-0">
          <h1 className="text-2xl md:text-3xl font-bold text-[#2D6A4F] mb-2 tracking-tight">🏨 LOVEBOX BILL CLOUD</h1>
          <p className="text-[#5A7C68] text-sm md:text-base font-medium">Hệ thống Quản lý Đa Chi Nhánh</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-[#B7E4C7] overflow-hidden shrink-0">
          {isSuperAdmin ? (
            <div className="p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-[#D97706] text-center mb-6">👑 KÍNH CHÀO VUA!</h2>
              <div>
                <label className="block font-bold text-gray-700 text-sm mb-2 text-center">Chọn Chi nhánh muốn vào</label>
                <select value={selectedBranch} onChange={e=>setSelectedBranch(e.target.value)} className="w-full px-4 py-3 md:py-4 rounded-xl border-2 border-yellow-300 font-bold text-center outline-none focus:ring-4 focus:ring-yellow-100 transition-shadow text-[#D97706] text-lg">
                  {availableBranches.map(b => <option key={b} value={b}>Chi nhánh {b}</option>)}
                </select>
              </div>
              <button onClick={handleAdminEnter} className="w-full py-4 mt-6 bg-[#F59E0B] hover:bg-[#D97706] transition-colors text-white font-bold rounded-xl active:scale-[0.98] shadow-md">
                🚀 VÀO HỆ THỐNG
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex border-b border-[#B7E4C7] bg-gray-50">
                <button onClick={() => setView("login")} className={`flex-1 py-4 text-sm md:text-base font-bold transition-colors ${view === "login" ? "bg-[#2D6A4F] text-white" : "text-[#5A7C68] hover:bg-gray-100"}`}>
                  Đăng nhập
                </button>
                <button onClick={() => setView("register")} className={`flex-1 py-4 text-sm md:text-base font-bold transition-colors ${view === "register" ? "bg-[#2D6A4F] text-white" : "text-[#5A7C68] hover:bg-gray-100"}`}>
                  Tạo tài khoản
                </button>
              </div>

              <div className="p-6 md:p-8 flex-1">
                {view === "login" ? (
                  <form onSubmit={handleLogin} className="flex flex-col h-full">
                    <div className="mb-4">
                      <label className="block font-bold text-gray-700 text-sm mb-2">Email</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner transition-shadow text-base" placeholder="nhanvien@lovebox.com" />
                    </div>
                    <div className="mb-2">
                      <label className="block font-bold text-gray-700 text-sm mb-2">Mật khẩu</label>
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner transition-shadow text-base" placeholder="••••••••" />
                    </div>
                    
                    <div className="text-right mb-6 min-h-[24px]">
                      <button type="button" onClick={()=>setView("forgot")} className="text-[#EF4444] hover:text-[#B71C1C] font-bold text-sm transition-colors">
                        Quên mật khẩu?
                      </button>
                    </div>
                    
                    <button type="submit" disabled={loading} className="w-full py-4 bg-[#2D6A4F] hover:bg-[#18392B] transition-colors text-white font-bold rounded-xl text-base md:text-lg shadow-md active:scale-[0.98] mt-auto">
                      {loading ? "⏳ Đang xử lý..." : "✅ ĐĂNG NHẬP"}
                    </button>
                  </form>
                ) : view === "register" ? (
                  <form onSubmit={handleRegister} className="flex flex-col h-full">
                    <div className="mb-4">
                      <label className="block font-bold text-gray-700 text-sm mb-2">Email</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner transition-shadow text-base" placeholder="nhanvien@lovebox.com" />
                    </div>
                    <div className="mb-4">
                      <label className="block font-bold text-gray-700 text-sm mb-2">Mật khẩu</label>
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner transition-shadow text-base" placeholder="••••••••" />
                    </div>
                    <div className="mb-4">
                      <label className="block font-bold text-gray-700 text-sm mb-2">Mã Cấp Phép (License Key)</label>
                      <input type="password" required value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 shadow-inner transition-shadow text-base bg-yellow-50" placeholder="Nhập mã bí mật..." />
                      <p className="text-xs font-semibold text-[#D97706] mt-1 text-right">💬 Zalo xin mã: 0868200059</p>
                    </div>
                    <div className="mb-6">
                      <label className="block font-bold text-gray-700 text-sm mb-2">Mã Chi Nhánh</label>
                      <input type="text" required value={branchInput} onChange={(e) => setBranchInput(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner transition-shadow text-base uppercase" placeholder="VD: Q1, Q2..." />
                    </div>
                    
                    <button type="submit" disabled={loading} className="w-full py-4 bg-[#2D6A4F] hover:bg-[#18392B] transition-colors text-white font-bold rounded-xl text-base md:text-lg shadow-md active:scale-[0.98] mt-auto">
                      {loading ? "⏳ Đang xử lý..." : "📝 TẠO TÀI KHOẢN QUẢN LÝ"}
                    </button>
                  </form>
                ) : view === "forgot" ? (
                  <form onSubmit={handleSendOTP} className="flex flex-col h-full">
                    <h2 className="text-lg md:text-xl font-bold text-[#EF4444] mb-2 text-center">Lấy lại mật khẩu</h2>
                    <p className="text-sm text-gray-500 mb-6 text-center">Nhập email để nhận mã xác thực (OTP)</p>
                    
                    <div className="mb-6">
                      <label className="block font-bold text-gray-700 text-sm mb-2">Email tài khoản</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-400 shadow-inner transition-shadow text-base" placeholder="nhanvien@lovebox.com" />
                    </div>
                    
                    <div className="mt-auto space-y-3">
                      <button type="submit" disabled={loading} className="w-full py-4 bg-[#F59E0B] hover:bg-[#D97706] transition-colors text-white font-bold rounded-xl shadow-md active:scale-[0.98]">
                        📧 GỬI MÃ OTP
                      </button>
                      <button type="button" onClick={()=>setView("login")} className="w-full py-3 text-gray-500 hover:text-gray-800 hover:bg-gray-100 font-bold rounded-xl transition-colors">
                        Quay lại đăng nhập
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="flex flex-col h-full">
                    <h2 className="text-lg md:text-xl font-bold text-[#2D6A4F] mb-6 text-center">Xác thực OTP</h2>
                    
                    <div className="mb-4">
                      <label className="block font-bold text-gray-700 text-sm mb-2">Mã OTP (6 số từ Email)</label>
                      <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner transition-shadow text-center text-xl tracking-[0.5em] font-mono" placeholder="••••••" maxLength={6} />
                    </div>
                    <div className="mb-8">
                      <label className="block font-bold text-gray-700 text-sm mb-2">Mật khẩu MỚI</label>
                      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner transition-shadow text-base" placeholder="••••••••" />
                    </div>
                    
                    <button type="submit" disabled={loading} className="w-full py-4 bg-[#2D6A4F] hover:bg-[#18392B] transition-colors text-white font-bold rounded-xl shadow-md active:scale-[0.98] mt-auto">
                      {loading ? "⏳ Đang xử lý..." : "💾 ĐỔI MẬT KHẨU"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}