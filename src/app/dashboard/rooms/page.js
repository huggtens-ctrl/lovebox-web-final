"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function RoomsManager() {
  const currentBranchId = typeof window !== 'undefined' ? localStorage.getItem('branch_id') || '1' : '1';
  
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [rooms, setRooms] = useState([]);
  const [bulkText, setBulkText] = useState("Phòng 101\nPhòng 102\nPhòng 201\nPhòng 202");
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    // Kéo 2 bảng độc lập để chống lỗi Khóa ngoại
    const { data: tData } = await supabase.from('room_types').select('*').eq('branch_id', currentBranchId);
    setTypes(tData || []);
    if (tData?.length) setSelectedType(tData[0].id);

    const { data: rData } = await supabase.from('rooms').select('*').eq('branch_id', currentBranchId);
    
    // Tự động ghép Nhóm Phòng vào
    const mappedRooms = (rData || []).map(r => {
      const typeObj = (tData || []).find(t => t.id === r.room_type_id);
      return { ...r, type_name: typeObj ? typeObj.name : "Chưa phân nhóm" };
    });

    const sortedRooms = mappedRooms.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
    setRooms(sortedRooms);
    setLoading(false);
  };

  const handleBulkAdd = async () => {
    if (!selectedType) return alert("Vui lòng chọn nhóm phòng!");
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('Phòng 101'));
    if (lines.length === 0) return alert("Vui lòng nhập tên phòng hợp lệ!");
    
    setLoading(true);
    let count = 0;
    for (let name of lines) {
      await supabase.from('rooms').insert([{ name, room_type_id: selectedType, status: 'TRỐNG', branch_id: currentBranchId }]);
      count++;
    }
    setBulkText("");
    loadData();
    setLoading(false);
    alert(`✅ Đã xây xong ${count} phòng thành công!`);
  };

  const handleDelete = async (id, status) => {
    if (status === 'ĐANG THUÊ') return alert("Phòng đang có khách, không thể xóa!");
    if (!window.confirm("Xóa vĩnh viễn phòng này khỏi hệ thống?")) return;
    
    setLoading(true);
    await supabase.from('rooms').delete().eq('id', id);
    loadData();
  };

  return (
    // ĐÃ FIX: Chống tràn với min-w-0
    <div className="h-full flex flex-col space-y-4 pb-6 min-w-0">
      
      {/* HEADER */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] shadow-sm shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-[#2D6A4F] mb-1 md:mb-2">🚪 QUẢN LÝ SƠ ĐỒ PHÒNG</h2>
        <p className="text-[#5A7C68] text-sm md:text-base">Thêm phòng hàng loạt siêu tốc hoặc xóa các phòng không sử dụng.</p>
      </div>

      {/* ĐÃ FIX: Đổi md:flex-row thành lg:flex-row để nửa màn hình Win hoặc thiết bị nhỏ tự động xếp dọc */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 flex-1 min-h-0">
        
        {/* CỘT TRÁI: FORM XÂY PHÒNG */}
        <div className="w-full lg:w-1/3 bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] h-fit shrink-0 shadow-sm">
          <h3 className="font-bold text-base md:text-lg mb-4 text-[#18392B]">🚀 Thêm Phòng Hàng Loạt</h3>
          
          <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">1. Chọn Nhóm Phòng</label>
          <select value={selectedType} onChange={(e)=>setSelectedType(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] font-bold mb-4 md:mb-6 text-sm md:text-base shadow-inner">
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2">2. Nhập tên phòng (Mỗi phòng 1 dòng)</label>
          <textarea 
            value={bulkText} 
            onChange={(e)=>setBulkText(e.target.value)} 
            className="w-full h-32 md:h-48 p-3 md:p-4 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] text-sm md:text-base shadow-inner resize-none"
          />

          <button onClick={handleBulkAdd} disabled={loading} className="w-full py-3 md:py-4 mt-4 md:mt-6 bg-[#F57C00] hover:bg-[#E65100] transition-colors text-white font-bold rounded-xl shadow-md text-sm md:text-base">
            {loading ? "⏳ Đang xây..." : "💾 XÂY TẤT CẢ PHÒNG NÀY"}
          </button>
        </div>

        {/* CỘT PHẢI: SƠ ĐỒ PHÒNG */}
        <div className="w-full lg:w-2/3 bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] flex flex-col shadow-sm min-w-0 flex-1">
          <h3 className="font-bold text-base md:text-lg mb-4 border-b pb-2 text-[#18392B] shrink-0">📋 Sơ đồ hiện tại {loading && <span className="animate-pulse">⏳</span>}</h3>
          
          <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 md:pr-2">
            {rooms.length === 0 ? (
              <p className="text-center text-gray-500 mt-10 italic text-sm md:text-base font-medium">Chưa có phòng nào. Sếp hãy nhập tên phòng ở cột bên trái nhé!</p>
            ) : (
              // ĐÃ FIX: Lưới tự động co giãn từ 1 cột (Mobile) -> 2 cột (iPad) -> 3 cột (PC)
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {rooms.map(r => (
                  <div key={r.id} className={`p-3 md:p-4 rounded-xl border flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow ${r.status === 'ĐANG THUÊ' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <div>
                      {/* ĐÃ FIX: Bọc truncate để tên phòng cực dài cũng không làm vỡ thẻ */}
                      <p className="font-bold text-base md:text-lg text-gray-800 truncate" title={r.name}>{r.name}</p>
                      <p className="text-xs md:text-sm text-gray-600 truncate" title={r.type_name}>{r.type_name}</p>
                      <p className={`text-xs md:text-sm font-bold mt-1 md:mt-2 ${r.status === 'ĐANG THUÊ' ? 'text-red-600' : 'text-green-600'}`}>{r.status}</p>
                    </div>
                    <button onClick={() => handleDelete(r.id, r.status)} className="mt-3 md:mt-4 w-full py-1.5 md:py-2 bg-white border border-red-200 hover:bg-red-500 hover:border-red-500 hover:text-white text-red-500 rounded-lg text-xs md:text-sm font-bold transition-colors">
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