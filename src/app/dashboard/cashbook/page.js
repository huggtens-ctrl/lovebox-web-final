"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { money } from "@/lib/utils";

export default function CashbookPage() {
  const currentBranchId = typeof window !== 'undefined' ? localStorage.getItem('branch_id') || '1' : '1';

  const [records, setRecords] = useState([]);
  const [type, setType] = useState("THU");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [createdAt, setCreatedAt] = useState(""); 
  const [paymentMethod, setPaymentMethod] = useState("Tiền mặt"); 
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    const { data } = await supabase.from('cashbook')
      .select('*').eq('branch_id', currentBranchId)
      .order('created_at', { ascending: false }).limit(200);
    setRecords(data || []);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let finalTime = new Date().toISOString();
    if (createdAt) {
      const dateObj = new Date(createdAt);
      const offset = dateObj.getTimezoneOffset() * 60000;
      finalTime = (new Date(dateObj - offset)).toISOString().slice(0, 19).replace('T', ' ');
    }
    
    const { error } = await supabase.from('cashbook').insert([{
      type: type, 
      amount: parseInt(amount.replace(/\D/g, '') || 0), 
      reason: reason,
      payment_method: paymentMethod, 
      created_at: finalTime, 
      branch_id: currentBranchId
    }]);
    
    if (error) {
      alert("❌ Lỗi: Có vẻ sếp chưa tạo cột payment_method trên Supabase rồi!");
      console.error(error);
      setLoading(false);
      return;
    }
    
    setAmount(""); setReason(""); setCreatedAt(""); setPaymentMethod("Tiền mặt");
    await loadRecords();
    setLoading(false);
    alert("✅ Đã ghi sổ thành công!");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sếp có chắc chắn muốn xóa phiếu này?")) return;
    setLoading(true);
    await supabase.from('cashbook').delete().eq('id', id);
    await loadRecords();
    setLoading(false);
  };

  return (
    // ĐÃ FIX: Chuyển sang xl:flex-row để nửa màn hình Win hoặc iPad tự động xếp dọc, không bị chèn ép
    <div className="flex flex-col xl:flex-row gap-4 md:gap-6 h-full pb-8">
      
      {/* CỘT TRÁI: FORM TẠO PHIẾU */}
      <div className="w-full xl:w-1/3 bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] h-fit shadow-sm shrink-0">
        <h2 className="text-lg md:text-xl font-bold text-[#2D6A4F] mb-4 md:mb-6">💸 TẠO PHIẾU THU / CHI</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Loại phiếu</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setType("THU")} className={`flex-1 py-3 rounded-xl font-bold transition-colors shadow-sm text-sm md:text-base ${type === "THU" ? "bg-[#2E7D32] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>TẠO PHIẾU THU</button>
              <button type="button" onClick={() => setType("CHI")} className={`flex-1 py-3 rounded-xl font-bold transition-colors shadow-sm text-sm md:text-base ${type === "CHI" ? "bg-[#D32F2F] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>TẠO PHIẾU CHI</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Số tiền</label>
            <input type="text" required value={amount} onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setAmount(val ? parseInt(val).toLocaleString('en-US') : "");
              }} 
              placeholder="VD: 50,000" className="w-full px-4 py-3 border rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Hình thức</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPaymentMethod("Tiền mặt")} className={`flex-1 py-2.5 rounded-xl font-bold border transition-colors shadow-sm text-sm md:text-base ${paymentMethod === "Tiền mặt" ? "bg-[#52B788] text-white border-[#52B788]" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                💵 Tiền mặt
              </button>
              <button type="button" onClick={() => setPaymentMethod("Chuyển khoản")} className={`flex-1 py-2.5 rounded-xl font-bold border transition-colors shadow-sm text-sm md:text-base ${paymentMethod === "Chuyển khoản" ? "bg-[#52B788] text-white border-[#52B788]" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                🏦 Chuyển khoản
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Lý do</label>
            <input type="text" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tiền điện, nước, tạp hóa..." className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner text-sm md:text-base" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Thời gian (Tùy chỉnh)</label>
            <input type="datetime-local" value={createdAt} onChange={(e) => setCreatedAt(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner text-sm md:text-base" />
            <p className="text-xs text-gray-500 mt-1.5 italic">* Để trống hệ thống sẽ tự lấy giờ hiện tại.</p>
          </div>

          <button type="submit" disabled={loading} className={`w-full py-4 mt-2 text-white font-bold rounded-xl text-lg shadow-lg transition-transform active:scale-95 ${type === 'THU' ? 'bg-[#2E7D32] hover:bg-[#1B5E20]' : 'bg-[#D32F2F] hover:bg-[#B71C1C]'}`}>
            {loading ? "⏳ Đang xử lý..." : "💾 LƯU VÀO SỔ"}
          </button>
        </form>
      </div>

      {/* CỘT PHẢI: LỊCH SỬ THU CHI */}
      {/* ĐÃ FIX: Thêm min-w-0 để bảng không phá vỡ layout khi co màn hình */}
      <div className="w-full xl:w-2/3 bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] shadow-sm flex flex-col h-[500px] xl:h-auto overflow-hidden min-w-0">
        <h2 className="text-lg md:text-xl font-bold text-[#18392B] mb-4 border-b pb-2 shrink-0">📒 LỊCH SỬ GIAO DỊCH</h2>
        
        {/* ĐÃ FIX: Chống vỡ với w-full và overflow-x-auto */}
        <div className="w-full overflow-x-auto custom-scrollbar bg-[#F7FFF9] rounded-xl border border-gray-100 flex-1">
          {/* ĐÃ FIX: Đặt min-w-[800px] để bảng luôn rộng rãi, ai dùng màn bé thì cứ kéo thanh trượt */}
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#EAF7EA] text-[#2D6A4F] z-10 shadow-sm">
              <tr>
                <th className="p-3 rounded-tl-lg whitespace-nowrap text-sm md:text-base">Thời gian</th>
                <th className="p-3 whitespace-nowrap text-sm md:text-base">Phân loại</th>
                <th className="p-3 whitespace-nowrap text-sm md:text-base">Số tiền</th>
                <th className="p-3 whitespace-nowrap text-sm md:text-base">Hình thức</th>
                <th className="p-3 min-w-[200px] text-sm md:text-base">Lý do</th>
                <th className="p-3 text-center rounded-tr-lg whitespace-nowrap text-sm md:text-base">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500 font-medium">Chưa có giao dịch nào.</td></tr>
              ) : (
                records.map(r => (
                  <tr key={r.id} className="border-b hover:bg-white transition-colors">
                    <td className="p-3 text-xs md:text-sm text-gray-600 whitespace-nowrap">{r.created_at.substring(0, 16).replace('T', ' ')}</td>
                    <td className={`p-3 font-bold text-sm md:text-base whitespace-nowrap ${r.type === 'THU' ? 'text-[#2E7D32]' : 'text-[#D32F2F]'}`}>
                      {r.type === 'THU' ? '📈 THU' : '📉 CHI'}
                    </td>
                    <td className={`p-3 font-bold text-base md:text-lg whitespace-nowrap ${r.type === 'THU' ? 'text-[#2E7D32]' : 'text-[#D32F2F]'}`}>
                      {money(r.amount)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${r.payment_method === 'Chuyển khoản' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {r.payment_method || 'Tiền mặt'}
                      </span>
                    </td>
                    <td className="p-3 text-sm md:text-base text-gray-800">{r.reason}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleDelete(r.id)} className="px-3 md:px-4 py-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-lg font-bold transition-colors shadow-sm text-sm">
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

    </div>
  );
}