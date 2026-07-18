"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { money } from "@/lib/utils";

export default function CombosManager() {
  const currentBranchId = typeof window !== 'undefined' ? localStorage.getItem('branch_id') || '1' : '1';
  const [types, setTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  const [bulkList, setBulkList] = useState([{ name: "", h: 2, m: 0, price: 150000 }]);

  useEffect(() => { loadTypes(); }, []);
  useEffect(() => { if (selectedTypeId) loadCombos(); }, [selectedTypeId]);

  const loadTypes = async () => {
    const { data } = await supabase.from('room_types').select('*').eq('branch_id', currentBranchId).order('name');
    setTypes(data || []); if (data?.length) setSelectedTypeId(data[0].id);
  };

  const loadCombos = async () => {
    const { data } = await supabase.from('room_combos').select('*').eq('room_type_id', selectedTypeId).eq('is_active', 1).order('hours');
    setCombos(data || []);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa combo này?")) return;
    await supabase.from('room_combos').delete().eq('id', id); loadCombos();
  };

  const addRow = () => setBulkList([...bulkList, { name: "", h: 0, m: 0, price: 0 }]);
  const removeRow = (index) => setBulkList(bulkList.filter((_, i) => i !== index));
  const updateRow = (index, field, val) => {
    const newList = [...bulkList];
    newList[index][field] = val;
    setBulkList(newList);
  };

  const handleBulkSubmit = async () => {
    setLoading(true);
    let count = 0;
    for (let row of bulkList) {
      if (!row.name.trim()) continue;
      await supabase.from('room_combos').insert([{ 
        name: row.name.trim(), hours: parseInt(row.h)||0, minutes: parseInt(row.m)||0, price: parseInt(row.price)||0, 
        is_active: 1, room_type_id: selectedTypeId, branch_id: currentBranchId 
      }]);
      count++;
    }
    setLoading(false); setShowBulkModal(false); loadCombos();
    alert(`✅ Đã thêm ${count} Combo vào hệ thống!`);
    setBulkList([{ name: "", h: 2, m: 0, price: 150000 }]);
  };

  return (
    // ĐÃ FIX: Chống tràn dọc, giới hạn chiều cao tổng
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] h-full flex flex-col relative min-w-0">
      <h2 className="text-xl md:text-2xl font-bold text-[#2D6A4F] mb-4 md:mb-6 shrink-0">💎 QUẢN LÝ COMBO PHÒNG</h2>
      
      {/* ĐÃ FIX: Co giãn khu vực chọn phòng và nút bấm */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 md:mb-6 shrink-0">
        <select value={selectedTypeId || ""} onChange={(e) => setSelectedTypeId(e.target.value)} className="px-4 py-3 border rounded-xl font-bold outline-none focus:ring-2 w-full sm:w-64">
          {types.map(t => <option key={t.id} value={t.id}>Nhóm: {t.name}</option>)}
        </select>
        <button onClick={() => setShowBulkModal(true)} className="px-6 py-3 bg-[#F57C00] hover:bg-[#E65100] transition-colors text-white font-bold rounded-xl w-full sm:w-auto shadow-md">
          🚀 THÊM NHIỀU COMBO
        </button>
      </div>

      {/* ĐÃ FIX: Bọc thanh cuộn ngang, set min-width cho bảng */}
      <div className="flex-1 overflow-hidden bg-[#F7FFF9] rounded-xl border border-gray-100 flex flex-col">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full min-w-[500px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#EAF7EA] text-[#2D6A4F] z-10 shadow-sm">
              <tr>
                <th className="p-3 text-sm md:text-base whitespace-nowrap">Tên Combo</th>
                <th className="p-3 text-sm md:text-base whitespace-nowrap">Thời gian</th>
                <th className="p-3 text-sm md:text-base whitespace-nowrap">Giá tiền</th>
                <th className="p-3 w-20 text-center text-sm md:text-base whitespace-nowrap">Xóa</th>
              </tr>
            </thead>
            <tbody>
              {combos.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-gray-500 font-medium">Chưa có combo nào.</td></tr>
              ) : (
                combos.map(c => (
                  <tr key={c.id} className="border-b hover:bg-white transition-colors">
                    <td className="p-3 font-bold text-gray-800 text-sm md:text-base">{c.name}</td>
                    <td className="p-3 text-gray-700 text-sm md:text-base whitespace-nowrap">{c.hours}h {c.minutes}m</td>
                    <td className="p-3 font-bold text-red-600 text-base md:text-lg whitespace-nowrap">{money(c.price)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleDelete(c.id)} className="px-3 md:px-4 py-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-lg font-bold transition-colors shadow-sm text-sm">
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP THÊM HÀNG LOẠT (ĐÃ FIX CO GIÃN ĐIỆN THOẠI) */}
      {showBulkModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 md:p-6 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
            <h3 className="text-xl md:text-2xl font-bold text-[#F57C00] mb-4 shrink-0">🚀 THÊM COMBO HÀNG LOẠT</h3>
            
            <div className="overflow-y-auto custom-scrollbar pr-1 md:pr-2 space-y-3 flex-1">
              {/* Ẩn tiêu đề cột trên mobile, hiện trên md trở lên */}
              <div className="hidden md:grid grid-cols-12 gap-2 text-center font-bold text-gray-600 text-sm sticky top-0 bg-white z-10 pb-2">
                <div className="col-span-4 text-left pl-2">Tên Combo</div>
                <div className="col-span-2">Số Giờ</div>
                <div className="col-span-2">Số Phút</div>
                <div className="col-span-3 text-right pr-2">Giá (VNĐ)</div>
                <div className="col-span-1"></div>
              </div>
              
              {bulkList.map((row, idx) => (
                <div key={idx} className="flex flex-col md:grid md:grid-cols-12 gap-2 items-start md:items-center bg-gray-50 p-3 md:p-2 rounded-lg border relative">
                  
                  {/* Nút xóa trên mobile dời lên góc trên cùng bên phải */}
                  <button onClick={()=>removeRow(idx)} className="md:hidden absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-2xl w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm border">&times;</button>

                  <div className="w-full md:col-span-4">
                    <label className="text-xs font-bold text-gray-500 mb-1 block md:hidden">Tên Combo</label>
                    <input type="text" placeholder="Combo Đêm..." value={row.name} onChange={e=>updateRow(idx, 'name', e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 font-bold text-sm md:text-base" />
                  </div>
                  
                  <div className="flex w-full md:contents gap-2">
                    <div className="flex-1 md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 mb-1 block md:hidden">Giờ</label>
                      <input type="number" min="0" value={row.h} onChange={e=>updateRow(idx, 'h', e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 text-center font-bold text-blue-700 text-sm md:text-base" />
                    </div>
                    <div className="flex-1 md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 mb-1 block md:hidden">Phút</label>
                      <input type="number" min="0" value={row.m} onChange={e=>updateRow(idx, 'm', e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 text-center font-bold text-green-700 text-sm md:text-base" />
                    </div>
                  </div>

                  <div className="w-full md:col-span-3">
                    <label className="text-xs font-bold text-gray-500 mb-1 block md:hidden">Giá (VNĐ)</label>
                    <input type="number" min="0" value={row.price} onChange={e=>updateRow(idx, 'price', e.target.value)} className="w-full p-2 border rounded-lg outline-none focus:ring-2 md:text-right font-bold text-red-600 text-sm md:text-base" />
                  </div>
                  
                  {/* Nút xóa trên máy tính giữ nguyên */}
                  <div className="hidden md:block col-span-1 text-center">
                    <button onClick={()=>removeRow(idx)} className="text-red-500 hover:text-red-700 font-bold text-2xl bg-white w-8 h-8 rounded-lg border shadow-sm flex items-center justify-center mx-auto">&times;</button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addRow} className="mt-4 px-4 py-3 md:py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 transition-colors shadow-sm shrink-0">
              + Thêm dòng mới
            </button>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-4 pt-4 border-t shrink-0">
              <button onClick={() => setShowBulkModal(false)} className="flex-1 py-3 md:py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors font-bold rounded-xl text-sm md:text-base">❌ Hủy bỏ</button>
              <button onClick={handleBulkSubmit} disabled={loading} className="flex-[2] py-3 md:py-4 bg-[#F57C00] hover:bg-[#E65100] transition-colors text-white font-bold rounded-xl shadow-md text-sm md:text-base">
                {loading ? '⏳ Đang lưu...' : '💾 LƯU TẤT CẢ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}