"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { money, overdueText, fmtDt } from "@/lib/utils";
import RoomModal from "@/components/RoomModal";

export default function DashboardScreen() {
  const currentBranchId = typeof window !== 'undefined' ? localStorage.getItem('branch_id') || '1' : '1'; 
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [searchBill, setSearchBill] = useState("");

  const [groups, setGroups] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [summary, setSummary] = useState({ total: 0, cash: 0, transfer: 0, busy: 0, overdue: 0 });
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedRoomAction, setSelectedRoomAction] = useState(null); 

  useEffect(() => {
    fetchDashboardData();

    const roomListener = supabase.channel('rooms-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => { fetchDashboardData(); }).subscribe();
    const orderListener = supabase.channel('orders-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchDashboardData(); }).subscribe();
    return () => { supabase.removeChannel(roomListener); supabase.removeChannel(orderListener); };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: typesData } = await supabase.from('room_types').select('*').eq('branch_id', currentBranchId).order('name');
      setGroups(typesData || []);

      const { data: roomsData } = await supabase.from('rooms').select('*').eq('branch_id', currentBranchId).order('name');
      
      const { data: recentData } = await supabase.from('orders')
        .select('*')
        .eq('branch_id', currentBranchId)
        .eq('status', 'ĐÃ THANH TOÁN') 
        .order('id', { ascending: false })
        .limit(20);
      
      const mappedRecent = (recentData || []).map(inv => {
        const rm = (roomsData || []).find(r => r.id === inv.room_id);
        return { ...inv, room_name: rm ? rm.name : 'Phòng Ẩn' };
      });
      setRecentInvoices(mappedRecent);

      // 🔥 FIX SỐ 1: Ép hệ thống lấy Bill mới nhất
      const { data: activeOrders } = await supabase.from('orders')
        .select('*')
        .eq('branch_id', currentBranchId)
        .eq('status', 'ĐANG THUÊ')
        .order('id', { ascending: false });

      let busyCount = 0;
      let overdueCount = 0;

      const mappedRooms = (roomsData || []).map(room => {
        const typeObj = (typesData || []).find(t => t.id === room.room_type_id);
        const typeName = typeObj ? typeObj.name : "Chưa phân loại";
        const order = (activeOrders || []).find(o => o.room_id === room.id);
        
        let isOverdue = false;
        let customer = "";
        let timeStr = "";
        let total = 0;

        if (order && room.status === 'ĐANG THUÊ') {
          busyCount++;
          customer = order.customer_name || "Khách lẻ";
          timeStr = `${fmtDt(order.checkin_time)} → ${fmtDt(order.expected_checkout_time)}`;
          
          const roomMoney = parseInt(order.combo_price || 0) + parseInt(order.extra_money || 0);
          const serviceMoney = parseInt(order.service_money || 0); 
          const adjMoney = parseInt(order.adjustment_money || 0);
          total = Math.max(0, roomMoney + serviceMoney + adjMoney); 

          const overTxt = overdueText(order.expected_checkout_time);
          if (overTxt) { isOverdue = true; overdueCount++; }
        }
        return { ...room, type_name: typeName, isOverdue, customer, timeStr, total, activeOrder: order };
      });

      setRooms(mappedRooms);

      const today = new Date();
      const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const likePattern = `${localDate}%`;

      const { data: paidOrders } = await supabase.from('orders').select('total_money, cash_amount, transfer_amount').eq('branch_id', currentBranchId).eq('status', 'ĐÃ THANH TOÁN').like('paid_at', likePattern);
      const { data: cashbookData } = await supabase.from('cashbook').select('type, amount').eq('branch_id', currentBranchId).like('created_at', likePattern);

      const tCash = (paidOrders || []).reduce((sum, o) => sum + parseInt(o.cash_amount || 0), 0);
      const tTrans = (paidOrders || []).reduce((sum, o) => sum + parseInt(o.transfer_amount || 0), 0);
      const tBill = (paidOrders || []).reduce((sum, o) => sum + parseInt(o.total_money || 0), 0);
      const tThu = (cashbookData || []).filter(c => c.type === 'THU').reduce((sum, c) => sum + parseInt(c.amount || 0), 0);
      const tChi = (cashbookData || []).filter(c => c.type === 'CHI').reduce((sum, c) => sum + parseInt(c.amount || 0), 0);

      setSummary({ 
        total: tBill + tThu - tChi, 
        cash: tCash + tThu - tChi, 
        transfer: tTrans, 
        busy: busyCount, 
        overdue: overdueCount 
      });
      setLoading(false);

    } catch (error) {
      console.error("Lỗi rút dữ liệu Supabase:", error);
    }
  };

  const getStatusColor = (status, isOverdue) => {
    if (status === "ĐANG THUÊ") return isOverdue ? "bg-[#FEE2E2] border-[#EF4444]" : "bg-[#FFE7E7] border-[#EF4444]";
    if (status === "DỌN PHÒNG") return "bg-[#FFF5CC] border-[#F59E0B]";
    return "bg-[#E7FBEF] border-[#2D6A4F]"; 
  };
  
  const getStatusText = (status, isOverdue) => {
    if (status === "ĐANG THUÊ") return isOverdue ? "text-[#EF4444]" : "text-[#EF4444]";
    if (status === "DỌN PHÒNG") return "text-[#F59E0B]";
    return "text-[#2D6A4F]";
  };

  const displayRooms = selectedGroup ? rooms.filter(r => r.room_type_id === selectedGroup) : rooms;

  // 🔥 THUẬT TOÁN MÁY HÚT BỤI TỰ ĐỘNG
  const handleCleanGhosts = async () => {
    if (!window.confirm("🧹 BẮT ĐẦU DỌN RÁC?\nHệ thống sẽ tự động quét và đánh dấu 'HỦY' các bill bị kẹt do lỗi bấm đúp. Doanh thu hoàn toàn không bị ảnh hưởng. Sếp có chắc chắn?")) return;
    
    setLoading(true);
    try {
      const { data: allRooms } = await supabase.from('rooms').select('id, status').eq('branch_id', currentBranchId);
      const { data: activeOrders } = await supabase.from('orders')
        .select('id, room_id')
        .eq('branch_id', currentBranchId)
        .eq('status', 'ĐANG THUÊ')
        .order('id', { ascending: false });

      let ghostCount = 0;

      for (const room of allRooms) {
        const ordersForRoom = activeOrders.filter(o => o.room_id === room.id);
        
        if (ordersForRoom.length === 0) continue;

        if (room.status !== 'ĐANG THUÊ') {
          for (const ghost of ordersForRoom) {
            await supabase.from('orders').update({ status: 'HỦY (LỖI KẸT)' }).eq('id', ghost.id);
            ghostCount++;
          }
        } else {
          for (let i = 1; i < ordersForRoom.length; i++) {
            await supabase.from('orders').update({ status: 'HỦY (LỖI KẸT)' }).eq('id', ordersForRoom[i].id);
            ghostCount++;
          }
        }
      }

      alert(`✅ QUÉT THÀNH CÔNG!\nHệ thống đã dọn sạch ${ghostCount} bill bóng ma.`);
      fetchDashboardData(); 
    } catch (error) {
      alert("Lỗi khi dọn rác: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4 min-w-0">
      
      {/* 5 Ô TỔNG QUAN */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 shrink-0">
        {[
          { title: "Tổng doanh thu ròng", icon: "💰", val: money(summary.total) },
          { title: "Tiền mặt", icon: "💵", val: money(summary.cash) },
          { title: "Chuyển khoản", icon: "🏦", val: money(summary.transfer) },
          { title: "Đang thuê", icon: "🛏️", val: summary.busy },
          { title: "Quá giờ", icon: "⏰", val: summary.overdue }
        ].map((item, idx) => (
          <div key={idx} className={`bg-white p-3 md:p-4 rounded-2xl border border-[#B7E4C7] shadow-sm flex flex-col justify-center min-w-0 ${idx === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
            <p className="text-[#5A7C68] text-xs md:text-sm font-medium mb-1 truncate">{item.icon} {item.title}</p>
            <p className="text-[#2D6A4F] text-lg md:text-xl lg:text-2xl font-bold truncate">{item.val}</p>
          </div>
        ))}
      </div>

      {/* KHUNG 3 CỘT */}
      <div className="flex-1 flex flex-col xl:grid xl:grid-cols-12 gap-4 xl:overflow-hidden pb-8 xl:pb-0 min-w-0">
        
        {/* CỘT 1: NHÓM PHÒNG */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-[#B7E4C7] flex flex-col shrink-0 xl:overflow-hidden shadow-sm min-w-0">
          <h2 className="text-base md:text-lg font-bold text-[#2D6A4F] p-3 md:p-4 pb-2 border-b xl:border-none shrink-0">🏷️ Nhóm phòng</h2>
          <div className="flex flex-row xl:flex-col overflow-x-auto xl:overflow-y-auto p-3 gap-2 custom-scrollbar bg-[#F7FFF9] flex-1">
            <button onClick={() => setSelectedGroup(null)} className={`whitespace-nowrap xl:w-full text-left px-4 py-2 md:py-3 rounded-xl font-bold border transition-colors shadow-sm text-sm md:text-base ${!selectedGroup ? "bg-[#52B788] text-white border-[#52B788]" : "bg-white text-[#18392B] border-[#B7E4C7] hover:bg-[#EAF7EA]"}`}>
              🏨 Tất cả phòng
            </button>
            {groups.map(g => (
              <button key={g.id} onClick={() => setSelectedGroup(g.id)} className={`whitespace-nowrap xl:w-full text-left px-4 py-2 md:py-3 rounded-xl font-medium border transition-colors shadow-sm text-sm md:text-base ${selectedGroup === g.id ? "bg-[#52B788] text-white border-[#52B788] font-bold" : "bg-white text-[#18392B] border-[#B7E4C7] hover:bg-[#EAF7EA]"}`}>
                🏷️ {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* CỘT 2: SƠ ĐỒ PHÒNG */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-[#B7E4C7] flex flex-col shrink-0 xl:overflow-hidden min-h-[400px] xl:min-h-0 shadow-sm min-w-0 flex-1">
          <h2 className="text-base md:text-lg font-bold text-[#2D6A4F] p-3 md:p-4 pb-2 border-b shrink-0 flex items-center">
            🏠 Sơ đồ phòng {loading && <span className="text-sm font-normal text-yellow-600 animate-pulse ml-2">⏳ Đang tải...</span>}
          </h2>
          <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-[#F7FFF9] custom-scrollbar min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-3 md:gap-4">
              {displayRooms.map(room => (
                <div key={room.id} className={`p-3 md:p-4 rounded-2xl border ${getStatusColor(room.status, room.isOverdue)} shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between min-h-[11rem] xl:h-48 min-w-0`}>
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-[#18392B] truncate" title={room.name}>
                      {room.status === "ĐANG THUÊ" ? "🔴" : room.status === "DỌN PHÒNG" ? "🧹" : "🟢"} {room.name}
                    </h3>
                    <p className="text-xs md:text-sm text-[#5A7C68] truncate" title={room.type_name}>{room.type_name}</p>
                    <p className={`text-sm md:text-base font-bold mt-1 ${getStatusText(room.status, room.isOverdue)} truncate`}>
                      {room.isOverdue ? "QUÁ GIỜ" : room.status}
                    </p>
                    {room.status === "ĐANG THUÊ" && (
                      <div className="mt-2 text-xs md:text-sm text-[#18392B] leading-tight space-y-0.5 min-w-0">
                        <p className="truncate" title={room.customer}>👤 {room.customer}</p>
                        <p className="truncate" title={room.timeStr}>🕒 {room.timeStr}</p>
                        <p className="font-bold mt-1 text-red-600 truncate" title={money(room.total)}>💰 {money(room.total)}</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setSelectedRoomAction(room)} className="mt-3 w-full py-2 md:py-2.5 bg-[#2D6A4F] hover:bg-[#18392B] text-white rounded-xl font-bold transition-colors text-sm md:text-base shadow-sm shrink-0">
                    ⚙️ Thao tác
                  </button>
                </div>
              ))}
              {displayRooms.length === 0 && !loading && (
                 <div className="col-span-full flex items-center justify-center p-10 text-gray-400 font-medium italic">Không có phòng nào trong nhóm này.</div>
              )}
            </div>
          </div>
        </div>

        {/* CỘT 3: HÓA ĐƠN MỚI */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-[#B7E4C7] flex flex-col shrink-0 xl:overflow-hidden min-h-[300px] xl:min-h-0 shadow-sm min-w-0">
          
          <div className="p-3 md:p-4 pb-2 shrink-0 flex justify-between items-center border-b border-gray-100">
            <h2 className="text-base md:text-lg font-bold text-[#2D6A4F]">🧾 Hóa đơn gần nhất</h2>
            
            {/* 🔥 NÚT DỌN RÁC THẦN THÁNH */}
            <button 
              onClick={handleCleanGhosts} 
              disabled={loading}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold rounded-lg text-xs md:text-sm transition-colors flex items-center gap-1 shadow-sm border border-red-100"
            >
              🧹 Dọn Rác
            </button>
          </div>

          <div className="px-3 md:px-4 pb-2 mt-2 flex space-x-2 shrink-0">
            <input type="text" value={searchBill} onChange={(e) => setSearchBill(e.target.value)} placeholder="Nhập mã HĐ..." className="flex-1 px-3 py-2 text-sm md:text-base border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner" />
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-[#F7FFF9] custom-scrollbar space-y-3 min-w-0">
            {recentInvoices.filter(x => x.id.toString().includes(searchBill)).map(inv => (
              <div key={inv.id} className="bg-white p-3 rounded-xl border border-[#B7E4C7] shadow-sm hover:shadow-md transition-shadow min-w-0">
                <p className="font-bold text-[#18392B] truncate text-sm md:text-base" title={`🧾 #${inv.id} - ${inv.room_name}`}>🧾 #{inv.id} - {inv.room_name}</p>
                <p className="text-xs md:text-sm text-[#5A7C68] my-1.5 leading-relaxed min-w-0">
                  <span className="flex items-center gap-1 min-w-0">
                    👤 <span className="truncate flex-1" title={inv.customer_name || 'Khách lẻ'}>{inv.customer_name || 'Khách lẻ'}</span>
                  </span>
                  <span className="font-bold text-red-600 block mt-1">💰 {money(inv.total_money)}</span> 
                  <span className="opacity-80 italic text-xs block mt-0.5 truncate" title={inv.payment_method || inv.status}>{inv.payment_method || inv.status}</span>
                </p>
                
                {/* 🔥 NÚT KHÔI PHỤC BỌC THÉP - TRÁNH LỖI NULL & KẸT TRẠNG THÁI */}
                {inv.status === 'ĐÃ THANH TOÁN' && (
                  <button 
                    disabled={isRestoring}
                    onClick={async () => {
                      if (isRestoring) return;
                      if (!window.confirm("Khôi phục hóa đơn này về trạng thái ĐANG THUÊ?")) return;
                      setIsRestoring(true);
                      try {
                        const { data: latestOrder } = await supabase
                          .from('orders')
                          .select('id')
                          .eq('room_id', inv.room_id)
                          .order('id', { ascending: false })
                          .limit(1)
                          .single();

                        if (latestOrder && latestOrder.id !== inv.id) {
                          alert("🛑 KHÔNG THỂ KHÔI PHỤC!\nPhòng này đã có lượt khách mới thuê (hoặc hóa đơn mới) sau thời điểm tạo hóa đơn này.");
                          setIsRestoring(false);
                          return;
                        }

                        // 🔥 Dùng .select() ép Supabase nôn ra biên lai để xác nhận 100% không bị kẹt data
                        const { error: err1 } = await supabase.from('orders').update({ status: 'ĐANG THUÊ', payment_method: null, cash_amount: 0, transfer_amount: 0, total_money: 0, discount: 0 }).eq('id', inv.id).select();
                        if (err1) throw err1;

                        const { error: err2 } = await supabase.from('rooms').update({ status: 'ĐANG THUÊ' }).eq('id', inv.room_id).select();
                        if (err2) throw err2;
                        
                        fetchDashboardData();
                      } catch(e) { alert("Lỗi khôi phục: " + e.message); }
                      setIsRestoring(false);
                    }} 
                    className={`mt-2 w-full py-1.5 md:py-2 text-white font-bold rounded-lg text-xs md:text-sm transition-colors shadow-sm ${isRestoring ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#F59E0B] hover:bg-[#D97706]'}`}
                  >
                    {isRestoring ? "⏳ Đang khôi phục..." : "🔄 Khôi phục"}
                  </button>
                )}
              </div>
            ))}
            {recentInvoices.length === 0 && !loading && (
              <div className="text-center text-gray-400 italic text-sm mt-4">Chưa có hóa đơn nào.</div>
            )}
          </div>
        </div>

      </div>
      
      {/* 🔥 TRUYỀN LỆNH GỌI NGẦM VÀO ONSUCCESS, CHỐNG F5 TOÀN TRANG */}
      <RoomModal 
        isOpen={!!selectedRoomAction} 
        room={selectedRoomAction} 
        onClose={() => setSelectedRoomAction(null)} 
        onSuccess={() => {
          setSelectedRoomAction(null);
          fetchDashboardData();
        }}
      />
    </div>
  );
}