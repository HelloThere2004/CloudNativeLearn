# 🛡️ MISSION REPORT: AWS LAB 2 - AUTHENTICATION & AUTHORIZATION

**Project:** Gaming Server Management  
**Status:** ✅ Mission Accomplished  
**Tech Stack:** AWS Cognito, API Gateway, Lambda (Node.js), DynamoDB, Vanilla JS.

---

## 📖 1. LÝ THUYẾT CỐT LÕI (CORE CONCEPTS)

### 1.1. JWT (JSON Web Token) - "Thẻ Bài Hoàng Gia"
* **Định nghĩa:** Chuỗi ký tự mã hóa chứa thông tin định danh (Identity) và quyền hạn (Claims) của user.
* **Đặc điểm:** Stateless (Không lưu trạng thái). Server không cần nhớ user đã đăng nhập, chỉ cần xác thực chữ ký của Token.
* **Key Claim:** `cognito:groups` (Dùng để phân quyền Admin/User).

### 1.2. CORS (Cross-Origin Resource Sharing) - "Luật Biên Giới"
* **Vấn đề:** Trình duyệt chặn code JS từ `localhost` gọi API sang domain khác (`amazonaws.com`) vì lý do bảo mật.
* **Giải pháp:** Server phải trả về Header `Access-Control-Allow-Origin: *`.
* **Cơ chế Preflight:** Trình duyệt tự động gửi gói tin `OPTIONS` (không chứa Token) để kiểm tra trước khi gửi request chính.

### 1.3. Implicit Grant Flow
* **Cơ chế:** Token được trả về trực tiếp trên URL (`#id_token=...`) ngay sau khi đăng nhập.
* **Ưu điểm:** Nhanh, dễ tích hợp cho Single Page App (SPA) đơn giản và mục đích testing.

---

## ⚙️ 2. CẤU HÌNH HẠ TẦNG (INFRASTRUCTURE)

### 2.1. Amazon Cognito (Sở Mật Vụ)
* **User Pool:** Quản lý danh sách thành viên.
* **App Client Config:**
    * ❌ **Client Secret:** Phải chọn **"Don't generate a client secret"** (Web browser không bảo mật được secret).
    * ✅ **Callback URL:** Phải khớp tuyệt đối với Frontend (VD: `http://localhost:5500/dashboard.html`).
    * ✅ **OAuth Flows:** Chọn **Implicit Grant**.
* **User Groups:** Tạo group `Admins` để quản lý quyền hạn đặc biệt (RBAC).

### 2.2. API Gateway (Cổng Thành)
* **Authorizer:**
    * **Type:** JWT.
    * **Source:** `$request.header.Authorization`.
    * **Issuer:** `https://cognito-idp.[REGION].amazonaws.com/[USER_POOL_ID]` (Lưu ý: Không có đuôi `/.well-known/...`).
    * **Audience:** [App Client ID].
* **Routes Strategy:**
    * ❌ **Tránh dùng:** `ANY /server` + Auth (Gây lỗi CORS với gói tin `OPTIONS`).
    * ✅ **Nên dùng:** Chia nhỏ Route:
        * `GET /server`: Public (hoặc Auth tùy ý).
        * `POST /server`: Gắn `CognitoAuth`.
        * `DELETE /server`: Gắn `CognitoAuth`.
* **CORS Configuration:**
    * **Origins:** `*`
    * **Headers:** `Authorization`, `Content-Type`.
    * **Methods:** `GET, POST, DELETE, OPTIONS`.
    * ⚠️ **Lưu ý:** Nhập xong phải bấm **Enter** để tạo thẻ (Chip), sau đó bấm **Save** và **Deploy**.

---

## 💻 3. MÃ NGUỒN (SOURCE CODE)

### 3.1. Backend (Lambda Node.js) - Role Based Access Control (RBAC)

```javascript
export const handler = async (event) => {
  // 1. Lấy thông tin User từ Token (do API Gateway giải mã sẵn)
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  const groups = claims["cognito:groups"] || []; 
  
  // 2. Kiểm tra quyền Admin
  const isAdmin = groups.includes("Admins");

  const method = event.httpMethod || event.requestContext?.http?.method;

  // 3. Chốt chặn bảo vệ
  if ((method === "DELETE" || method === "POST") && !isAdmin) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "ACCESS DENIED: Chỉ Admin mới được quyền này!" })
    };
  }

  // ... Logic xử lý DB tiếp theo ...
};