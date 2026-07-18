"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { money } from "@/lib/utils";

const hoursList = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0'));
const minutesList = Array.from({length: 60}, (_, i) => String(i).padStart(2, '0'));

const CustomDateTimePicker = ({ value, onChange, colorClass = "focus:ring-[#5D4037]" }) => {
  const safeValue = value ? value.replace(' ', 'T') : ''; 
  const datePart = safeValue ? safeValue.split('T')[0] : '';
  let timePart = safeValue.includes('T') ? safeValue.split('T')[1] : '00:00';
  timePart = timePart.slice(0, 5); 
  const [hh, mm] = timePart.includes(':') ? timePart.split(':') : ['00', '00'];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1.5">
      <input type="date" value={datePart} onChange={(e) => onChange(`${e.target.value}T${hh}:${mm}`)} className={`w-full sm:flex-1 px-3 py-3 border rounded-xl font-bold outline-none focus:ring-2 ${colorClass} shadow-inner text-sm md:text-base bg-white`} />
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <select value={hh} onChange={(e) => onChange(`${datePart || new Date().toISOString().split('T')[0]}T${e.target.value}:${mm}`)} className={`flex-1 sm:w-auto px-2 py-3 border rounded-xl font-bold outline-none focus:ring-2 ${colorClass} shadow-inner text-sm md:text-base bg-white text-center cursor-pointer`}>
          {hoursList.map(h => <option key={h} value={h}>{h}h</option>)}
        </select>
        <span className="font-bold text-gray-500">:</span>
        <select value={mm} onChange={(e) => onChange(`${datePart || new Date().toISOString().split('T')[0]}T${hh}:${e.target.value}`)} className={`flex-1 sm:w-auto px-2 py-3 border rounded-xl font-bold outline-none focus:ring-2 ${colorClass} shadow-inner text-sm md:text-base bg-white text-center cursor-pointer`}>
          {minutesList.map(m => <option key={m} value={m}>{m}m</option>)}
        </select>
      </div>
    </div>
  );
};

