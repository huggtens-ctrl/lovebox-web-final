"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { money } from "@/lib/utils";

export default function ServicesManager() {
  const currentBranchId = typeof window !== 'undefined' ? localStorage.getItem('branch_id') || '1' : '1';
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState("Bò húc / 25000\nMì xào bò / 45000\nBao cao su / 20000");

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').eq('branch_id', currentBranchId).order('name');
    setServices(data || []);
    setLoading(false);
  };

  const handleBulkSubmit = async () => {
    setLoading(true);
    const lines = bulkText.split('\n').map(l => l.trim());
    let count = 0;
    
    for (let line of lines) {
      if (!line || line.startsWith("Bò húc")) continue;
      const parts = line.split('/').map(x => x.trim());
      if (parts.length >= 2) {
        const n = parts[0];
        const p = parseInt(parts[1].replace(/\D/g, '')) || 0;

        // 💡 KIỂM TRA TRÙNG TÊN: NẾU ĐÃ CÓ TRONG NHÁNH NÀY THÌ BỎ QUA
        const { data: exist } = await supabase.from('services').select('id').eq('name', n).eq('branch_id', currentBranchId);
        if (!exist || exist.length === 0) {
          await supabase.from('services').insert([{ name: n, price: p, branch_id: currentBranchId }]);
          count++;
        }
      }
    }
    
    setLoading(false); setShowBulkModal(false); loadServices();
    alert(`✅ Đã thêm ${count} món mới vào Menu của nhánh!`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa món này khỏi Menu?")) return;
    setLoading(true);
    await supabase.from('services').delete().eq('id', id);
    loadServices();
  };

  const handleEditPrice = async (id, oldName, oldPrice) => {
    const newP = window.prompt(`Nhập giá mới cho món [${oldName}]:`, oldPrice);
    if (!newP) return;
    const finalPrice = parseInt(newP.replace(/\D/g, ''));
    if (!finalPrice) return alert("Giá không hợp lệ!");
    
    setLoading(true);
    await supabase.from('services').update({ price: finalPrice }).eq('id', id);
    loadServices();
  };

  return (
    // ĐÃ FIX: Chống tràn toàn khung trang
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] h-full flex flex-col relative min-w-0">
      <h2 className="text-xl md:text-2xl font-bold text-[#2D6A4F] mb-4 md:mb-6 shrink-0">🍔 QUẢN LÝ DỊCH VỤ</h2>
      
      {/* ĐÃ FIX: Nút bấm co giãn trên màn hình bé */}
      <div className="flex mb-4 md:mb-6 shrink-0">
        <button onClick={() => setShowBulkModal(true)} className="w-full sm:w-auto px-6 py-3 md:py-3 bg-[#F57C00] hover:bg-[#E65100] transition-colors text-white font-bold rounded-xl shadow-sm">
          🚀 THÊM HÀNG LOẠT SIÊU TỐC
        </button>
      </div>

      {/* ĐÃ FIX: Bảng bọc thanh trượt ngang, chống vỡ nút bấm */}
      <div className="flex-1 overflow-hidden bg-[#F7FFF9] rounded-xl border border-gray-100 flex flex-col min-w-0">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full min-w-[500px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#EAF7EA] text-[#2D6A4F] z-10 shadow-sm">
              <tr>
                <th className="p-3 text-sm md:text-base whitespace-nowrap">Tên Món</th>
                <th className="p-3 text-sm md:text-base whitespace-nowrap">Giá Bán</th>
                <th className="p-3 w-40 text-center text-sm md:text-base whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {services.map(s => (
                <tr key={s.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-bold text-gray-800 text-sm md:text-base">{s.name}</td>
                  <td className="p-3 font-bold text-red-600 text-base md:text-lg whitespace-nowrap">{money(s.price)}</td>
                  <td className="p-3 text-center">
                    {/* ĐÃ FIX: Đảm bảo 2 nút không rớt dòng */}
                    <div className="flex items-center justify-center space-x-2">
                      <button onClick={() => handleEditPrice(s.id, s.name, s.price)} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-500 hover:text-white transition-colors rounded-lg font-bold text-sm shadow-sm whitespace-nowrap">
                        Sửa Giá
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-colors rounded-lg font-bold text-sm shadow-sm whitespace-nowrap">
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-gray-500 font-medium">Chưa có dịch vụ nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ĐÃ FIX: Popup tự co giãn không tràn màn hình điện thoại */}
      {showBulkModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 md:p-6 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <h3 className="text-lg md:text-xl font-bold text-[#F57C00] mb-1 md:mb-2 shrink-0">🚀 Thêm Dịch Vụ Siêu Tốc</h3>
            <p className="text-xs md:text-sm text-green-800 mb-3 md:mb-4 font-bold shrink-0">Cú pháp: Tên món / Giá tiền</p>
            
            <textarea 
              value={bulkText} 
              onChange={(e) => setBulkText(e.target.value)} 
              className="w-full flex-1 min-h-[150px] p-3 md:p-4 border rounded-xl font-mono outline-none focus:ring-2 focus:ring-[#52B788] text-sm md:text-base shadow-inner resize-none" 
            />
            
            <div className="flex space-x-3 mt-4 md:mt-6 shrink-0">
              <button onClick={() => setShowBulkModal(false)} className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 transition-colors font-bold rounded-xl text-sm md:text-base text-gray-700">Hủy</button>
              <button onClick={handleBulkSubmit} disabled={loading} className="flex-[2] py-3 bg-[#F57C00] hover:bg-[#E65100] transition-colors text-white font-bold rounded-xl shadow-md text-sm md:text-base">
                {loading ? '⏳...' : '💾 LƯU VÀO MENU'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}