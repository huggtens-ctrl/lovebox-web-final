"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CustomersManager() {
  const currentBranchId = typeof window !== 'undefined' ? localStorage.getItem('branch_id') || '1' : '1';
  
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // States cài đặt
  const [pointRate, setPointRate] = useState(200000);
  const [isSavingRate, setIsSavingRate] = useState(false);

  // States UI Drawer & Modal Xả điểm
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [redeemModal, setRedeemModal] = useState({ isOpen: false, points: "", note: "" });
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => { 
    fetchSettingsAndCustomers(); 
  }, []);

  const fetchSettingsAndCustomers = async () => {
    setLoading(true);
    
    // 1. Lấy Cài đặt tỷ lệ điểm của Chi nhánh
    const { data: settings } = await supabase
      .from('branch_loyalty_settings')
      .select('point_rate')
      .eq('branch_id', currentBranchId)
      .single();
    
    const currentRate = settings?.point_rate || 200000;
    setPointRate(currentRate);

    // 2. Lấy Lịch sử Xả điểm
    const { data: redemptions } = await supabase
      .from('customer_redemptions')
      .select('customer_name, points_spent, reward_title, created_at')
      .eq('branch_id', currentBranchId);

    // 3. Lấy Hóa đơn để tính tổng tiền
    const { data: orders } = await supabase
      .from('orders')
      .select('customer_name, id, total_money, created_at') 
      .eq('branch_id', currentBranchId)
      .not('customer_name', 'is', null)
      .not('customer_name', 'eq', '');

    // 4. Nhào nặn dữ liệu
    const custMap = {};
    
    // Đổ dữ liệu Hóa đơn vào trước
    (orders || []).forEach(o => {
      const name = o.customer_name.trim();
      if (!custMap[name]) {
        custMap[name] = { name, count: 0, total_spent: 0, points_used: 0, history: [] };
      }
      custMap[name].count += 1;
      const amount = o.total_money || 0;
      custMap[name].total_spent += amount;
      
      custMap[name].history.push({
        type: 'earn',
        date: new Date(o.created_at).toLocaleString('vi-VN'),
        title: "Hóa đơn #" + o.id,
        amount: `+${amount.toLocaleString("vi-VN")}đ`,
        timestamp: new Date(o.created_at).getTime()
      });
    });

    // Đổ dữ liệu Xả điểm vào
    (redemptions || []).forEach(r => {
      const name = r.customer_name.trim();
      if (custMap[name]) {
        custMap[name].points_used += r.points_spent;
        custMap[name].history.push({
          type: 'redeem',
          date: new Date(r.created_at).toLocaleString('vi-VN'),
          title: `🎁 Đổi quà: ${r.reward_title}`,
          amount: `-${r.points_spent} 💎`,
          timestamp: new Date(r.created_at).getTime()
        });
      }
    });

    // Sắp xếp lịch sử tổng hợp theo thời gian mới nhất
    const arr = Object.values(custMap).map(c => {
      c.history.sort((a, b) => b.timestamp - a.timestamp);
      return c;
    }).sort((a, b) => b.count - a.count);

    setCustomers(arr);
    setLoading(false);
  };

  // 🧮 Hàm tính điểm
  const calculatePoints = (spent, used) => {
    return Math.floor(spent / pointRate) - used;
  };

  // 💾 Hàm lưu cài đặt tỷ lệ
  const handleSavePointRate = async () => {
    setIsSavingRate(true);
    const { error } = await supabase
      .from('branch_loyalty_settings')
      .upsert({ branch_id: currentBranchId, point_rate: pointRate, updated_at: new Date() });
    
    if (error) alert("❌ Lỗi lưu cài đặt!");
    else alert("✅ Đã lưu tỷ lệ quy đổi mới!");
    setIsSavingRate(false);
  };

  // 🎁 Hàm thực hiện Xả điểm
  const handleRedeemPoints = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    const deductPoints = parseInt(redeemModal.points);
    const currentPoints = calculatePoints(selectedCustomer.total_spent, selectedCustomer.points_used);

    if (deductPoints <= 0 || deductPoints > currentPoints) {
      alert(`❌ Số điểm không hợp lệ! Khách chỉ còn tối đa ${currentPoints} điểm.`);
      return;
    }

    setIsRedeeming(true);
    const { error } = await supabase.from('customer_redemptions').insert([{
      branch_id: currentBranchId,
      customer_name: selectedCustomer.name,
      points_spent: deductPoints,
      reward_title: redeemModal.note || "Đổi quà Zalo"
    }]);

    if (error) {
      alert("❌ Lỗi xả điểm: " + error.message);
    } else {
      alert(`✅ Đã xả thành công ${deductPoints} điểm cho bill Zalo!`);
      setRedeemModal({ isOpen: false, points: "", note: "" });
      fetchSettingsAndCustomers(); // Load lại dữ liệu
    }
    setIsRedeeming(false);
  };

  const displayCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full space-y-4 pb-6 min-w-0 relative">
      
      {/* ⚙️ CÀI ĐẶT TỶ LỆ ĐIỂM */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-[#B7E4C7] shadow-sm shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-bold text-[#2D6A4F]">⚙️ Cấu hình Tích Điểm</h3>
          <p className="text-xs text-gray-500">Quy định tỷ lệ đổi tiền ra điểm của Chi nhánh {currentBranchId}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#EAF7EA] px-3 py-2 rounded-xl border border-[#52B788]">
            <input 
              type="number" 
              value={pointRate} 
              onChange={(e) => setPointRate(Number(e.target.value) || 1)}
              className="bg-transparent font-bold text-[#18392B] w-24 outline-none text-right"
            />
            <span className="font-semibold text-[#3E8E63] text-sm ml-2">VNĐ = 1 Điểm</span>
          </div>
          <button 
            onClick={handleSavePointRate} disabled={isSavingRate}
            className="bg-[#2D6A4F] hover:bg-[#18392B] text-white px-4 py-2 rounded-xl font-bold shadow-sm transition-colors text-sm"
          >
            {isSavingRate ? "⏳ Đang lưu..." : "💾 Lưu"}
          </button>
        </div>
      </div>

      {/* TÌM KIẾM KHÁCH QUEN */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] shadow-sm shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-[#2D6A4F] mb-1">📒 DANH SÁCH KHÁCH QUEN</h2>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Nhập Tên/SĐT để tìm..." className="mt-3 w-full p-3 border rounded-xl bg-[#F7FFF9] outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner text-sm md:text-base" />
      </div>
      
      {/* LƯỚI KHÁCH HÀNG */}
      <div className="flex-1 bg-white p-4 rounded-2xl border border-[#B7E4C7] overflow-y-auto custom-scrollbar shadow-sm min-w-0">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500 font-bold animate-pulse text-sm">⏳ Đang lấy dữ liệu từ két sắt...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayCustomers.map((c, i) => (
              <div key={i} onClick={() => setSelectedCustomer(c)} className="p-3 border border-[#B7E4C7] rounded-xl flex justify-between items-center bg-[#F4FFF7] hover:bg-[#EAF7EA] cursor-pointer shadow-sm gap-2">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold text-[#18392B] truncate text-sm" title={c.name}>👤 {c.name}</span>
                  <span className="text-xs font-semibold text-[#D97706] mt-1">{c.total_spent.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs font-bold text-white bg-[#52B788] px-2 py-1 rounded-md shadow-sm mb-1">
                    {calculatePoints(c.total_spent, c.points_used)} 💎
                  </span>
                  <span className="text-[10px] font-bold text-white bg-[#F57C00] px-2 py-1 rounded-md shadow-sm">{c.count} lần</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🗂️ BẢNG TRƯỢT THÔNG TIN & XẢ ĐIỂM */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end transition-opacity backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-in-right">
            
            <div className="bg-[#2D6A4F] p-4 flex justify-between items-center text-white shrink-0">
              <h3 className="text-lg font-bold truncate">👤 {selectedCustomer.name}</h3>
              <button onClick={() => setSelectedCustomer(null)} className="text-white hover:bg-white/20 p-2 rounded-xl text-xl">✕</button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-6 bg-gray-50 custom-scrollbar">
              
              <div className="bg-gradient-to-br from-[#52B788] to-[#2D6A4F] rounded-2xl p-5 text-white shadow-lg text-center relative border border-[#40916C]">
                <p className="text-xs font-semibold opacity-90 mb-1">ĐIỂM TÍCH LŨY CÓ THỂ XÀI</p>
                <p className="text-4xl font-black mb-4">
                  {calculatePoints(selectedCustomer.total_spent, selectedCustomer.points_used)} <span className="text-2xl">💎</span>
                </p>
                <button 
                  onClick={() => setRedeemModal({ ...redeemModal, isOpen: true })}
                  className="w-full bg-white text-[#D97706] hover:bg-yellow-50 py-3 rounded-xl font-black shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>🎁</span> XẢ ĐIỂM (Bill qua Zalo)
                </button>
              </div>

              {/* Form Xả Điểm (Ẩn/Hiện) */}
              {redeemModal.isOpen && (
                <form onSubmit={handleRedeemPoints} className="bg-white p-4 rounded-xl border border-yellow-400 shadow-inner space-y-3">
                  <h4 className="font-bold text-[#D97706] text-sm">🛠️ THỰC HIỆN XẢ ĐIỂM</h4>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Số điểm muốn trừ:</label>
                    <input type="number" required max={calculatePoints(selectedCustomer.total_spent, selectedCustomer.points_used)} value={redeemModal.points} onChange={e=>setRedeemModal({...redeemModal, points: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-yellow-50 outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Ví dụ: 10" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Nội dung đổi quà (Lưu lịch sử):</label>
                    <input type="text" required value={redeemModal.note} onChange={e=>setRedeemModal({...redeemModal, note: e.target.value})} className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-yellow-400" placeholder="VD: Khách book Zalo giảm 50k" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={()=>setRedeemModal({...redeemModal, isOpen: false})} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold text-sm">Hủy</button>
                    <button type="submit" disabled={isRedeeming} className="flex-1 bg-[#D97706] text-white py-2 rounded-lg font-bold text-sm">{isRedeeming ? "Đang xử lý..." : "Xác nhận Trừ"}</button>
                  </div>
                </form>
              )}

              {/* Lịch sử lưu trú & xả điểm */}
              <div>
                <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-3 text-sm">
                  <span>🕰️</span> Lịch sử Khách hàng
                </h4>
                <div className="space-y-2">
                  {selectedCustomer.history.map((h, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border flex justify-between items-center ${h.type === 'redeem' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
                      <div className="min-w-0 pr-2">
                        <p className={`font-semibold text-sm truncate ${h.type === 'redeem' ? 'text-[#D97706]' : 'text-gray-800'}`}>{h.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{h.date}</p>
                      </div>
                      <p className={`font-bold shrink-0 text-sm ${h.type === 'redeem' ? 'text-red-500' : 'text-[#2D6A4F]'}`}>
                        {h.amount}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}