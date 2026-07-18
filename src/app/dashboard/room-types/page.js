"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function RoomTypesManager() {
  const currentBranchId = typeof window !== 'undefined' ? localStorage.getItem('branch_id') || '1' : '1';
  const [types, setTypes] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTypes(); }, []);

  const loadTypes = async () => {
    setLoading(true);
    const { data } = await supabase.from('room_types').select('*').eq('branch_id', currentBranchId).order('name');
    setTypes(data || []);
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimName = name.trim();
    if (!trimName) return;
    setLoading(true);

    // 💡 TÍNH NĂNG V8: CHỈ KIỂM TRA TRÙNG TÊN TRONG CÙNG 1 CHI NHÁNH
    const { data: exist } = await supabase.from('room_types')
      .select('id').eq('name', trimName).eq('branch_id', currentBranchId);

    if (exist && exist.length > 0) {
      alert("❌ Tên nhóm phòng này đã tồn tại trong chi nhánh của bạn!");
      setLoading(false); return;
    }

    await supabase.from('room_types').insert([{ name: trimName, branch_id: currentBranchId }]);
    setName(""); loadTypes(); setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa nhóm phòng này? (Sẽ không ảnh hưởng nhóm cùng tên ở nhánh khác)")) return;
    setLoading(true);
    await supabase.from('room_types').delete().eq('id', id);
    loadTypes();
  };

  return (
    // ĐÃ FIX: Chống tràn với min-w-0
    <div className="flex flex-col h-full space-y-4 pb-6 min-w-0">
      
      {/* HEADER */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] shadow-sm shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-[#2D6A4F] mb-1 md:mb-2">🏷️ QUẢN LÝ NHÓM PHÒNG</h2>
        <p className="text-[#5A7C68] text-sm md:text-base">Các chi nhánh có thể tạo nhóm phòng trùng tên nhau thoải mái.</p>
      </div>

      {/* ĐÃ FIX: Đổi md:flex-row thành lg:flex-row để xài nửa màn hình Win nó tự xếp dọc cho dễ nhìn */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 flex-1 min-h-0">
        
        {/* CỘT TRÁI: FORM THÊM */}
        <div className="w-full lg:w-1/3 bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] h-fit shrink-0 shadow-sm">
          <h3 className="font-bold text-base md:text-lg mb-4 text-[#18392B]">➕ Thêm Nhóm Phòng Mới</h3>
          <form onSubmit={handleAdd}>
            <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">Tên Nhóm (VD: Phòng Đơn, Phòng Đôi...)</label>
            <input type="text" required value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] mb-4 text-sm md:text-base shadow-inner" />
            <button type="submit" disabled={loading} className="w-full py-3 md:py-4 bg-[#2D6A4F] hover:bg-[#18392B] transition-colors text-white font-bold rounded-xl shadow-md text-sm md:text-base">
              {loading ? "⏳ Đang lưu..." : "💾 LƯU NHÓM PHÒNG"}
            </button>
          </form>
        </div>

        {/* CỘT PHẢI: DANH SÁCH */}
        <div className="w-full lg:w-2/3 bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] flex flex-col shadow-sm min-w-0 flex-1">
          <h3 className="font-bold text-base md:text-lg mb-4 border-b pb-2 text-[#18392B] shrink-0">📋 Danh sách hiện tại {loading && <span className="animate-pulse">⏳</span>}</h3>
          
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 md:pr-2">
            {types.length === 0 ? (
              <p className="text-center text-gray-500 mt-10 italic text-sm md:text-base font-medium">Chi nhánh này chưa có nhóm phòng nào.</p>
            ) : (
              // ĐÃ FIX: Lưới co giãn từ 1 cột (mobile) lên 2 cột (iPad) lên 3 cột (Màn hình lớn)
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {types.map(t => (
                  <div key={t.id} className="p-3 md:p-4 bg-[#F4FFF7] hover:bg-[#EAF7EA] transition-colors border border-[#B7E4C7] rounded-xl flex justify-between items-center shadow-sm gap-2">
                    {/* ĐÃ FIX: Dùng truncate để chữ dài không đẩy nút Xóa rớt dòng */}
                    <span className="font-bold text-sm md:text-base text-[#18392B] truncate flex-1" title={t.name}>
                      🏷️ {t.name}
                    </span>
                    <button onClick={() => handleDelete(t.id)} className="px-3 md:px-4 py-1.5 md:py-2 bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white rounded-lg font-bold transition-colors shadow-sm text-xs md:text-sm shrink-0">
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}