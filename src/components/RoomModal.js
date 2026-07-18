"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { money, overdueText, fmtDt } from "@/lib/utils";

// 💡 HÀM KHỬ DẤU TIẾNG VIỆT
const removeAccents = (str) => {
  if (!str) return "";
  try {
    return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
  } catch(e) {
    return str.toString().toLowerCase().trim();
  }
};

// 💡 VŨ KHÍ 1: BỘ CHỌN GIỜ ĐỘC QUYỀN
const hoursList = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0'));
const minutesList = Array.from({length: 60}, (_, i) => String(i).padStart(2, '0'));

const CustomTimePicker = ({ value, onChange, colorClass = "focus:ring-[#52B788]" }) => {
  const safeValue = value || "00:00";
  const [hh, mm] = safeValue.includes(':') ? safeValue.split(':') : ['00', '00'];
  return (
    <div className="flex items-center gap-2">
      <select value={hh} onChange={(e) => onChange(`${e.target.value}:${mm}`)} className={`w-full px-3 py-3 border rounded-xl font-bold outline-none focus:ring-2 ${colorClass} shadow-inner text-sm md:text-base bg-white text-center cursor-pointer`}>
        {hoursList.map(h => <option key={h} value={h}>{h} giờ</option>)}
      </select>
      <span className="font-bold text-gray-500">:</span>
      <select value={mm} onChange={(e) => onChange(`${hh}:${e.target.value}`)} className={`w-full px-3 py-3 border rounded-xl font-bold outline-none focus:ring-2 ${colorClass} shadow-inner text-sm md:text-base bg-white text-center cursor-pointer`}>
        {minutesList.map(m => <option key={m} value={m}>{m} phút</option>)}
      </select>
    </div>
  );
};

// 💡 VŨ KHÍ 2: BỘ CHỌN NGÀY & GIỜ ĐỘC QUYỀN
const CustomDateTimePicker = ({ value, onChange, colorClass = "focus:ring-[#5D4037]" }) => {
  const safeValue = value ? value.replace(' ', 'T') : ''; 
  const datePart = safeValue ? safeValue.split('T')[0] : '';
  let timePart = safeValue.includes('T') ? safeValue.split('T')[1] : '00:00';
  timePart = timePart.slice(0, 5); 
  const [hh, mm] = timePart.includes(':') ? timePart.split(':') : ['00', '00'];

  return (
    <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2 mt-1.5">
      <input type="date" value={datePart} onChange={(e) => onChange(`${e.target.value}T${hh}:${mm}`)} className={`w-full xl:flex-1 px-3 py-3 border rounded-xl font-bold outline-none focus:ring-2 ${colorClass} shadow-inner text-sm md:text-base bg-white`} />
      <div className="flex items-center gap-2 w-full xl:w-auto">
        <select value={hh} onChange={(e) => onChange(`${datePart || new Date().toISOString().split('T')[0]}T${e.target.value}:${mm}`)} className={`flex-1 xl:w-24 px-2 py-3 border rounded-xl font-bold outline-none focus:ring-2 ${colorClass} shadow-inner text-sm md:text-base bg-white text-center cursor-pointer`}>
          {hoursList.map(h => <option key={h} value={h}>{h}h</option>)}
        </select>
        <span className="font-bold text-gray-500">:</span>
        <select value={mm} onChange={(e) => onChange(`${datePart || new Date().toISOString().split('T')[0]}T${hh}:${e.target.value}`)} className={`flex-1 xl:w-24 px-2 py-3 border rounded-xl font-bold outline-none focus:ring-2 ${colorClass} shadow-inner text-sm md:text-base bg-white text-center cursor-pointer`}>
          {minutesList.map(m => <option key={m} value={m}>{m}m</option>)}
        </select>
      </div>
    </div>
  );
};

