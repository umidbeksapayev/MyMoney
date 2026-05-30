# 👨‍👩‍👧‍👦 Tính năng Gia đình & Chia sẻ Nhóm

## 📖 Giới thiệu

**Family (Gia đình)** là tính năng cho phép bạn **chia sẻ quản lý tài chính** với gia đình hoặc nhóm bạn bè. Thay vì mỗi người quản lý riêng, bạn có thể:

- 💰 **Chia sẻ ngân sách chung** (ví dụ: tiền ăn uống, tiền nhà, tiền du lịch)
- 🎯 **Mục tiêu chung** (ví dụ: tiết kiệm mua nhà, đi du lịch)
- 💸 **Chia bill** theo % hoặc số tiền cố định
- 📊 **Xem ai đóng góp bao nhiêu**
- 👥 **Quản lý quyền** cho từng thành viên

---

## 🎭 Vai trò (Roles)

Mỗi thành viên có 1 trong 4 vai trò:

| Vai trò | Icon | Quyền hạn |
|---------|------|-----------|
| **Head (Trưởng nhóm)** | 👑 | Quyền cao nhất, có thể chuyển quyền cho người khác, xóa gia đình |
| **Manager (Quản lý)** | 🔧 | Quản lý ngân sách, mời/xóa thành viên, chỉnh sửa mục tiêu |
| **Contributor (Thành viên)** | ✏️ | Thêm giao dịch, đóng góp vào mục tiêu, xem dữ liệu |
| **Observer (Quan sát)** | 👁️ | Chỉ xem dữ liệu, không được thêm/sửa/xóa |

---

## 🚀 Cách sử dụng

### 1️⃣ Tạo Gia đình

```
1. Vào menu → "Family"
2. Click "Create Family"
3. Nhập:
   - Tên gia đình (vd: "Nhà mình", "Nhóm bạn thân")
   - Mô tả (optional)
4. Click "Create"
```

Bạn tự động trở thành **Head (Trưởng nhóm)**.

---

### 2️⃣ Mời thành viên

#### **Cách 1: Mời qua Email** ✉️

```
1. Click "Invite Member"
2. Nhập email người cần mời
3. Chọn vai trò (Manager/Contributor/Observer)
4. Click "Send Invite"
5. Họ sẽ nhận email → click Accept
```

#### **Cách 2: Tạo mã mời** 🎟️ (KHUYẾN NGHỊ)

```
1. Click "Generate Invite Code"
2. Chọn:
   - Vai trò (Manager/Contributor/Observer)
   - Hết hạn (số ngày, hoặc để trống = vĩnh viễn)
   - Giới hạn (số lần dùng, hoặc 0 = không giới hạn)
3. Copy mã hoặc copy link
4. Gửi cho người cần mời qua Zalo, Messenger, v.v.
5. Họ click link hoặc paste mã → tự động join!
```

**Ưu điểm mã mời:**
- ✅ Không cần email
- ✅ Chia sẻ nhanh (Zalo, Messenger, WhatsApp)
- ✅ 1 mã cho nhiều người (nếu set unlimited)
- ✅ Tự động join, không cần accept/decline

---

### 3️⃣ Tạo ngân sách chung (Shared Budget)

```
1. Vào Family → chọn gia đình của bạn
2. Tab "Budgets"
3. Click "Add Shared Budget"
4. Nhập:
   - Tên (vd: "Tiền ăn tháng 11")
   - Số tiền (vd: 10,000,000 VND)
   - Danh mục (Food & Dining)
   - Thời gian (Monthly/Weekly/Daily)
   - Start date, End date
5. Click "Create"
```

**Mọi thành viên** (trừ Observer) có thể thêm giao dịch vào ngân sách này.

---

### 4️⃣ Tạo mục tiêu chung (Shared Goal)

```
1. Vào Family → chọn gia đình
2. Tab "Goals"  
3. Click "Add Shared Goal"
4. Nhập:
   - Tên (vd: "Đi Đà Lạt tháng 12")
   - Số tiền mục tiêu (vd: 20,000,000 VND)
   - Deadline
   - Icon, Priority
5. Click "Create"
```

**Mọi thành viên đóng góp:**
```
1. Click vào mục tiêu
2. Click "Contribute"
3. Nhập số tiền
4. Click "Add Contribution"
```

Hệ thống tự động tracking:
- 📊 Ai đóng góp bao nhiêu
- 💰 Tổng đã góp / còn thiếu
- 📈 % hoàn thành

---

### 5️⃣ Chia bill (Expense Splitting)

```
1. Tạo transaction như bình thường
2. Check "Split with Family"
3. Chọn gia đình
4. Chọn cách chia:
   - Equal (chia đều)
   - Percentage (theo %)
   - Custom (tùy chỉnh số tiền)
5. Chọn thành viên tham gia
6. Click "Create"
```

**Ví dụ:**
- Bill nhà hàng: 1,500,000 VND
- Chia đều cho 3 người → mỗi người 500,000 VND
- Hệ thống tracking ai đã trả, ai chưa

---

## 🔐 Bảo mật & Quyền riêng tư