export default function ReportsManager() {
  const currentBranchId = typeof window !== 'undefined' ? localStorage.getItem('branch_id') || '1' : '1';
  
  const [reportType, setReportType] = useState("DAY"); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [search, setSearch] = useState(""); 
  const [orders, setOrders] = useState([]);
  const [cashbooks, setCashbooks] = useState([]);
  const [rooms, setRooms] = useState([]); 
  const [loading, setLoading] = useState(false);
  
  const [editOrder, setEditOrder] = useState(null);
  const [editData, setEditData] = useState({});

  const [editCashbook, setEditCashbook] = useState(null);
  const [editCbData, setEditCbData] = useState({});

  const [viewOrder, setViewOrder] = useState(null);
  const [viewOrderItems, setViewOrderItems] = useState([]);

  const [sortConfig, setSortConfig] = useState({ key: 'time', direction: 'desc' });

  useEffect(() => { fetchReport(); }, [date, month, startDate, endDate, reportType]);

  const fetchReport = async () => {
    setLoading(true);
    const { data: ordData } = await supabase.from('orders').select('*').eq('branch_id', currentBranchId).eq('status', 'ĐÃ THANH TOÁN').order('paid_at', { ascending: false }).limit(3000);
    const { data: cbData } = await supabase.from('cashbook').select('*').eq('branch_id', currentBranchId).order('created_at', { ascending: false }).limit(3000);
    
    const { data: roomsData } = await supabase.from('rooms').select('id, name').eq('branch_id', currentBranchId);
    setRooms(roomsData || []);

    const filterByLocalTime = (utcString) => {
       if(!utcString) return false;
       const d = new Date(utcString);
       const yyyy = d.getFullYear(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0');
       
       if(reportType === "DAY") return `${yyyy}-${mm}-${dd}` === date;
       if(reportType === "MONTH") return `${yyyy}-${mm}` === month;
       if(reportType === "CUSTOM") {
           const start = new Date(startDate); start.setHours(0,0,0,0);
           const end = new Date(endDate); end.setHours(23,59,59,999);
           return d >= start && d <= end;
       }
       return false;
    };

    setOrders((ordData || []).filter(o => filterByLocalTime(o.paid_at)));
    setCashbooks((cbData || []).filter(c => filterByLocalTime(c.created_at)));
    setLoading(false);
  };

  const filteredOrders = orders.filter(o => {
    if (!search) return true; const s = search.toLowerCase();
    const rName = rooms.find(r => r.id === o.room_id)?.name?.toLowerCase() || "";
    return o.customer_name?.toLowerCase().includes(s) || o.id.toString().includes(s) || o.note?.toLowerCase().includes(s) || o.combo_name?.toLowerCase().includes(s) || rName.includes(s);
  });

  const totalBillCash = filteredOrders.reduce((s, o) => s + parseInt(o.cash_amount || 0), 0);
  const totalBillTransfer = filteredOrders.reduce((s, o) => s + parseInt(o.transfer_amount || 0), 0);
  const totalBill = filteredOrders.reduce((s, o) => s + parseInt(o.total_money || 0), 0);

  const totalThuCash = cashbooks.filter(c => c.type === 'THU' && c.payment_method !== 'Chuyển khoản').reduce((s, c) => s + parseInt(c.amount || 0), 0);
  const totalThuTransfer = cashbooks.filter(c => c.type === 'THU' && c.payment_method === 'Chuyển khoản').reduce((s, c) => s + parseInt(c.amount || 0), 0);
  
  const totalChiCash = cashbooks.filter(c => c.type === 'CHI' && c.payment_method !== 'Chuyển khoản').reduce((s, c) => s + parseInt(c.amount || 0), 0);
  const totalChiTransfer = cashbooks.filter(c => c.type === 'CHI' && c.payment_method === 'Chuyển khoản').reduce((s, c) => s + parseInt(c.amount || 0), 0);

  const netCash = totalBillCash + totalThuCash - totalChiCash;
  const netTransfer = totalBillTransfer + totalThuTransfer - totalChiTransfer;
  const netTotal = netCash + netTransfer;
  
  const tongThu = totalBill + totalThuCash + totalThuTransfer;
  const tongChi = totalChiCash + totalChiTransfer;

  const handleCashChange = (val) => {
    const num = parseInt(val.replace(/\D/g, '') || 0);
    if (num <= editOrder.total_money) setEditData({ ...editData, cash: num.toString(), transfer: (editOrder.total_money - num).toString() });
  };
  const handleTransferChange = (val) => {
    const num = parseInt(val.replace(/\D/g, '') || 0);
    if (num <= editOrder.total_money) setEditData({ ...editData, transfer: num.toString(), cash: (editOrder.total_money - num).toString() });
  };

  const handleSaveEdit = async () => {
    try {
      const c = parseInt(editData.cash); const t = parseInt(editData.transfer);
      if (c + t !== editOrder.total_money) return alert(`Lỗi: Tiền mặt + CK phải bằng Tổng tiền: ${money(editOrder.total_money)}`);
      let pm = "CẢ HAI"; if (c === editOrder.total_money) pm = "TIỀN MẶT"; else if (t === editOrder.total_money) pm = "CHUYỂN KHOẢN";
      await supabase.from('orders').update({
        customer_name: editData.name, checkin_time: editData.in.replace('T', ' '), checkout_time: editData.out.replace('T', ' '), paid_at: editData.out.replace('T', ' '),
        cash_amount: c, transfer_amount: t, payment_method: pm, note: editData.note
      }).eq('id', editOrder.id);
      setEditOrder(null); fetchReport(); alert("✅ Sửa hóa đơn thành công!");
    } catch (e) { alert("Lỗi: " + e.message); }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn Hóa đơn #${orderId}?\nHành động này không thể hoàn tác và sẽ trừ lùi doanh thu hiện tại!`)) return;
    setLoading(true);
    try {
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('orders').delete().eq('id', orderId);
      alert("✅ Đã xóa hóa đơn thành công!");
      fetchReport();
    } catch (e) { alert("Lỗi khi xóa hóa đơn: " + e.message); setLoading(false); }
  };

  const handleSaveEditCashbook = async () => {
    try {
      await supabase.from('cashbook').update({
        amount: parseInt(editCbData.amount.replace(/\D/g, '') || 0),
        reason: editCbData.reason,
        payment_method: editCbData.payment_method,
        created_at: editCbData.created_at.replace('T', ' ')
      }).eq('id', editCashbook.id);
      setEditCashbook(null); 
      fetchReport(); 
      alert("✅ Sửa phiếu Thu/Chi thành công!");
    } catch (e) { alert("Lỗi: " + e.message); }
  };

  const handleViewOrderDetails = async (order) => {
    setViewOrder(order);
    setLoading(true);
    try {
      const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      setViewOrderItems(data || []);
    } catch (e) {
      console.error("Lỗi lấy chi tiết:", e);
    }
    setLoading(false);
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const allTransactions = [];
  filteredOrders.forEach(o => allTransactions.push({ time: new Date(o.paid_at).getTime(), type: 'order', data: o }));
  cashbooks.forEach(c => allTransactions.push({ time: new Date(c.created_at).getTime(), type: 'cashbook', data: c }));
  
  allTransactions.sort((a, b) => {
    let valA, valB;
    if (sortConfig.key === 'time') {
      valA = a.time; valB = b.time;
    } else if (sortConfig.key === 'id') {
      valA = a.data.id || 0; valB = b.data.id || 0;
    } else if (sortConfig.key === 'room') {
      const rA = a.type === 'order' ? (rooms.find(r => r.id === a.data.room_id)?.name || '') : '';
      const rB = b.type === 'order' ? (rooms.find(r => r.id === b.data.room_id)?.name || '') : '';
      return sortConfig.direction === 'asc' 
        ? rA.localeCompare(rB, undefined, { numeric: true, sensitivity: 'base' })
        : rB.localeCompare(rA, undefined, { numeric: true, sensitivity: 'base' });
    } else if (sortConfig.key === 'name') {
      valA = (a.type === 'order' ? a.data.customer_name : a.data.reason) || '';
      valB = (b.type === 'order' ? b.data.customer_name : b.data.reason) || '';
      valA = valA.toLowerCase(); valB = valB.toLowerCase();
    } else if (sortConfig.key === 'money') {
      valA = a.type === 'order' ? parseInt(a.data.total_money || 0) : parseInt(a.data.amount || 0);
      valB = b.type === 'order' ? parseInt(b.data.total_money || 0) : parseInt(b.data.amount || 0);
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="flex flex-col h-full space-y-4 relative pb-6 min-w-0">
      
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#B7E4C7] flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shadow-sm shrink-0">
        <h2 className="text-lg md:text-xl xl:text-2xl font-bold text-[#2D6A4F]">📅 BÁO CÁO DOANH THU {loading && <span className="animate-pulse">⏳</span>}</h2>
        
        <div className="flex items-center space-x-2 flex-wrap gap-y-2 w-full xl:w-auto">
          <input type="text" placeholder="🔍 Tìm tên, mã, phòng..." value={search} onChange={e=>setSearch(e.target.value)} className="px-4 py-2 border rounded-xl outline-none focus:ring-2 w-full sm:w-48 text-sm md:text-base" />
          <select value={reportType} onChange={e=>setReportType(e.target.value)} className="px-4 py-2 border rounded-xl font-bold outline-none bg-gray-50 text-sm md:text-base flex-1 sm:flex-none">
            <option value="DAY">Theo Ngày</option>
            <option value="MONTH">Theo Tháng</option>
            <option value="CUSTOM">Tùy Chọn Khoảng</option>
          </select>
          
          {reportType === "DAY" && <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="px-4 py-2 border rounded-xl font-bold outline-none text-sm md:text-base w-full sm:w-auto" />}
          {reportType === "MONTH" && <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="px-4 py-2 border rounded-xl font-bold outline-none text-sm md:text-base w-full sm:w-auto" />}
          {reportType === "CUSTOM" && (
            <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl border w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-xs font-bold text-gray-600 pl-2">Từ:</span>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="px-2 py-1.5 md:py-1 border rounded-lg font-bold outline-none text-xs md:text-sm" />
              <span className="text-xs font-bold text-gray-600">Đến:</span>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="px-2 py-1.5 md:py-1 border rounded-lg font-bold outline-none text-xs md:text-sm" />
            </div>
          )}
        </div>
      </div>

      {/* 🔥 CHỈNH SỬA GRID CỘT VÀ THÊM Ô "SỐ HÓA ĐƠN" Ở ĐÂY */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-4 shrink-0">
        
        {/* Ô ĐẾM TỔNG SỐ HÓA ĐƠN */}
        <div className="bg-purple-50 p-3 md:p-4 rounded-xl border border-purple-200 text-center shadow-sm flex flex-col justify-center">
          <p className="font-bold text-purple-800 text-[10px] md:text-xs">🧾 SỐ HÓA ĐƠN</p>
          <p className="text-base md:text-lg font-bold text-purple-600 mt-1">{filteredOrders.length} Bill</p>
        </div>

        <div className="bg-[#EAF7EA] p-3 md:p-4 rounded-xl border border-[#B7E4C7] text-center shadow-sm flex flex-col justify-center">
          <p className="font-bold text-[#2D6A4F] text-[10px] md:text-xs">💵 TIỀN MẶT</p>
          <p className="text-base md:text-lg font-bold text-[#2E7D32] mt-1">{money(netCash)}</p>
        </div>
        
        <div className="bg-[#E3F2FD] p-3 md:p-4 rounded-xl border border-blue-200 text-center shadow-sm flex flex-col justify-center">
          <p className="font-bold text-blue-800 text-[10px] md:text-xs">🏦 CHUYỂN KHOẢN</p>
          <p className="text-base md:text-lg font-bold text-[#1976D2] mt-1">{money(netTransfer)}</p>
        </div>
        
        <div className="bg-emerald-50 p-3 md:p-4 rounded-xl border border-emerald-200 text-center shadow-sm flex flex-col justify-center">
          <p className="font-bold text-emerald-800 text-[10px] md:text-xs">📈 TỔNG THU (CHƯA CHI)</p>
          <p className="text-base md:text-lg font-bold text-emerald-600 mt-1">+{money(tongThu)}</p>
        </div>

        <div className="bg-rose-50 p-3 md:p-4 rounded-xl border border-rose-200 text-center shadow-sm flex flex-col justify-center">
          <p className="font-bold text-rose-800 text-[10px] md:text-xs">📉 TỔNG CHI</p>
          <p className="text-base md:text-lg font-bold text-rose-600 mt-1">-{money(tongChi)}</p>
        </div>
        
        <div className="bg-[#FFF8E1] p-3 md:p-4 rounded-xl border border-yellow-200 text-center shadow-sm flex flex-col justify-center">
          <p className="font-bold text-red-800 text-[10px] md:text-xs">💰 DOANH THU THỰC TẾ</p>
          <p className="text-base md:text-lg font-bold text-[#D32F2F] mt-1">{money(netTotal)}</p>
        </div>
      </div>

      <div className="flex-1 bg-[#F7FFF9] p-0 md:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-w-0">
        <div className="overflow-x-auto custom-scrollbar flex-1 rounded-xl">
          <table className="w-full min-w-[800px] text-left border-collapse select-none">
            <thead className="sticky top-0 bg-[#EAF7EA] text-[#18392B] z-10 shadow-sm">
              <tr>
                <th className="p-3 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap text-sm md:text-base" onClick={() => handleSort('time')}>
                  Thời gian {sortConfig.key === 'time' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap text-sm md:text-base" onClick={() => handleSort('id')}>
                  Hóa đơn/Phiếu {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200 transition-colors text-[#2D6A4F] whitespace-nowrap text-sm md:text-base" onClick={() => handleSort('room')}>
                  🏢 Phòng {sortConfig.key === 'room' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="p-3 cursor-pointer hover:bg-gray-200 transition-colors text-sm md:text-base whitespace-nowrap" onClick={() => handleSort('name')}>
                  Tên Khách/Lý do {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="p-3 text-sm md:text-base whitespace-nowrap">Ghi chú</th>
                <th className="p-3 text-right cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap text-sm md:text-base" onClick={() => handleSort('money')}>
                  Tổng Tiền {sortConfig.key === 'money' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="p-3 text-center text-sm md:text-base whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {allTransactions.map((trans, idx) => {
                const tStr = new Date(trans.time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
                
                if (trans.type === 'order') {
                  const o = trans.data;
                  const cAmt = parseInt(o.cash_amount || 0);
                  const tAmt = parseInt(o.transfer_amount || 0);
                  const totAmt = parseInt(o.total_money || 0);

                  const roomName = rooms.find(r => r.id === o.room_id)?.name || "Phòng Ẩn";

                  return (
                    <tr key={'o'+o.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-bold text-gray-700 text-xs md:text-sm whitespace-nowrap">{tStr}</td>
                      <td className="p-3 font-bold text-[#18392B] text-sm md:text-base whitespace-nowrap">HĐ #{o.id}</td>
                      
                      <td className="p-3">
                        <span className="px-3 py-1 bg-[#EAF7EA] text-[#2D6A4F] rounded-lg font-extrabold text-xs md:text-sm border border-[#B7E4C7] whitespace-nowrap">
                          {roomName}
                        </span>
                        <div className="text-[10px] md:text-[11px] text-gray-500 mt-1.5 truncate max-w-[130px]" title={o.combo_name}>
                          🏷️ {o.combo_name}
                        </div>
                      </td>

                      <td className="p-3 text-sm md:text-base">
                        <div className="text-blue-800 font-bold">{o.customer_name || 'Khách lẻ'}</div>
                        {o.extra_money > 0 && <span className="text-[10px] md:text-[11px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded mt-1 inline-block">⏱️ Có gia hạn thêm</span>}
                      </td>

                      <td className="p-3 text-orange-600 font-medium text-xs md:text-sm max-w-[200px] truncate" title={o.note}>{o.note}</td>
                      
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="font-bold text-red-600 text-base md:text-lg">+{money(totAmt)}</div>
                        <div className="text-[10px] md:text-[11px] font-bold mt-1 bg-gray-100 p-1 rounded inline-block text-gray-700">
                          {cAmt > 0 && <span className="text-green-700">TM: {money(cAmt)}</span>}
                          {cAmt > 0 && tAmt > 0 && <span className="mx-1">|</span>}
                          {tAmt > 0 && <span className="text-blue-700">CK: {money(tAmt)}</span>}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button onClick={() => handleViewOrderDetails(o)} className="px-2 md:px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-500 hover:text-white transition-colors rounded-lg font-bold shadow-sm text-xs md:text-sm">Xem</button>
                          <button onClick={() => { setEditOrder(o); setEditData({ name: o.customer_name||'', in: o.checkin_time.slice(0,16), out: o.paid_at.slice(0,16), cash: o.cash_amount.toString(), transfer: o.transfer_amount.toString(), note: o.note||'' }); }} className="px-2 md:px-3 py-1.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-500 hover:text-white transition-colors rounded-lg font-bold shadow-sm text-xs md:text-sm">Sửa</button>
                          <button onClick={() => handleDeleteOrder(o.id)} className="px-2 md:px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-500 hover:text-white transition-colors rounded-lg font-bold shadow-sm text-xs md:text-sm">Xóa</button>
                        </div>
                      </td>
                    </tr>
                  );
                } else {
                  const c = trans.data;
                  const sign = c.type === 'THU' ? '+' : '-';
                  
                  return (
                    <tr key={'c'+c.id} className="border-b bg-gray-50 hover:bg-gray-100 transition-colors">
                      <td className="p-3 font-bold text-gray-700 text-xs md:text-sm whitespace-nowrap">{tStr}</td>
                      <td className="p-3 font-bold text-gray-600 text-sm md:text-base whitespace-nowrap">PHIẾU {c.type}</td>
                      <td className="p-3 text-center text-gray-400">-</td>
                      <td className="p-3 text-gray-800 font-medium text-sm md:text-base">{c.reason}</td>
                      <td className="p-3">-</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className={`font-bold text-base md:text-lg ${c.type === 'THU' ? 'text-green-600' : 'text-red-600'}`}>
                          {sign}{money(c.amount)}
                        </div>
                        <div className="text-[10px] md:text-[11px] font-bold mt-1 bg-white border p-1 rounded inline-block">
                          <span className={c.payment_method === 'Chuyển khoản' ? 'text-blue-700' : 'text-green-700'}>
                            {c.payment_method === 'Chuyển khoản' ? 'CK' : 'TM'}: {money(c.amount)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => { 
                          setEditCashbook(c); 
                          setEditCbData({ 
                            amount: c.amount.toString(), 
                            reason: c.reason || '', 
                            payment_method: c.payment_method || 'Tiền mặt', 
                            created_at: c.created_at.slice(0,16) 
                          }); 
                        }} className="px-3 md:px-4 py-1.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-500 hover:text-white transition-colors rounded-lg font-bold shadow-sm text-xs md:text-sm">Sửa</button>
                      </td>
                    </tr>
                  );
                }
              })}
              
              {allTransactions.length === 0 && (
                <tr><td colSpan="7" className="p-8 text-center text-gray-500 font-bold">Không có giao dịch nào trong khoảng thời gian này.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewOrder && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 md:p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4 transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar relative">
            <div className="flex justify-between items-center border-b border-[#B7E4C7] pb-3 sticky top-0 bg-white z-10">
              <h3 className="text-lg md:text-xl font-bold text-[#18392B] flex items-center gap-2">🔍 CHI TIẾT HÓA ĐƠN #{viewOrder.id}</h3>
              <button onClick={() => setViewOrder(null)} className="text-gray-400 hover:text-red-500 text-3xl font-bold focus:outline-none transition-colors">&times;</button>
            </div>
            
            <div className="font-mono text-xs md:text-[15px] space-y-1.5 text-gray-800 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
              <p><span className="font-bold">Khách hàng:</span> {viewOrder.customer_name || 'Khách lẻ'}</p>
              <p><span className="font-bold">Phòng:</span> {rooms.find(r => r.id === viewOrder.room_id)?.name || 'Phòng Ẩn'}</p>
              <p><span className="font-bold">Giờ vào:</span> {viewOrder.checkin_time}</p>
              <p><span className="font-bold">Giờ ra:</span> {viewOrder.checkout_time || viewOrder.expected_checkout_time}</p>
              
              <div className="border-b border-dashed border-gray-400 my-3"></div>
              
              <p className="font-bold text-[#2D6A4F]">[1. COMBO CHÍNH]</p>
              <p className="pl-2">+ {viewOrder.combo_name}: <span className="float-right">{money(viewOrder.combo_price)}</span></p>

              {viewOrder.extra_money > 0 && (
                <>
                  <p className="font-bold text-[#2D6A4F] mt-3">[2. GIA HẠN THÊM]</p>
                  <p className="pl-2">+ Mua thêm giờ: <span className="float-right">{money(viewOrder.extra_money)}</span></p>
                </>
              )}

              <p className="font-bold text-[#2D6A4F] mt-3">[3. DỊCH VỤ / MÓN ĂN]</p>
              {viewOrderItems.length === 0 ? (
                <p className="pl-2 italic text-gray-500">+ Không sử dụng dịch vụ</p>
              ) : (
                viewOrderItems.map(item => (
                  <p key={item.id} className="pl-2">+ {item.service_name} x{item.quantity}: <span className="float-right">{money(item.total)}</span></p>
                ))
              )}

              <div className="border-b border-dashed border-gray-400 my-3"></div>
              
              {viewOrder.adjustment_money !== 0 && (
                <p className="font-bold text-blue-600 text-sm md:text-base">Phụ thu/Giảm giá: <span className="float-right">{viewOrder.adjustment_money > 0 ? '+' : ''}{money(viewOrder.adjustment_money)}</span></p>
              )}

              {viewOrder.note && (
                <div className="mt-3 bg-[#FFF8E1] border border-yellow-200 p-2 rounded-lg">
                  <p className="font-bold text-orange-600 mb-1">📝 Lịch sử ghi chú:</p>
                  <p className="font-normal text-gray-700 whitespace-pre-wrap">{viewOrder.note}</p>
                </div>
              )}

              <div className="border-b border-dashed border-gray-400 my-3"></div>
              
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <p className="font-bold text-green-700">💵 Khách đưa Tiền mặt: <span className="float-right">{money(viewOrder.cash_amount)}</span></p>
                <p className="font-bold text-blue-700 mt-1">🏦 Khách Chuyển khoản: <span className="float-right">{money(viewOrder.transfer_amount)}</span></p>
              </div>
              
              <p className="text-right font-bold text-lg md:text-2xl text-red-600 mt-4">💰 TỔNG THU: {money(viewOrder.total_money)}</p>
            </div>

            <button onClick={() => setViewOrder(null)} className="w-full py-3 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-bold rounded-xl text-sm md:text-base mt-2">
              Đóng chi tiết
            </button>
          </div>
        </div>
      )}

      {editOrder && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 md:p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4 transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg md:text-xl font-bold text-[#D97706] text-center">✏️ SỬA HÓA ĐƠN #{editOrder.id}</h3>
            <p className="font-bold text-red-600 text-base md:text-lg border-b pb-2 text-center">Tổng thu: {money(editOrder.total_money)}</p>
            <div>
              <label className="font-bold text-xs md:text-sm text-gray-700">Khách hàng</label>
              <input value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className="w-full px-4 py-2 mt-1 border rounded-xl outline-none focus:ring-2 text-sm md:text-base" />
            </div>
            
            <div>
              <label className="font-bold text-xs md:text-sm text-gray-700">Giờ Vào</label>
              <CustomDateTimePicker value={editData.in} onChange={(v) => setEditData({...editData, in: v})} colorClass="focus:ring-[#5D4037]" />
            </div>
            <div className="mt-2">
              <label className="font-bold text-xs md:text-sm text-red-600">Giờ Chốt</label>
              <CustomDateTimePicker value={editData.out} onChange={(v) => setEditData({...editData, out: v})} colorClass="focus:ring-red-400" />
            </div>
            
            <div className="mt-2">
              <label className="font-bold text-xs md:text-sm text-gray-700">Ghi chú (Lý do phụ thu...)</label>
              <input value={editData.note} onChange={e=>setEditData({...editData, note: e.target.value})} className="w-full px-4 py-2 mt-1 border rounded-xl outline-none focus:ring-2 text-sm md:text-base" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 bg-gray-50 p-3 rounded-xl border">
              <div className="flex-1">
                <label className="font-bold text-xs md:text-sm text-gray-700">Tiền mặt thu</label>
                <input value={editData.cash} onChange={e=>handleCashChange(e.target.value)} className="w-full px-3 py-2 mt-1 border rounded-xl font-bold text-green-700 outline-none focus:ring-2 text-sm md:text-base" />
              </div>
              <div className="flex-1">
                <label className="font-bold text-xs md:text-sm text-gray-700">CK thu</label>
                <input value={editData.transfer} onChange={e=>handleTransferChange(e.target.value)} className="w-full px-3 py-2 mt-1 border rounded-xl font-bold text-blue-700 outline-none focus:ring-2 text-sm md:text-base" />
              </div>
            </div>
            <div className="flex space-x-3 mt-4 md:mt-6">
              <button onClick={()=>setEditOrder(null)} className="flex-1 py-3 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-bold rounded-xl text-sm md:text-base">Hủy</button>
              <button onClick={handleSaveEdit} className="flex-1 py-3 bg-[#D97706] hover:bg-yellow-600 transition-colors text-white font-bold rounded-xl shadow-md text-sm md:text-base">LƯU LẠI</button>
            </div>
          </div>
        </div>
      )}

      {editCashbook && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 md:p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4 transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg md:text-xl font-bold text-[#D97706] text-center">✏️ SỬA PHIẾU {editCashbook.type}</h3>
            
            <div>
              <label className="font-bold text-xs md:text-sm text-gray-700">Số tiền</label>
              <input value={editCbData.amount} onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setEditCbData({...editCbData, amount: val ? parseInt(val).toLocaleString('en-US') : ""});
                }} className="w-full px-4 py-2 mt-1 border rounded-xl outline-none focus:ring-2 font-bold text-base md:text-lg text-gray-800" />
            </div>

            <div>
              <label className="font-bold text-xs md:text-sm text-gray-700">Hình thức thanh toán</label>
              <select value={editCbData.payment_method} onChange={e=>setEditCbData({...editCbData, payment_method: e.target.value})} className="w-full px-4 py-2 mt-1 border rounded-xl outline-none focus:ring-2 font-bold text-gray-700 text-sm md:text-base">
                <option value="Tiền mặt">💵 Tiền mặt</option>
                <option value="Chuyển khoản">🏦 Chuyển khoản</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-xs md:text-sm text-gray-700">Lý do</label>
              <input value={editCbData.reason} onChange={e=>setEditCbData({...editCbData, reason: e.target.value})} className="w-full px-4 py-2 mt-1 border rounded-xl outline-none focus:ring-2 text-sm md:text-base" />
            </div>

            <div className="mt-2">
              <label className="font-bold text-xs md:text-sm text-gray-700">Thời gian giao dịch</label>
              <CustomDateTimePicker value={editCbData.created_at} onChange={(v) => setEditCbData({...editCbData, created_at: v})} colorClass="focus:ring-[#5D4037]" />
              <p className="text-xs text-gray-500 mt-1 italic">* Sửa lại thời gian để đẩy giao dịch về đúng ngày sếp muốn.</p>
            </div>

            <div className="flex space-x-3 mt-4 md:mt-6">
              <button onClick={()=>setEditCashbook(null)} className="flex-1 py-3 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-bold rounded-xl text-sm md:text-base">Hủy</button>
              <button onClick={handleSaveEditCashbook} className="flex-1 py-3 bg-[#D97706] hover:bg-yellow-600 transition-colors text-white font-bold rounded-xl shadow-md text-sm md:text-base">LƯU LẠI</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}