// 🔥 FIX 1: Nạp cổng onSuccess để tránh F5
export default function RoomModal({ isOpen, room, onClose, onSuccess }) {
  const [view, setView] = useState("menu"); 
  const [loading, setLoading] = useState(false);

  const [combos, setCombos] = useState([]);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [checkinTime, setCheckinTime] = useState("");
  const [checkinNote, setCheckinNote] = useState("");
  const [knownCustomers, setKnownCustomers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [allCombos, setAllCombos] = useState([]);
  
  const [currentOrderItems, setCurrentOrderItems] = useState([]);

  const [checkoutData, setCheckoutData] = useState({ roomMoney: 0, serviceMoney: 0, adjustMoney: 0, discount: 0, total: 0 });
  const [checkoutTime, setCheckoutTime] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const [adjType, setAdjType] = useState("GIẢM GIÁ");
  const [adjUnit, setAdjUnit] = useState("VND");
  const [adjMoney, setAdjMoney] = useState("0");

  const [emptyRooms, setEmptyRooms] = useState([]);
  const [editInTime, setEditInTime] = useState("");
  const [editOutTime, setEditOutTime] = useState("");

  const isActive = room?.status === "ĐANG THUÊ";
  const order = room?.activeOrder;

  useEffect(() => {
    if (isOpen && isActive && order) {
      supabase.from('order_items').select('*').eq('order_id', order.id).then(({data}) => setCurrentOrderItems(data || []));
    } else {
      setCurrentOrderItems([]); 
    }
  }, [isOpen, isActive, order]);

  useEffect(() => {
    if (isOpen) { 
      setView("menu"); setQuantity(1); setCashAmount(""); setTransferAmount(""); setCheckinNote(""); setAdjMoney("0"); setAdjType("GIẢM GIÁ"); setAdjUnit("VND");
      setCustomerName(""); setPhone(""); setSuggestions([]); setLoading(false);
    }
  }, [isOpen, room]);

  if (!isOpen || !room) return null;

  // 🔥 THỰC THI FIX 1: Dùng gọi ngầm thay vì tải lại toàn trang web
  const reloadApp = () => { 
    if (onSuccess) { onSuccess(); } 
    else { onClose(); window.location.reload(); }
  };

  const handleSuggest = (val, type) => {
    if (type === 'name') setCustomerName(val); 
    else setPhone(val);

    const keyword = removeAccents(val);

    if (keyword.length < 1) {
      setSuggestions([]);
      return;
    }

    const matches = knownCustomers.filter(k => {
      const n = removeAccents(k.name);
      const p = k.phone || "";
      return n.includes(keyword) || p.includes(keyword);
    });

    matches.sort((a, b) => {
      if (a.phone && !b.phone) return -1;
      if (!a.phone && b.phone) return 1;
      return 0;
    });

    setSuggestions(matches.slice(0, 6));
  };

  const handleOpenCheckin = async () => {
    if (isActive) return alert("Phòng đang có khách!");
    // 🔥 FIX: Chặn đứng hành vi nhận khách khi phòng chưa dọn!
    if (room?.status === "DỌN PHÒNG") return alert("🛑 TỪ CHỐI NHẬN KHÁCH:\nPhòng này chưa được dọn dẹp!\n\nVui lòng báo nhân viên dọn phòng, sau đó bấm nút [🧹 Dọn/Trống] để chuyển trạng thái về TRỐNG trước khi đón khách mới.");
    
    setLoading(true); setView("checkin");
    const now = new Date(); setCheckinTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    
    const { data: comboData } = await supabase.from('room_combos').select('*').eq('is_active', 1).eq('room_type_id', room.room_type_id).order('hours');
    setCombos(comboData || []); if (comboData?.length) setSelectedCombo(comboData[0]);
    
    const { data: settings } = await supabase.from('branch_loyalty_settings').select('point_rate').eq('branch_id', room.branch_id).single();
    const pointRate = settings?.point_rate || 200000;

    const { data: redemptions } = await supabase.from('customer_redemptions').select('customer_name, points_spent').eq('branch_id', room.branch_id);
    const usedMap = {};
    (redemptions || []).forEach(r => {
      const n = r.customer_name.trim();
      usedMap[n] = (usedMap[n] || 0) + r.points_spent;
    });

    const { data: custData } = await supabase.from('orders')
      .select('customer_name, total_money')
      .eq('branch_id', room.branch_id)
      .not('customer_name', 'is', null)
      .neq('customer_name', ''); 

    if (custData) {
      const map = new Map();
      
      custData.forEach(d => {
        const cn = d.customer_name.trim();
        let n = cn;
        let p = "";
        
        if (cn.includes(" - ")) {
          const parts = cn.split(" - ");
          n = parts[0].trim();
          p = parts[1].trim();
        }

        const key = removeAccents(n);
        if (!key) return;

        if (!map.has(key)) {
          map.set(key, { name: n, phone: p, total_spent: 0 });
        } else {
          const existing = map.get(key);
          if (p && !existing.phone) {
            existing.phone = p;
            existing.name = n; 
          }
        }
        map.get(key).total_spent += (d.total_money || 0);
      });

      const finalCustomers = Array.from(map.values()).map(c => {
        const used = usedMap[c.name] || 0;
        const pts = Math.floor(c.total_spent / pointRate) - used;
        return { ...c, points: pts > 0 ? pts : 0 };
      });

      setKnownCustomers(finalCustomers);
    }
    setLoading(false);
  };

  const handleCheckinSubmit = async () => {
    if (!selectedCombo) return alert("Vui lòng chọn Combo!");
    if (loading) return; 
    setLoading(true);
    try {
      const [hh, mm] = checkinTime.split(":"); const checkinDate = new Date(); checkinDate.setHours(parseInt(hh), parseInt(mm), 0, 0);
      const checkoutDate = new Date(checkinDate.getTime()); checkoutDate.setHours(checkoutDate.getHours() + selectedCombo.hours); checkoutDate.setMinutes(checkoutDate.getMinutes() + selectedCombo.minutes);
      const offset = checkinDate.getTimezoneOffset() * 60000;
      const localCheckin = (new Date(checkinDate - offset)).toISOString().slice(0, 19).replace('T', ' ');
      const localCheckout = (new Date(checkoutDate - offset)).toISOString().slice(0, 19).replace('T', ' ');

      const finalCustomerName = phone.trim() ? `${customerName.trim()} - ${phone.trim()}` : (customerName.trim() || "Khách lẻ");

      await supabase.from('orders').insert([{
        room_id: room.id, customer_name: finalCustomerName, checkin_time: localCheckin, expected_checkout_time: localCheckout,
        combo_id: selectedCombo.id, combo_name: selectedCombo.name, combo_hours: selectedCombo.hours, combo_minutes: selectedCombo.minutes,
        combo_price: selectedCombo.price, extra_minutes: 0, extra_money: 0, adjustment_money: 0, adjustment_reason: '',
        room_money: selectedCombo.price, status: 'ĐANG THUÊ', branch_id: room.branch_id, created_at: new Date().toISOString(),
        note: checkinNote 
      }]);
      await supabase.from('rooms').update({ status: 'ĐANG THUÊ' }).eq('id', room.id);
      reloadApp();
    } catch (e) { alert("Lỗi: " + e.message); setLoading(false); }
  };

  const handleServiceSubmit = async () => {
    if (!selectedService || quantity <= 0) return alert("Dữ liệu không hợp lệ!");
    if (loading) return; 
    setLoading(true);
    try {
      await supabase.from('order_items').insert([{ order_id: order.id, service_name: selectedService.name, quantity: quantity, price: selectedService.price, total: selectedService.price * quantity, created_at: new Date().toISOString() }]);
      const { data: srvData } = await supabase.from('order_items').select('total').eq('order_id', order.id);
      const newServiceMoney = srvData ? srvData.reduce((sum, item) => sum + item.total, 0) : 0;
      await supabase.from('orders').update({ service_money: newServiceMoney }).eq('id', order.id);
      reloadApp(); 
    } catch (e) { alert("Lỗi: " + e.message); setLoading(false); }
  };

  const handleOpenCheckout = async () => {
    if (!isActive) return;
    setLoading(true); setView("checkout");
    setCheckinNote(order.note || ""); 
    
    const roomMoney = parseInt(order.combo_price || 0) + parseInt(order.extra_money || 0);
    const serviceMoney = currentOrderItems.reduce((sum, item) => sum + item.total, 0); 
    const adjustMoney = parseInt(order.adjustment_money || 0);
    const total = Math.max(0, roomMoney + serviceMoney + adjustMoney);
    setCheckoutData({ roomMoney, serviceMoney, adjustMoney, discount: 0, total });
    setCashAmount(total.toString()); setTransferAmount("0");
    const expTime = new Date(order.expected_checkout_time); setCheckoutTime(`${String(expTime.getHours()).padStart(2, '0')}:${String(expTime.getMinutes()).padStart(2, '0')}`);
    setLoading(false);
  };

  // 🔥 THỰC THI FIX 2: Bọc thép lệnh thanh toán, chống kẹt trạng thái null trên DB
  const handleCheckoutSubmit = async () => {
    const cash = parseInt(cashAmount || 0); const transfer = parseInt(transferAmount || 0);
    if (cash + transfer !== checkoutData.total) return alert(`Tiền mặt + CK phải khớp Tổng Bill: ${money(checkoutData.total)}`);
    if (loading) return; 
    setLoading(true);
    try {
      let pm = "CẢ HAI"; if (cash === checkoutData.total) pm = "TIỀN MẶT"; if (transfer === checkoutData.total) pm = "CHUYỂN KHOẢN";
      const expDate = new Date(order.expected_checkout_time); const [hh, mm] = checkoutTime.split(":"); expDate.setHours(parseInt(hh), parseInt(mm), 0, 0);
      const finalCheckoutStr = (new Date(expDate - expDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 19).replace('T', ' ');

      // Ép nhận biên lai (.select()) mới được làm tiếp
      const { error: err1 } = await supabase.from('orders').update({
        checkout_time: finalCheckoutStr, paid_at: finalCheckoutStr, room_money: checkoutData.roomMoney, service_money: checkoutData.serviceMoney,
        adjustment_money: checkoutData.adjustMoney, discount: checkoutData.discount, total_money: checkoutData.total, payment_method: pm, cash_amount: cash, transfer_amount: transfer, status: 'ĐÃ THANH TOÁN',
        note: checkinNote
      }).eq('id', order.id).select();
      if (err1) throw err1;

      const { error: err2 } = await supabase.from('rooms').update({ status: 'DỌN PHÒNG' }).eq('id', room.id).select();
      if (err2) throw err2;

      reloadApp();
    } catch (e) { alert("Lỗi Thanh Toán: " + e.message); setLoading(false); }
  };

  const handleMoneyType = (type, val) => {
    const num = parseInt(val.replace(/\D/g, '') || 0);
    if (type === 'cash') { setCashAmount(num.toString()); if (num <= checkoutData.total) setTransferAmount((checkoutData.total - num).toString()); } 
    else { setTransferAmount(num.toString()); if (num <= checkoutData.total) setCashAmount((checkoutData.total - num).toString()); }
  };

  const calcTotal = () => {
    if (!order) return 0;
    return (order.combo_price||0) + (order.extra_money||0) + currentOrderItems.reduce((s,i)=>s+i.total,0) + (order.adjustment_money||0);
  };

  // 🔥 THỰC THI FIX 3: Tấm khiên số 1 chống lỗi văng màn hình đỏ
  const InvoiceDetail = () => {
    if (!order) return null; // Nếu Realtime xóa order, giấu luôn bảng bill này!
    
    return (
      <div className="bg-white p-3 md:p-4 rounded-xl border border-dashed border-gray-400 font-mono text-xs md:text-[15px] space-y-1 mb-4 shadow-inner text-gray-800 shrink-0">
        <p className="font-bold text-center text-base md:text-lg text-[#18392B] mb-1 md:mb-2">🧾 HÓA ĐƠN CHI TIẾT</p>
        <p>Mã HĐ: #{order.id}</p>
        <p className="truncate">Khách: {order.customer_name || 'Khách lẻ'}</p>
        <p>Vào: {order.checkin_time}</p>
        <p>Ra (Dự kiến): {order.expected_checkout_time}</p>
        <p className="border-b border-dashed border-gray-400 my-1 md:my-2"></p>
        <p className="font-bold">[1. COMBO CHÍNH]</p>
        <p className="pl-2">+ {order.combo_name}: <span className="float-right">{money(order.combo_price)}</span></p>
        {order.extra_money > 0 && <><p className="font-bold mt-1">[2. GIA HẠN THÊM]</p><p className="pl-2">+ Mua thêm: <span className="float-right">{money(order.extra_money)}</span></p></>}
        <p className="font-bold mt-1">[3. DỊCH VỤ]</p>
        {currentOrderItems.length === 0 ? <p className="pl-2 italic text-gray-500">+ Chưa sử dụng dịch vụ</p> : currentOrderItems.map(i => <p key={i.id} className="pl-2">+ {i.service_name} x{i.quantity}: <span className="float-right">{money(i.total)}</span></p>)}
        <p className="border-b border-dashed border-gray-400 my-1 md:my-2"></p>
        {order.adjustment_money !== 0 && <p className="font-bold text-blue-600">Phụ thu/Giảm: <span className="float-right">{order.adjustment_money > 0 ? '+' : ''}{money(order.adjustment_money)}</span></p>}
        {order.note && <p className="font-bold text-orange-600 mt-1">📝 Ghi chú: {order.note}</p>}
        <p className="text-right font-bold text-lg md:text-2xl text-red-600 mt-2 md:mt-3">💰 TỔNG: {money(calcTotal())}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-[#B7E4C7] max-h-[95vh] flex flex-col">
        
        <div className="bg-[#EAF7EA] px-4 md:px-6 py-3 md:py-4 flex justify-between items-center border-b border-[#B7E4C7] shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl md:text-2xl font-bold text-[#18392B] truncate">🏠 {room.name}</h2>
            <p className="text-[#5A7C68] text-xs md:text-sm font-medium truncate">Nhóm: {room.type_name} | Trạng thái: {room.status}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-3xl md:text-4xl font-bold focus:outline-none transition-colors">&times;</button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
          
          {/* 🔥 THỰC THI FIX 3: Tấm khiên số 2 chặn toàn bộ khung nhập liệu */}
          {view === "menu" && (
            <>
              {isActive && order ? (
                <>
                  <InvoiceDetail />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4 md:mb-6 bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
                    <span className="font-bold text-gray-700 text-sm md:text-base shrink-0">📝 Thêm Ghi chú:</span>
                    <input type="text" id="note_input" placeholder="Gõ dặn dò mới vào đây..." className="flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-[#F59E0B] text-sm md:text-base" />
                    <button onClick={async () => { 
                      if (loading) return;
                      setLoading(true); 
                      const addedText = document.getElementById("note_input").value.trim();
                      if (addedText) {
                        const oldNote = order.note ? order.note + " | " : "";
                        const finalNote = oldNote + addedText;
                        await supabase.from('orders').update({ note: finalNote }).eq('id', order.id); 
                        reloadApp(); 
                      } else { setLoading(false); }
                    }} className={`px-5 py-2 md:py-2.5 text-white font-bold rounded-lg shadow-sm text-sm md:text-base whitespace-nowrap ${loading ? 'bg-gray-400' : 'bg-[#F59E0B] hover:bg-[#D97706] transition-colors'}`}>
                      {loading ? "⏳ Đang lưu..." : "Lưu ghi chú"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-[#F4FFF7] p-4 md:p-6 rounded-xl border border-[#B7E4C7] mb-4 md:mb-6 text-center text-[#5A7C68] font-medium text-sm md:text-base shadow-sm">
                  Phòng trống sẵn sàng phục vụ.
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                {/* 🔥 FIX: Làm mờ nút Nhận phòng nếu trạng thái không phải là TRỐNG */}
                <button 
                  onClick={handleOpenCheckin} 
                  className={`p-3 md:p-4 rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-sm flex flex-col items-center justify-center text-center gap-1 transition-colors ${room?.status === 'TRỐNG' ? 'bg-[#2E7D32] hover:bg-[#1B5E20] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  <span className="text-xl">📥</span> Nhận phòng
                </button>
                <button onClick={async () => { if (!isActive) return; setLoading(true); const { data } = await supabase.from('services').select('*').eq('branch_id', room.branch_id).order('name'); setServices(data || []); if (data?.length) setSelectedService(data[0]); setView("service"); setLoading(false); }} className={`p-3 md:p-4 rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-sm flex flex-col items-center justify-center text-center gap-1 transition-colors ${isActive ? 'bg-[#F57C00] hover:bg-[#E65100] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}><span className="text-xl">🍔</span> Dịch vụ</button>
                <button onClick={async () => { if (!isActive) return; setLoading(true); const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id); setServices(data || []); setView("delete_item"); setLoading(false); }} className={`p-3 md:p-4 rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-sm flex flex-col items-center justify-center text-center gap-1 transition-colors ${isActive ? 'bg-[#D32F2F] hover:bg-[#B71C1C] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}><span className="text-xl">➖</span> Xóa món</button>
                <button onClick={async () => { if (!isActive) return; const { data } = await supabase.from('room_combos').select('*').eq('room_type_id', room.room_type_id); setAllCombos(data || []); setView("add_extra_combo"); }} className={`p-3 md:p-4 rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-sm flex flex-col items-center justify-center text-center gap-1 transition-colors ${isActive ? 'bg-[#1976D2] hover:bg-[#0D47A1] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}><span className="text-xl">➕</span> Mua thêm</button>
                
                <button onClick={async () => { if (!isActive) return; const { data } = await supabase.from('room_combos').select('*').eq('room_type_id', room.room_type_id); setAllCombos(data || []); setView("edit_main_combo"); }} className={`p-3 md:p-4 rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-sm flex flex-col items-center justify-center text-center gap-1 transition-colors ${isActive ? 'bg-[#0288D1] hover:bg-[#01579B] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}><span className="text-xl">✏️</span> Sửa Combo</button>
                <button onClick={async () => { if (!isActive) return; const { data } = await supabase.from('room_combos').select('*').eq('room_type_id', room.room_type_id); setAllCombos(data || []); setView("del_extra_combo"); }} className={`p-3 md:p-4 rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-sm flex flex-col items-center justify-center text-center gap-1 transition-colors ${isActive ? 'bg-[#7B1FA2] hover:bg-[#4A148C] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}><span className="text-xl">🗑️</span> Xóa phụ</button>
                <button onClick={() => { if (!isActive) return; setAdjMoney(order.adjustment_money?.toString() || "0"); setAdjType(order.adjustment_money < 0 ? "GIẢM GIÁ" : "PHỤ THU"); setView("adjust_price"); }} className={`p-3 md:p-4 rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-sm flex flex-col items-center justify-center text-center gap-1 transition-colors ${isActive ? 'bg-[#00796B] hover:bg-[#004D40] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}><span className="text-xl">💸</span> Tăng/Giảm</button>
                <button onClick={async () => { if (!isActive) return; setLoading(true); const { data } = await supabase.from('rooms').select('*').eq('branch_id', room.branch_id).eq('status', 'TRỐNG'); setEmptyRooms(data || []); setView("move_room"); setLoading(false); }} className={`p-3 md:p-4 rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-sm flex flex-col items-center justify-center text-center gap-1 transition-colors ${isActive ? 'bg-[#455A64] hover:bg-[#263238] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}><span className="text-xl">🔄</span> Đổi phòng</button>
                
                <button onClick={async () => { if (isActive) return; if(loading) return; setLoading(true); await supabase.from('rooms').update({ status: room.status === 'DỌN PHÒNG' ? 'TRỐNG' : 'DỌN PHÒNG' }).eq('id', room.id); reloadApp(); }} className={`p-3 md:p-4 rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-sm flex flex-col items-center justify-center text-center gap-1 transition-colors ${!isActive ? 'bg-[#E6A822] hover:bg-[#C59017] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}><span className="text-xl">🧹</span> Dọn/Trống</button>
                <button onClick={() => { if (!isActive) return; setEditInTime(order.checkin_time.slice(0, 16)); setEditOutTime(order.expected_checkout_time.slice(0, 16)); setView("edit_time"); }} className={`p-3 md:p-4 rounded-xl font-bold text-xs sm:text-sm md:text-base shadow-sm flex flex-col items-center justify-center text-center gap-1 transition-colors ${isActive ? 'bg-[#5D4037] hover:bg-[#3E2723] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}><span className="text-xl">⏰</span> Sửa Giờ</button>
                
                <button onClick={handleOpenCheckout} className={`p-3 md:p-4 col-span-2 sm:col-span-2 md:col-span-2 rounded-xl font-bold text-sm md:text-lg shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 ${isActive ? 'bg-[#C62828] hover:bg-[#B71C1C] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  💳 TRẢ PHÒNG & THANH TOÁN
                </button>
              </div>
            </>
          )}

          {/* 🔥 THỰC THI FIX 3: Tấm khiên số 3 chặn tất cả các bảng nhập liệu phụ */}
          {view === "adjust_price" && order && (() => {
            const roomMoney = parseInt(order.combo_price || 0) + parseInt(order.extra_money || 0);
            const serviceMoney = currentOrderItems.reduce((s,i) => s + i.total, 0);
            const subtotal = roomMoney + serviceMoney; 
            
            const v = parseInt(adjMoney.replace(/\D/g, '') || 0);
            let amt = adjUnit === '%' ? Math.round(subtotal * v / 100) : v;
            let finalTotal = adjType === 'GIẢM GIÁ' ? Math.max(0, subtotal - amt) : subtotal + amt;

            return (
              <div className="space-y-4">
                <h3 className="text-lg md:text-xl font-bold text-[#00796B] mb-2 flex items-center gap-2">💸 Tăng / Giảm giá</h3>
                <p className="text-base md:text-lg font-bold text-[#18392B] mb-2 bg-gray-100 p-3 rounded-xl border border-gray-200 text-center shadow-sm">💰 Tạm tính gốc: <span className="text-blue-700">{money(subtotal)}</span></p>
                
                <div className="flex gap-2">
                  <button onClick={() => setAdjType("GIẢM GIÁ")} className={`flex-1 py-3 font-bold rounded-xl transition-colors shadow-sm text-sm md:text-base ${adjType === "GIẢM GIÁ" ? "bg-[#00796B] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border"}`}>📉 GIẢM GIÁ</button>
                  <button onClick={() => setAdjType("PHỤ THU")} className={`flex-1 py-3 font-bold rounded-xl transition-colors shadow-sm text-sm md:text-base ${adjType === "PHỤ THU" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border"}`}>📈 PHỤ THU</button>
                </div>

                <div className="flex gap-2 mt-2">
                  <button onClick={() => setAdjUnit("VND")} className={`flex-1 py-3 font-bold rounded-xl transition-colors shadow-sm text-sm md:text-base ${adjUnit === "VND" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border"}`}>💵 Tiền (VND)</button>
                  <button onClick={() => setAdjUnit("%")} className={`flex-1 py-3 font-bold rounded-xl transition-colors shadow-sm text-sm md:text-base ${adjUnit === "%" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border"}`}>📊 Phần trăm (%)</button>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Nhập giá trị ({adjUnit})</label>
                  <input 
                    type="text" 
                    value={adjUnit === "VND" ? money(adjMoney) : adjMoney} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (adjUnit === '%' && parseInt(val) > 100) return setAdjMoney("100");
                      setAdjMoney(val);
                    }} 
                    className="w-full px-4 py-3 md:py-4 border-2 rounded-xl font-bold text-lg md:text-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 text-center shadow-inner transition-all" 
                  />
                </div>

                <div className="bg-[#FFF8E1] border border-yellow-300 p-4 rounded-xl mt-4 text-center shadow-sm">
                  <p className="text-gray-700 font-bold text-sm md:text-base">{adjType === 'GIẢM GIÁ' ? 'Được giảm:' : 'Bị thu thêm:'} <span className="text-red-600 text-lg">{money(amt)}</span></p>
                  <p className="text-lg md:text-xl font-bold text-[#18392B] mt-1">➔ Cần thu cuối: <span className="text-green-700">{money(finalTotal)}</span></p>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <button onClick={() => setView("menu")} className="flex-1 py-3 md:py-4 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-bold rounded-xl text-sm md:text-base">❌ Hủy</button>
                  <button onClick={async () => { 
                    if (loading) return;
                    setLoading(true); 
                    const finalAdjMoney = adjType === 'GIẢM GIÁ' ? -amt : amt;
                    await supabase.from('orders').update({ adjustment_money: finalAdjMoney }).eq('id', order.id); 
                    reloadApp(); 
                  }} className={`flex-[2] py-3 md:py-4 text-white font-bold rounded-xl shadow-md text-sm md:text-base ${loading ? 'bg-gray-400' : 'bg-[#00796B] hover:bg-[#004D40] transition-colors'}`}>
                    {loading ? "⏳ ĐANG LƯU..." : "✅ LƯU LẠI"}
                  </button>
                </div>
              </div>
            );
          })()}

          {view === "move_room" && order && (
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-[#455A64] mb-4">🔄 Chọn phòng trống để chuyển</h3>
              {emptyRooms.length === 0 ? <p className="text-red-500 font-bold p-4 bg-red-50 rounded-xl text-center">Hết phòng trống rồi sếp ơi!</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
                  {emptyRooms.map(r => (
                    <button key={r.id} onClick={async () => { 
                      if(window.confirm(`Chuyển khách sang ${r.name}?`)) { 
                        if (loading) return;
                        setLoading(true); 
                        try {
                          await supabase.from('orders').update({ room_id: r.id }).eq('id', order.id); 
                          await supabase.from('rooms').update({ status: 'TRỐNG' }).eq('id', room.id); 
                          await supabase.from('rooms').update({ status: 'ĐANG THUÊ' }).eq('id', r.id); 
                          reloadApp(); 
                        } catch (e) { alert("Lỗi chuyển phòng: " + e.message); setLoading(false); }
                      } 
                    }} className="p-4 border-2 border-gray-200 rounded-xl hover:bg-[#EAF7EA] hover:border-[#2D6A4F] font-bold text-left transition-colors text-base md:text-lg text-gray-800 shadow-sm flex items-center gap-2">
                      🏠 {r.name}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setView("menu")} className="w-full py-3 md:py-4 bg-gray-200 hover:bg-gray-300 transition-colors text-gray-700 font-bold rounded-xl mt-4 text-sm md:text-base">❌ Quay lại</button>
            </div>
          )}

          {view === "edit_time" && order && (
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-[#5D4037] mb-4">✏️ Sửa Giờ Check-in & Check-out</h3>
              <div>
                <label className="font-bold text-gray-700 text-sm md:text-base">Giờ Check-in (Vào):</label>
                <CustomDateTimePicker value={editInTime} onChange={setEditInTime} colorClass="focus:ring-[#5D4037]" />
              </div>
              <div className="mt-4">
                <label className="font-bold text-red-600 text-sm md:text-base">Giờ Check-out (Ra dự kiến):</label>
                <CustomDateTimePicker value={editOutTime} onChange={setEditOutTime} colorClass="focus:ring-red-400" />
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button onClick={() => setView("menu")} className="flex-1 py-3 md:py-4 bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold rounded-xl transition-colors text-sm md:text-base">❌ Hủy</button>
                <button onClick={async () => { if(loading) return; setLoading(true); await supabase.from('orders').update({ checkin_time: editInTime.replace('T',' '), expected_checkout_time: editOutTime.replace('T',' ') }).eq('id', order.id); reloadApp(); }} className={`flex-[2] py-3 md:py-4 text-white font-bold rounded-xl shadow-md text-sm md:text-base ${loading ? 'bg-gray-400' : 'bg-[#5D4037] hover:bg-[#3E2723] transition-colors'}`}>
                  {loading ? "⏳ ĐANG LƯU..." : "✅ LƯU LẠI"}
                </button>
              </div>
            </div>
          )}

          {view === "delete_item" && order && (
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-[#D32F2F] mb-4">🗑️ Chọn món muốn xóa</h3>
              {services.length === 0 ? <p className="text-gray-500 italic p-4 text-center bg-gray-50 rounded-xl">Chưa gọi món nào.</p> : 
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {services.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 hover:bg-red-50 transition-colors p-3 rounded-xl border border-gray-200">
                    <span className="font-bold text-gray-800 text-sm md:text-base truncate pr-2">{item.service_name} (x{item.quantity})</span>
                    <button onClick={async () => { if(!window.confirm(`Xóa món ${item.service_name}?`)) return; if(loading) return; setLoading(true); await supabase.from('order_items').delete().eq('id', item.id); const { data } = await supabase.from('order_items').select('total').eq('order_id', order.id); await supabase.from('orders').update({ service_money: data ? data.reduce((s, i) => s + i.total, 0) : 0 }).eq('id', order.id); reloadApp(); }} className="px-3 py-1.5 md:px-4 md:py-2 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white transition-colors font-bold rounded-lg text-sm shrink-0">Xóa</button>
                  </div>
                ))}
              </div>}
              <button onClick={() => setView("menu")} className="w-full py-3 md:py-4 bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold rounded-xl mt-4 transition-colors text-sm md:text-base">❌ Quay lại</button>
            </div>
          )}

          {["add_extra_combo", "edit_main_combo", "del_extra_combo"].includes(view) && order && (
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold mb-4 text-[#1976D2]">{view === 'add_extra_combo' ? "➕ Mua thêm Combo" : view === 'edit_main_combo' ? "✏️ Sửa Combo Chính" : "🗑️ Chọn Combo để Trừ Lùi"}</h3>
              {view === 'del_extra_combo' && <p className="text-sm md:text-base text-red-500 mb-2 font-medium bg-red-50 p-2 rounded-lg border border-red-100">Đã nạp thêm: {money(order.extra_money)}. Bấm vào Combo bên dưới để trừ lùi giờ & tiền.</p>}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {allCombos.map(c => (
                  <div key={c.id} className="flex justify-between items-center bg-white p-3 md:p-4 rounded-xl border border-gray-200 hover:bg-[#EAF7EA] hover:border-[#2D6A4F] transition-all cursor-pointer shadow-sm" onClick={async () => {
                    if (loading) return;
                    setLoading(true);
                    try {
                      if (view === "add_extra_combo") {
                        const addedMins = (c.hours * 60) + c.minutes; const newMins = parseInt(order.extra_minutes || 0) + addedMins; const newMoney = parseInt(order.extra_money || 0) + c.price;
                        const oldExp = new Date(order.expected_checkout_time); oldExp.setMinutes(oldExp.getMinutes() + addedMins); const newExpStr = (new Date(oldExp - oldExp.getTimezoneOffset() * 60000)).toISOString().slice(0, 19).replace('T', ' ');
                        await supabase.from('orders').update({ extra_minutes: newMins, extra_money: newMoney, room_money: parseInt(order.combo_price||0) + newMoney, expected_checkout_time: newExpStr }).eq('id', order.id);
                      } 
                      else if (view === "edit_main_combo") {
                        const checkinDt = new Date(order.checkin_time); checkinDt.setHours(checkinDt.getHours() + c.hours); checkinDt.setMinutes(checkinDt.getMinutes() + c.minutes + parseInt(order.extra_minutes||0));
                        const newExpStr = (new Date(checkinDt - checkinDt.getTimezoneOffset() * 60000)).toISOString().slice(0, 19).replace('T', ' ');
                        await supabase.from('orders').update({ combo_id: c.id, combo_name: c.name, combo_hours: c.hours, combo_minutes: c.minutes, combo_price: c.price, room_money: c.price + parseInt(order.extra_money||0), expected_checkout_time: newExpStr }).eq('id', order.id);
                      }
                      else if (view === "del_extra_combo") {
                        const deductMins = (c.hours * 60) + c.minutes;
                        if (deductMins > order.extra_minutes || c.price > order.extra_money) { alert("Không thể trừ quá số lượng đã nạp thêm!"); setLoading(false); return; }
                        const newMins = parseInt(order.extra_minutes) - deductMins; const newMoney = parseInt(order.extra_money) - c.price;
                        const oldExp = new Date(order.expected_checkout_time); oldExp.setMinutes(oldExp.getMinutes() - deductMins); const newExpStr = (new Date(oldExp - oldExp.getTimezoneOffset() * 60000)).toISOString().slice(0, 19).replace('T', ' ');
                        await supabase.from('orders').update({ extra_minutes: newMins, extra_money: newMoney, room_money: parseInt(order.combo_price||0) + newMoney, expected_checkout_time: newExpStr }).eq('id', order.id);
                      }
                      reloadApp();
                    } catch (e) { alert("Lỗi: " + e.message); setLoading(false); } 
                  }}>
                    <span className="font-bold text-gray-800 text-sm md:text-base">{c.name} ({c.hours}h{c.minutes > 0 ? `${c.minutes}m` : ''})</span>
                    <span className="font-bold text-red-600 text-base md:text-lg">{money(c.price)}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setView("menu")} className="w-full py-3 md:py-4 mt-4 bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold rounded-xl transition-colors text-sm md:text-base">❌ Hủy bỏ</button>
            </div>
          )}

          {view === "checkin" && (
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-[#2D6A4F] mb-4">🛏️ Nhận phòng</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 relative">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Tên Khách hàng</label>
                  <input type="text" value={customerName} onChange={(e) => handleSuggest(e.target.value, 'name')} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner text-sm md:text-base" placeholder="Nhập tên..." />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Số điện thoại</label>
                  <input type="text" value={phone} onChange={(e) => handleSuggest(e.target.value, 'phone')} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner text-sm md:text-base" placeholder="Nhập SĐT..." />
                </div>
                
                {suggestions.length > 0 && (
                  <div className="absolute top-[75px] sm:top-[85px] left-0 right-0 bg-white border-2 border-[#52B788] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                    {suggestions.map((s, i) => (
                      <div 
                        key={i} 
                        onMouseDown={(e) => { 
                          e.preventDefault(); 
                          setCustomerName(s.name || ""); 
                          setPhone(s.phone || ""); 
                          setSuggestions([]); 
                        }} 
                        className="p-3 flex items-center gap-2 border-b border-gray-100 hover:bg-[#EAF7EA] cursor-pointer transition-colors"
                      >
                        <span className="font-bold text-[#18392B] text-sm md:text-base">👤 {s.name}</span>
                        {s.phone && <span className="text-xs md:text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">📞 {s.phone}</span>}
                        
                        {s.points > 0 && (
                          <span className="text-xs md:text-sm font-bold text-white bg-[#52B788] px-2 py-0.5 rounded shadow-sm ml-auto">
                            {s.points} 💎
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-2">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Giờ vào</label>
                  <CustomTimePicker value={checkinTime} onChange={setCheckinTime} colorClass="focus:ring-[#52B788]" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Ghi chú (Tùy chọn)</label>
                  <input type="text" value={checkinNote} onChange={(e) => setCheckinNote(e.target.value)} placeholder="Dặn dò..." className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#52B788] outline-none shadow-inner text-sm md:text-base" />
                </div>
              </div>

              <div className="mt-2">
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Combo Giá Phòng</label>
                <select className="w-full px-4 py-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#52B788] shadow-inner text-sm md:text-base text-[#2D6A4F]" onChange={(e) => setSelectedCombo(combos.find(c => c.id == e.target.value))}>
                  {combos.map(c => <option key={c.id} value={c.id}>{c.name} - {money(c.price)}</option>)}
                </select>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button onClick={() => setView("menu")} className="flex-1 py-3 md:py-4 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors text-sm md:text-base">❌ Quay lại</button>
                <button onClick={handleCheckinSubmit} disabled={loading} className={`flex-[2] py-3 md:py-4 text-white font-bold rounded-xl shadow-md text-sm md:text-base ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2D6A4F] hover:bg-[#18392B] transition-colors'}`}>
                  {loading ? "⏳ ĐANG XỬ LÝ..." : "✅ XÁC NHẬN NHẬN PHÒNG"}
                </button>
              </div>
            </div>
          )}

          {view === "service" && order && (
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-[#F57C00] mb-4">🍔 Thêm Dịch Vụ</h3>
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Chọn món Menu</label>
                <select className="w-full px-4 py-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-[#F57C00] shadow-inner text-sm md:text-base text-gray-800" onChange={(e) => setSelectedService(services.find(s => s.id == e.target.value))}>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} - {money(s.price)}</option>)}
                </select>
              </div>
              <div className="mt-4">
                <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5">Số lượng</label>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value)||1)} className="w-full px-4 py-3 border rounded-xl font-bold text-lg md:text-xl outline-none focus:ring-2 focus:ring-[#F57C00] text-center shadow-inner" />
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button onClick={() => setView("menu")} className="flex-1 py-3 md:py-4 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors text-sm md:text-base">❌ Hủy</button>
                <button onClick={handleServiceSubmit} disabled={loading} className={`flex-[2] py-3 md:py-4 text-white font-bold rounded-xl shadow-md text-sm md:text-base ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#F57C00] hover:bg-[#E65100] transition-colors'}`}>
                  {loading ? "⏳ ĐANG XỬ LÝ..." : "✅ THÊM MÓN"}
                </button>
              </div>
            </div>
          )}

          {view === "checkout" && order && (
            <div className="space-y-4">
              <InvoiceDetail />
              
              <div className="mt-4">
                <label className="block text-xs md:text-sm font-bold text-red-600 mb-1.5">Giờ khách ra</label>
                <CustomTimePicker value={checkoutTime} onChange={setCheckoutTime} colorClass="focus:ring-red-500" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-green-700 mb-1.5">Tiền mặt thu</label>
                  <input type="text" value={money(cashAmount)} onChange={(e) => handleMoneyType('cash', e.target.value)} className="w-full px-4 py-3 border rounded-xl font-bold text-green-700 outline-none focus:ring-2 focus:ring-green-500 shadow-inner text-sm md:text-base" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-blue-700 mb-1.5">Chuyển khoản thu</label>
                  <input type="text" value={money(transferAmount)} onChange={(e) => handleMoneyType('transfer', e.target.value)} className="w-full px-4 py-3 border rounded-xl font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner text-sm md:text-base" placeholder="0" />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-xs md:text-sm font-bold text-orange-600 mb-1.5">Ghi chú thêm (Nếu có)</label>
                <input type="text" value={checkinNote} onChange={(e) => setCheckinNote(e.target.value)} placeholder="Nhập thêm ghi chú lúc trả phòng..." className="w-full px-4 py-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500 shadow-inner text-sm md:text-base" />
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button onClick={() => setView("menu")} className="flex-1 py-3 md:py-4 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors text-sm md:text-base">❌ Hủy</button>
                <button onClick={handleCheckoutSubmit} disabled={loading} className={`flex-[2] py-3 md:py-4 text-white font-bold rounded-xl shadow-md text-sm md:text-base flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#C62828] hover:bg-[#B71C1C] transition-transform active:scale-95'}`}>
                  {loading ? "⏳ ĐANG THANH TOÁN..." : <><span className="text-xl hidden sm:inline">💳</span> CHỐT THANH TOÁN</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}