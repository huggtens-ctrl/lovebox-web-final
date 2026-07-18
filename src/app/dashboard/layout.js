"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const router = useRouter();

  // ⚡ BƯỚC 1: FIX LỖI HYDRATION NEXT.JS BẰNG isMounted
  const [isMounted, setIsMounted] = useState(false);
  
  const [branch, setBranch] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState("");
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchesList, setBranchesList] = useState([]);

  useEffect(() => {
    // ⚡ BƯỚC 2: Hút data ngay khi trang vừa chớp lên
    const currentEmail = localStorage.getItem('user_email');
    const currentRole = localStorage.getItem('user_role');
    
    if (!currentEmail || !currentRole) {
      alert("🛑 CẢNH BÁO: Vui lòng đăng nhập trước!");
      router.replace("/"); 
      return;
    }

    const savedBranch = localStorage.getItem('branch_id');
    setRole(currentRole);
    setEmail(currentEmail);
    setPermissions(localStorage.getItem('user_permissions') || "");

    if (currentRole !== 'SUPER_ADMIN') {
      const b = savedBranch || "1";
      localStorage.setItem('branch_id', b);
      setBranch(b);
    } else {
      if (savedBranch) {
        setBranch(savedBranch);
      } else {
        setIsBranchModalOpen(true);
      }
    }

    // Bật đèn xanh cho giao diện bung ra ngay lập tức
    setIsMounted(true); 

    // ⚡ BƯỚC 3: Máy bay chạy ngầm (Background Sync) - Kiểm tra lại db Supabase mà không khóa màn hình
    const loadDataInBackground = async () => {
      try {
        const { data: userData } = await supabase.from('app_users').select('permissions').eq('email', currentEmail).single();
        if (userData) {
          setPermissions(userData.permissions || "");
          localStorage.setItem('user_permissions', userData.permissions || ""); 
        }
        
        if (currentRole === 'SUPER_ADMIN') {
          const { data: usersData } = await supabase.from('app_users').select('branch_id');
          if (usersData) {
            const uniqueBranchNames = [...new Set(usersData.map(item => item.branch_id).filter(Boolean))];
            setBranchesList(uniqueBranchNames.map(name => ({ id: name, name: name, icon: "🏨" })));
          }
        }
      } catch (err) {
        console.error("Lỗi chạy ngầm:", err);
      }
    };
    
    loadDataInBackground();
  }, [router]);

  const selectBranch = (branchId) => {
    localStorage.setItem('branch_id', branchId);
    setBranch(branchId);
    setIsBranchModalOpen(false); 
    window.location.reload(); 
  };

  const handleLogout = () => {
    localStorage.clear();
    alert("Đăng xuất thành công!");
    router.push("/");
  };

  const menuConfig = [
    {
      title: "🏨 QUẦY LỄ TÂN",
      items: [
        { name: "Tổng quan quầy", icon: "🏠", path: "/dashboard", reqPerm: "M_TONGQUAN" },
        { name: "Quản lý Sơ đồ Phòng", icon: "🚪", path: "/dashboard/rooms", reqPerm: "M_SODOPHONG" },
        { name: "Nhóm phòng", icon: "🏷️", path: "/dashboard/room-types", reqPerm: "M_NHOMPHONG" },
        { name: "Combo phòng", icon: "💎", path: "/dashboard/combos", reqPerm: "M_COMBO" },
        { name: "Dịch vụ", icon: "🍔", path: "/dashboard/services", reqPerm: "M_DICHVU" },
        { name: "Khách quen", icon: "📒", path: "/dashboard/customers", reqPerm: "M_KHACHQUEN" }
      ]
    },
    {
      title: "📊 QUỸ & BÁO CÁO",
      items: [
        { name: "Sổ Thu / Chi", icon: "💸", path: "/dashboard/cashbook", reqPerm: "M_THUCHI" },
        { name: "Thống kê Doanh thu", icon: "📅", path: "/dashboard/reports", reqPerm: "M_BAOCAO" }
      ]
    },
    {
      title: "👑 QUẢN TRỊ",
      items: [
        { name: "Nhân sự & Phân quyền", icon: "👨‍💼", path: "/dashboard/employees", reqPerm: "M_NHANSU" }
      ]
    }
  ];

  // Nếu chưa chớp xong (khoảng 0.001 giây) thì không render để né con mắt của thằng Next.js
  if (!isMounted) return null; 

  return (
    <div className="flex h-screen bg-[#EAF7EA] overflow-hidden font-sans relative">
      
      {isMenuOpen && (
        <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity" />
      )}

      {/* CỘT TRÁI: SIDEBAR (MENU) */}
      <div className={`fixed md:relative inset-y-0 left-0 w-72 bg-[#2D6A4F] text-white flex flex-col shadow-2xl z-50 transform ${isMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="p-4 md:p-6 flex justify-between items-center border-b border-[#40916C]/40 shrink-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-wider">🏨 LOVEBOX BILL</h1>
          <button onClick={() => setIsMenuOpen(false)} className="md:hidden text-white text-2xl focus:outline-none p-1 bg-[#40916C] rounded-lg w-10 h-10 flex items-center justify-center">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
          {menuConfig.map((group, idx) => (
            <div key={idx} className="mb-6">
              <h2 className="text-[#A3E4D7] text-xs md:text-sm font-bold mb-3 pl-2">{group.title}</h2>
              {group.items.map((item, i) => {
                const hasPermission = role === 'SUPER_ADMIN' || (item.reqRole ? role === item.reqRole : permissions.includes(item.reqPerm));

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (!hasPermission) {
                        alert(`🛑 TỪ CHỐI TRUY CẬP!\n\nTài khoản của bạn chưa được cấp quyền vào mục [${item.name}].\n\nVui lòng liên hệ Quản lý để biết thêm chi tiết.`);
                        return;
                      }
                      if (item.path) { router.push(item.path); setIsMenuOpen(false); }
                    }}
                    className={`w-full flex items-center px-4 py-3 mb-2 text-left transition-all font-medium text-sm md:text-base shadow-sm rounded-xl
                      ${hasPermission ? 'bg-[#40916C] hover:bg-[#52B788]' : 'bg-[#2D6A4F] opacity-70 hover:bg-[#347A5A] grayscale-[30%]'}
                    `}
                  >
                    <span className="mr-3 text-lg md:text-base">{item.icon}</span>
                    {item.name}
                    {!hasPermission && <span className="ml-auto text-xs opacity-80" title="Đã khóa">🔒</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-[#40916C] shrink-0">
          <button onClick={handleLogout} className="w-full py-3 bg-[#EF4444] hover:bg-[#B71C1C] rounded-xl font-bold transition-all shadow-md text-sm md:text-base">👋 ĐĂNG XUẤT</button>
        </div>
      </div>

      {/* CỘT PHẢI: NỘI DUNG CHÍNH */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 bg-[#EAF7EA]">
        <div className="flex items-center justify-between bg-[#2D6A4F] text-white px-4 py-3 md:hidden shadow-md shrink-0">
          <span className="font-bold tracking-wider text-lg">🏨 LOVEBOX BILL</span>
          <button onClick={() => setIsMenuOpen(true)} className="p-2 w-10 h-10 flex items-center justify-center bg-[#40916C] hover:bg-[#52B788] rounded-xl text-xl focus:outline-none shadow-sm">☰</button>
        </div>

        <header className="px-4 md:px-8 py-3 md:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#EAF7EA] border-b border-[#B7E4C7]/30 gap-2 shrink-0">
          <div>
            <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-[#2D6A4F] tracking-tight">🏨 HỆ THỐNG LOVEBOX BILL v1.3</h1>
            <div className="text-[#3E8E63] font-semibold mt-1 text-xs md:text-sm break-all flex flex-wrap items-center gap-2">
              
              {role === 'SUPER_ADMIN' ? (
                <div className="flex items-center gap-2">
                  <span className="bg-white border border-[#B7E4C7] px-2.5 py-1 rounded-xl shadow-sm font-bold text-[#2D6A4F]">
                    📍 Cơ sở: {branch || "Chưa chọn"}
                  </span>
                  <button 
                    onClick={() => setIsBranchModalOpen(true)}
                    className="px-3 py-1 bg-[#52B788] hover:bg-[#40916C] text-white font-bold rounded-xl shadow-sm transition-colors text-xs flex items-center gap-1"
                  >
                    🔄 Đổi
                  </button>
                </div>
              ) : (
                <span>Chi nhánh: {branch}</span>
              )}

              <span className="text-gray-400">|</span> 
              <span>Tài khoản {role === 'SUPER_ADMIN' ? 'VUA' : role === 'MANAGER' ? 'QUẢN LÝ' : 'NHÂN VIÊN'}:</span> 
              <span className="font-normal text-gray-700">{email}</span>
            </div>
          </div>
          <div className="text-[#2D6A4F] text-[10px] md:text-[20px] font-bold italic opacity-60 sm:opacity-80 self-start sm:self-center bg-[#B7E4C7]/30 px-3 py-1 rounded-full">
            ✨HUNG2✨
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8 pt-4 md:pt-6 relative">
          {children}
        </main>
      </div>

      {/* 🔥 BẢNG NỔI CHỌN CHI NHÁNH TỰ ĐỘNG LỌC TỪ SUPABASE */}
      {role === 'SUPER_ADMIN' && isBranchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#B7E4C7] shadow-2xl w-full max-w-2xl text-center space-y-6 relative animate-fade-in">
            
            {branch && (
              <button onClick={() => setIsBranchModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl p-1">✕</button>
            )}

            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#2D6A4F] tracking-tight">👑 BỆ HẠ VI HÀNH</h2>
              <p className="text-gray-500 mt-1 text-sm md:text-base">Vui lòng chọn Chi nhánh bệ hạ muốn kiểm tra tình hình vận hành</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto p-2 custom-scrollbar">
              {branchesList.map(b => (
                <button
                  key={b.id}
                  onClick={() => selectBranch(b.id)}
                  className={`p-4 border-2 rounded-2xl transition-all text-left flex flex-col justify-between h-32 shadow-sm hover:shadow-md group
                    ${String(branch) === String(b.id) ? 'bg-[#EAF7EA] border-[#2D6A4F]' : 'bg-[#F7FFF9] border-[#B7E4C7] hover:border-[#2D6A4F]'}
                  `}
                >
                  <span className="text-3xl">{b.icon}</span>
                  <div>
                    <h4 className="font-bold text-[#2D6A4F] text-base group-hover:text-[#18392B] truncate">{b.name}</h4>
                  </div>
                </button>
              ))}

              {branchesList.length === 0 && (
                <p className="col-span-full py-6 text-center font-bold text-gray-400 animate-pulse">⚡ Đang tải nhanh danh sách cơ sở từ vệ tinh...</p>
              )}
            </div>
            
            <div className="pt-3 border-t">
              <button onClick={handleLogout} className="text-xs md:text-sm font-bold text-red-500 hover:text-red-700 transition-colors">👋 Đăng xuất tài khoản Vua</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}