- ✅ **Dữ liệu cá nhân** vẫn riêng tư (transactions cá nhân không ai thấy)
- ✅ **Chỉ dữ liệu gia đình** mới được share (budgets, goals, shared transactions)
- ✅ **Quyền dựa trên vai trò** - Observer chỉ xem, không sửa
- ✅ **Head có thể xóa gia đình** - toàn bộ data gia đình sẽ bị xóa (không ảnh hưởng data cá nhân)

---

## 💡 Use Cases (Trường hợp sử dụng)

### 🏠 **Gia đình**
```
- Bố mẹ = Head/Manager
- Con cái = Contributor
- Ông bà = Observer (chỉ xem)
- Chia sẻ: Tiền ăn, tiền điện nước, tiền học, mục tiêu du lịch
```

### 👫 **Cặp đôi**
```
- 2 người = Manager
- Chia sẻ: Tiền hẹn hò, tiền nhà, mục tiêu cưới/mua nhà
- Chia bill: Ăn uống, xem phim, du lịch
```

### 👥 **Nhóm bạn**
```
- Leader = Head
- Bạn thân = Contributor
- Chia sẻ: Tiền du lịch, tiền ăn nhậu, tiền quà sinh nhật chung
- Tracking: Ai nợ ai bao nhiêu
```

### 🏢 **Phòng trọ/Bạn cùng phòng**
```
- Chủ nhà/Người thuê chính = Head
- Người ở cùng = Contributor
- Chia sẻ: Tiền điện nước, tiền internet, tiền ăn chung
- Chia đều hoặc theo % sử dụng
```

### 🎓 **Nhóm dự án**
```
- Trưởng nhóm = Manager
- Thành viên = Contributor
- Giáo viên = Observer (giám sát)
- Tracking: Chi phí dự án, đóng góp từng người
```

---

## ⚙️ Quản lý Gia đình

### Chuyển quyền Head
```
Head → Click thành viên → "Transfer Head"
→ Bạn sẽ trở thành Manager, họ là Head mới
```

### Xóa thành viên
```
Manager/Head → Click thành viên → "Remove"
```

### Rời gia đình
```
Click "Leave Family"
→ Nếu bạn là Head cuối cùng, phải chuyển quyền hoặc xóa gia đình
```

### Xóa gia đình
```
Head → "Delete Family"
⚠️ Xóa vĩnh viễn toàn bộ budgets, goals, splits
✅ Data cá nhân của bạn vẫn giữ nguyên
```

---

## 📊 Dashboard Gia đình

Khi vào Family, bạn thấy:

- 👥 **Members** - Danh sách thành viên và vai trò
- 💰 **Shared Budgets** - Ngân sách chung, đã dùng bao nhiêu
- 🎯 **Shared Goals** - Mục tiêu chung, % hoàn thành
- 💸 **Expense Splits** - Bills đang chờ thanh toán
- 📈 **Contributions** - Thống kê đóng góp từng người
- 🎟️ **Invite Codes** - Quản lý mã mời đang hoạt động

---

## 🎯 Tóm tắt

| Tính năng | Mô tả |
|-----------|-------|
| **Shared Budgets** | Ngân sách chung theo tháng/tuần/ngày |
| **Shared Goals** | Mục tiêu tiết kiệm chung với tracking đóng góp |
| **Expense Splitting** | Chia bill tự động, tracking ai trả/chưa trả |
| **Role-Based Permissions** | 4 cấp quyền: Head/Manager/Contributor/Observer |
| **Invite Codes** | Mã mời không giới hạn, có thể set hết hạn/giới hạn |
| **Multi-Currency** | Hỗ trợ 29 loại tiền tệ |
| **Privacy** | Dữ liệu cá nhân riêng tư, chỉ share data gia đình |

---

## ❓ FAQ

**Q: Người khác có thấy transactions cá nhân của tôi không?**
> A: KHÔNG. Chỉ có transactions bạn thêm VÀO gia đình mới được share.

**Q: Tôi có thể tham gia nhiều gia đình không?**
> A: CÓ. Bạn có thể là Head của 1 gia đình, Manager của gia đình khác.

**Q: Mã mời hết hạn thì sao?**
> A: Không thể join nữa. Tạo mã mới hoặc mời qua email.

**Q: Xóa gia đình có xóa transactions cá nhân không?**
> A: KHÔNG. Chỉ xóa data gia đình (shared budgets/goals/splits).

**Q: Observer có thể thêm giao dịch không?**
> A: KHÔNG. Observer chỉ xem, không được thêm/sửa/xóa.

**Q: Tôi muốn rời gia đình nhưng là Head?**
> A: Chuyển quyền Head cho Manager khác, sau đó rời.

---

## 🎉 Bắt đầu ngay!

```
1. Vào menu → "Family"
2. Click "Create Family"
3. Mời thành viên qua mã mời
4. Tạo ngân sách/mục tiêu chung
5. Bắt đầu quản lý tài chính cùng nhau!
```

**Have fun managing finances together! 💰👨‍👩‍👧‍👦**

