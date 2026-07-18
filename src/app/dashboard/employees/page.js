"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function EmployeesManager() {
  const currentBranch = typeof window !== 'undefined' ? localStorage.getItem('branch_id') || '1' : '1';
  const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('user_role') || 'STAFF' : 'STAFF';
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') || '' : '';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  
  // 🔥 ĐÃ THÊM: M_NHANSU
  const [perms, setPerms] = useState({ 
    M_TONGQUAN: false, M_SODOPHONG: false, M_NHOMPHONG: false, M_COMBO: false, M_DICHVU: false, M_KHACHQUEN: false,
    M_THUCHI: false, M_BAOCAO: false, M_NHANSU: false 
  });
  
  const [editBranch, setEditBranch] = useState("");

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    let query = supabase.from('app_users').select('*').order('role', { ascending: false }).order('email');
    
    if (currentUserRole !== 'SUPER_ADMIN') {
      query = query.eq('branch_id', currentBranch).neq('role', 'SUPER_ADMIN');
    }
    
    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (currentUserRole === 'STAFF') return alert("Bạn không có quyền thêm nhân sự!");
    const email = window.prompt("Nhập Email nhân viên mới:");
    if (!email) return;
    const pwd = window.prompt("Nhập Mật khẩu (Ít nhất 6 ký tự):");
    if (!pwd) return;

    let targetBranch = currentBranch;
    if (currentUserRole === 'SUPER_ADMIN') {
      const b = window.prompt("Cấp tài khoản này cho Chi nhánh nào?", "1");
      if (b) targetBranch = b;
    }

    try {
      await supabase.auth.signUp({ email, password: pwd });
      await supabase.from('app_users').insert([{ email, role: 'STAFF', branch_id: targetBranch }]);
      alert("✅ Đã tạo nhân viên thành công!");
      loadUsers();
    } catch (e) { alert("Lỗi: " + e.message); }
  };

  const handleDelete = async (id, uRole, uEmail) => {
    if (uEmail === currentUserEmail) return alert("Không thể tự sát!");
    if (currentUserRole !== 'SUPER_ADMIN' && uRole !== 'STAFF') return alert("Quản lý không có quyền xóa Vua hoặc Quản lý khác!");
    if (!window.confirm(`Xóa vĩnh viễn tài khoản: ${uEmail}?`)) return;

    await supabase.from('app_users').delete().eq('id', id);
    loadUsers();
  };

  const openEdit = (user) => {
    if (currentUserRole !== 'SUPER_ADMIN' && user.role !== 'STAFF') return alert("Chỉ được phân quyền cho Lính!");
    setEditUser(user);
    setEditBranch(user.branch_id || "");
    
    const pStr = user.permissions || "";
    setPerms({
      M_TONGQUAN: pStr.includes('M_TONGQUAN'),
      M_SODOPHONG: pStr.includes('M_SODOPHONG'),
      M_NHOMPHONG: pStr.includes('M_NHOMPHONG'),
      M_COMBO: pStr.includes('M_COMBO'),
      M_DICHVU: pStr.includes('M_DICHVU'),
      M_KHACHQUEN: pStr.includes('M_KHACHQUEN'),
      M_THUCHI: pStr.includes('M_THUCHI'),
      M_BAOCAO: pStr.includes('M_BAOCAO'),
      M_NHANSU: pStr.includes('M_NHANSU') // ĐỌC QUYỀN NHÂN SỰ
    });
  };

  const savePermissions = async () => {
    const pArr = [];
    if (perms.M_TONGQUAN) pArr.push('M_TONGQUAN');
    if (perms.M_SODOPHONG) pArr.push('M_SODOPHONG');
    if (perms.M_NHOMPHONG) pArr.push('M_NHOMPHONG');
    if (perms.M_COMBO) pArr.push('M_COMBO');
    if (perms.M_DICHVU) pArr.push('M_DICHVU');
    if (perms.M_KHACHQUEN) pArr.push('M_KHACHQUEN');
    if (perms.M_THUCHI) pArr.push('M_THUCHI');
    if (perms.M_BAOCAO) pArr.push('M_BAOCAO');
    if (perms.M_NHANSU) pArr.push('M_NHANSU'); // LƯU QUYỀN NHÂN SỰ
    
    await supabase.from('app_users').update({ 
      permissions: pArr.join(','),
      branch_id: currentUserRole === 'SUPER_ADMIN' ? editBranch : currentBranch
    }).eq('id', editUser.id);
    
    setEditUser(null); loadUsers(); alert("✅ Phân quyền thành công!");
  };

  if (currentUserRole === 'STAFF') return <div className="p-4 md:p-10 text-center text-red-500 font-bold text-lg md:text-xl">⛔ BẠN KHÔNG CÓ QUYỀN VÀO TRANG NÀY</div>;

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] h-full flex flex-col relative min-w-0">
      <h2 className="text-xl md:text-2xl font-bold text-[#2D6A4F] mb-4 md:mb-6 shrink-0">👨‍💼 QUẢN LÝ NHÂN SỰ & PHÂN QUYỀN</h2>
      
      <div className="flex mb-4 md:mb-6 shrink-0">
        <button onClick={handleCreate} className="w-full sm:w-auto px-6 py-3 md:py-3 bg-[#F57C00] hover:bg-[#E65100] transition-colors text-white font-bold rounded-xl shadow-sm">
          ➕ TẠO TÀI KHOẢN NHÂN VIÊN
        </button>
      </div>

      <div className="flex-1 overflow-hidden bg-[#F7FFF9] rounded-xl border border-gray-100 flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full min-w-[750px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#EAF7EA] text-[#2D6A4F] z-10 shadow-sm">
              <tr>
                <th className="p-3 text-sm md:text-base whitespace-nowrap">Email</th>
                <th className="p-3 text-sm md:text-base whitespace-nowrap">Chức vụ</th>
                <th className="p-3 text-sm md:text-base whitespace-nowrap">Chi nhánh</th>
                <th className="p-3 text-sm md:text-base min-w-[200px]">Quyền thao tác</th>
                <th className="p-3 text-center text-sm md:text-base whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b hover:bg-white transition-colors">
                  <td className="p-3 font-bold text-gray-800 text-sm md:text-base whitespace-nowrap">{u.email}</td>
                  <td className="p-3 font-bold text-sm md:text-base whitespace-nowrap">
                    {u.role === 'SUPER_ADMIN' ? '👑 VUA' : u.role === 'MANAGER' ? '👨‍💼 QUẢN LÝ' : '👤 LÍNH'}
                  </td>
                  <td className="p-3 text-sm md:text-base whitespace-nowrap">{u.branch_id ? `Chi nhánh ${u.branch_id}` : 'Chưa cấp'}</td>
                  <td className="p-3 text-xs md:text-sm text-gray-600 leading-relaxed truncate max-w-[250px]">{u.permissions || 'Chưa cấp quyền'}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => openEdit(u)} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-500 hover:text-white transition-colors rounded-lg font-bold text-sm shadow-sm">
                        Phân Quyền
                      </button>
                      <button onClick={() => handleDelete(u.id, u.role, u.email)} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-colors rounded-lg font-bold text-sm shadow-sm">
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-medium">Chưa có nhân viên nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editUser && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 md:p-6 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[95vh] border border-blue-300">
            <h3 className="text-lg md:text-xl font-bold text-blue-800 border-b pb-2 shrink-0 truncate">⚙️ PHÂN QUYỀN: {editUser.email}</h3>
            
            <div className="overflow-y-auto custom-scrollbar py-2 flex-1 space-y-4">
              {currentUserRole === 'SUPER_ADMIN' ? (
                <div>
                  <label className="font-bold text-sm md:text-base text-gray-700">Chuyển công tác (Mã CN):</label>
                  <input value={editBranch} onChange={e=>setEditBranch(e.target.value)} className="w-full px-4 py-2 border rounded-xl mt-1.5 font-bold outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              ) : ( 
                <p className="text-orange-600 font-bold text-sm md:text-base">Thuộc Chi nhánh: {currentBranch} (Cố định)</p> 
              )}

              <div className="space-y-4">
                
                {/* Nhóm 1 */}
                <div className="bg-[#F7FFF9] p-3 md:p-4 rounded-xl border border-[#B7E4C7]">
                  <h4 className="text-xs md:text-sm font-bold text-[#2D6A4F] mb-3 border-b border-[#B7E4C7] pb-1">🏨 QUẦY LỄ TÂN</h4>
                  <div className="space-y-2.5">
                    {[
                      { state: 'M_TONGQUAN', label: '🏠 Tổng quan quầy' },
                      { state: 'M_SODOPHONG', label: '🚪 Quản lý Sơ đồ Phòng' },
                      { state: 'M_NHOMPHONG', label: '🏷️ Nhóm phòng' },
                      { state: 'M_COMBO', label: '💎 Combo phòng' },
                      { state: 'M_DICHVU', label: '🍔 Dịch vụ' },
                      { state: 'M_KHACHQUEN', label: '📒 Khách quen' },
                    ].map(item => (
                      <label key={item.state} className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" checked={perms[item.state]} onChange={e => setPerms({...perms, [item.state]: e.target.checked})} className="w-5 h-5 md:w-6 md:h-6 accent-[#2D6A4F] rounded cursor-pointer" />
                        <span className="font-bold text-sm md:text-base text-gray-700 select-none">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Nhóm 2 */}
                <div className="bg-blue-50 p-3 md:p-4 rounded-xl border border-blue-200">
                  <h4 className="text-xs md:text-sm font-bold text-blue-700 mb-3 border-b border-blue-200 pb-1">📊 QUỸ & BÁO CÁO</h4>
                  <div className="space-y-2.5">
                    {[
                      { state: 'M_THUCHI', label: '💸 Xem Sổ Thu / Chi' },
                      { state: 'M_BAOCAO', label: '📅 Xem Thống Kê Báo Cáo' }
                    ].map(item => (
                      <label key={item.state} className="flex items-center space-x-3 cursor-pointer">
                        <input type="checkbox" checked={perms[item.state]} onChange={e => setPerms({...perms, [item.state]: e.target.checked})} className="w-5 h-5 md:w-6 md:h-6 accent-blue-600 rounded cursor-pointer" />
                        <span className="font-bold text-sm md:text-base text-gray-700 select-none">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 🔥 NHÓM 3 MỚI: QUẢN TRỊ */}
                <div className="bg-purple-50 p-3 md:p-4 rounded-xl border border-purple-200">
                  <h4 className="text-xs md:text-sm font-bold text-purple-700 mb-3 border-b border-purple-200 pb-1">👑 QUẢN TRỊ</h4>
                  <div className="space-y-2.5">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" checked={perms.M_NHANSU} onChange={e => setPerms({...perms, M_NHANSU: e.target.checked})} className="w-5 h-5 md:w-6 md:h-6 accent-purple-600 rounded cursor-pointer" />
                      <span className="font-bold text-sm md:text-base text-gray-700 select-none">👨‍💼 Nhân sự & Phân quyền</span>
                    </label>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex space-x-3 mt-2 md:mt-4 pt-2 border-t shrink-0">
              <button onClick={()=>setEditUser(null)} className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors font-bold rounded-xl text-sm md:text-base">Hủy</button>
              <button onClick={savePermissions} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold rounded-xl shadow-md text-sm md:text-base">💾 LƯU CẤU HÌNH</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}