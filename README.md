# 📚 BookApp - Trợ Lý Đọc Sách & Quản Lý Tri Thức Cá Nhân

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![Zustand](https://img.shields.io/badge/State_Management-Zustand-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green.svg)

> **"Không chỉ là đọc sách, đây là hành trình kiến tạo thói quen và tư duy."**

**BookKeeper** là ứng dụng di động **Offline-first** (hoạt động không cần mạng) được xây dựng trên nền tảng React Native & Expo. Ứng dụng giúp người dùng xây dựng thói quen đọc sách, quản lý tủ sách cá nhân, ghi chú thông minh và theo dõi tiến độ đọc chi tiết thông qua các biểu đồ trực quan.

---

## ✨ Tính Năng Nổi Bật (Key Features)

### 1. 📖 Trình Đọc Sách Thông Minh (Smart Reader)
* **Auto-Bookmark (Lưu trang tự động):** Hệ thống tự động ghi nhớ chính xác vị trí trang bạn đang đọc dở. Dù tắt ứng dụng hay khởi động lại máy, khi mở sách ra bạn sẽ luôn bắt đầu đúng tại nơi đã dừng lại.
* **Sticky Notes (Ghi chú dán):** Cho phép tạo ghi chú dạng "giấy nhớ vàng" dán trực tiếp lên trang sách cụ thể.
* **Text-to-Speech (Nghe sách):** Tính năng chuyển văn bản thành giọng nói (hỗ trợ Tiếng Việt), giúp bạn "đọc" sách ngay cả khi đang di chuyển hoặc bận rộn.
* **Focus Mode:** Giao diện tối giản, tùy chỉnh font chữ, chế độ sáng/tối (Dark Mode) để bảo vệ mắt.

### 2. 🧠 Hệ Thống Quản Lý Ghi Chú & Tri Thức
* **Smart Note Navigation (Điều hướng thông minh):** Từ danh sách tổng hợp ghi chú ở màn hình chi tiết, chỉ cần **một cú chạm**, ứng dụng sẽ tự động mở sách và nhảy ngay lập tức đến trang chứa ghi chú đó.
* **Quote Collection:** Lưu trữ riêng biệt những câu trích dẫn tâm đắc cho từng cuốn sách.
* **Reading Journal (Nhật ký đọc):** Ghi lại cảm xúc, suy nghĩ của bạn về cuốn sách theo dòng thời gian (Timeline).

### 3. 📊 Dashboard Thống Kê Chuyên Nghiệp (iOS Style)
* **Visual Analytics:** Biểu đồ cột (Bar Chart) hiển thị thời gian đọc sách trong 7 ngày gần nhất.
* **Screen Time Metrics:** Báo cáo tổng quan thời gian đọc trung bình mỗi ngày (Ví dụ: `1h 30p`), giúp người dùng dễ dàng hình dung nỗ lực của bản thân.
* **Yearly Goal:** Đặt mục tiêu số lượng sách đọc trong năm và theo dõi tiến độ qua thanh Progress Bar.

### 4. ⏰ Kỷ Luật & Nhắc Nhở
* **Daily Reminder:** Hệ thống hẹn giờ nhắc nhở đọc sách hằng ngày.
* **Native Time Picker:** Giao diện chọn giờ hiện đại, chuẩn UI của iOS và Android.
* **Local Notifications:** Hoạt động offline 100%, đảm bảo thông báo luôn được gửi đúng giờ ngay cả khi không có kết nối internet.

---

## 📸 Demo Giao Diện

| Màn hình chính | Chi tiết sách | Trình đọc & Note | Thống kê (Dashboard) |
|:---:|:---:|:---:|:---:|
| <img src="./assets/demo-home.png" width="200" alt="Home Screen" /> | <img src="./assets/demo-detail.png" width="200" alt="Detail Screen" /> | <img src="./assets/demo-read.png" width="200" alt="Reader View" /> | <img src="./assets/demo-stats.png" width="200" alt="Dashboard" /> |

*(Lưu ý: Thay thế đường dẫn ảnh bằng ảnh chụp màn hình thực tế của ứng dụng)*

---

## 🛠 Công Nghệ Sử Dụng (Tech Stack)

Dự án sử dụng các thư viện hiện đại và tối ưu nhất trong hệ sinh thái React Native:

* **Core Framework:** React Native, Expo SDK.
* **State Management:** `Zustand` + `Persist Middleware` (Quản lý trạng thái cực nhanh, nhẹ hơn Redux, hỗ trợ lưu trữ dữ liệu bền vững qua AsyncStorage).
* **Navigation:** React Navigation (Native Stack).
* **UI Components & Chart:**
    * `react-native-chart-kit`: Vẽ biểu đồ thống kê tương tác.
    * `react-native-pager-view`: Tạo hiệu ứng lật trang mượt mà như sách thật.
    * `@react-native-community/datetimepicker`: Bộ chọn thời gian Native.
* **Utilities:**
    * `expo-notifications`: Xử lý thông báo đẩy cục bộ (Local Push Notification).
    * `expo-speech`: Chuyển văn bản thành giọng nói.
    * `expo-keep-awake`: Giữ màn hình luôn sáng khi đọc sách.

---

## 📂 Cấu Trúc Thư Mục (Folder Structure)

Kiến trúc dự án được tổ chức rõ ràng, tách biệt logic và giao diện để dễ dàng bảo trì:

```bash
BookApp/
├── assets/                 # Tài nguyên (Hình ảnh, Icon, Font)
├── src/
│   ├── data/               # Dữ liệu mẫu khởi tạo (initialBooks.json)
│   ├── screens/            # Các màn hình chính của ứng dụng
│   │   ├── HomeScreen.js       # Danh sách sách, Tìm kiếm, Mục tiêu năm
│   │   ├── BookDetailScreen.js # Chi tiết, Quotes, Nhật ký, Smart Link
│   │   ├── ReadBookScreen.js   # Trình đọc, Lật trang, Ghi chú, TTS
│   │   ├── AddBookScreen.js    # Form Thêm mới & Cập nhật sách
│   │   └── DashboardScreen.js  # Biểu đồ thống kê & Cài đặt nhắc nhở
│   ├── store/              # Quản lý trạng thái (Zustand Store)
│   │   └── useBookStore.js     # Logic xử lý dữ liệu toàn cục (CRUD, Stats)
│   └── utils/              # Các hàm tiện ích bổ trợ (nếu có)
├── App.js                  # Entry Point & Cấu hình điều hướng (Navigation)
├── app.json                # Cấu hình dự án Expo
└── package.json            # Quản lý thư viện phụ thuộc


## 🚀 Hướng Dẫn Cài Đặt & Chạy (Installation)

Đảm bảo máy tính của bạn đã cài đặt **Node.js** và môi trường **Expo**.

1.  **Clone dự án về máy:**
    ```bash
    git clone [https://github.com/kelvinthebeast/final-app-dev-subject.git](https://github.com/kelvinthebeast/final-app-dev-subject.git)
    cd BookKeeper
    ```

2.  **Cài đặt các thư viện (Dependencies):**
    ```bash
    npx expo install
    ```
    *Lệnh này sẽ tự động cài đặt tất cả các thư viện cần thiết tương thích với phiên bản Expo SDK.*

3.  **Khởi chạy ứng dụng:**
    ```bash
    npx expo start
    ```

4.  **Chạy trên thiết bị:**
    * **Android:** Mở ứng dụng **Expo Go**, quét mã QR trên terminal.
    * **iOS:** Mở ứng dụng Camera, quét mã QR để mở trong **Expo Go**.

---

## 🔮 Định Hướng Phát Triển (Roadmap)

* [ ] **Backup & Restore:** Tính năng xuất dữ liệu ra file JSON để sao lưu.
* [ ] **File Import:** Hỗ trợ đọc file `.pdf` và `.epub` từ bộ nhớ máy.
* [ ] **Gamification:** Thêm hệ thống huy hiệu và cấp độ khi đạt các mốc đọc sách.

---

## ✍️ Tác Giả

* **Liên hệ:** [nhan.thanhle1308@gmail.com]
