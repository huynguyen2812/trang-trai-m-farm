(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = $("#app");
  const money = (n) => n.toLocaleString("vi-VN") + " đ";
  const state = {
    session: JSON.parse(localStorage.getItem("mfarm.session") || "null"),
    otpSentTo: null,
    flash: null,
    googleOpen: false,
  };
  function saveSession() {
    if (state.session) localStorage.setItem("mfarm.session", JSON.stringify(state.session));
    else localStorage.removeItem("mfarm.session");
  }
  function account() { return state.session ? MFARM.accounts[state.session.phone] : null; }
  function isFarm() { return account() && account().kind === "trại"; }
  function owns(code) {
    const acc = account();
    if (!acc) return false;
    if (acc.codes.includes("*")) return true;
    return acc.codes.includes(code);
  }
  function buyback(u) { return Math.round(u.marketPrice * u.estWeightKg * u.buybackRate); }
  function pill(u) {
    const cls = u.status === "den_han" ? "due" : u.status === "chua_ban" ? "open" : "";
    return `<span class="pill ${cls}">${u.statusLabel}</span>`;
  }
  function topbar() {
    const acc = account();
    return `<header class="top"><a class="brand" href="#/">M Farm · <b>vườn nhà</b></a><nav class="nav"><a href="#/cho">Chợ suất</a>${acc ? `<a href="#/vuon">Vườn nhà</a>` : `<a href="#/vao">Vào vườn</a>`}${acc ? `<button type="button" id="logout">Thoát ${acc.name.split(" ").pop()}</button>` : ""}</nav></header>`;
  }
  function landing() {
    return `${topbar()}<main class="wrap hero"><p class="k">Trang trại M Farm</p><h1>Đây không phải một con gà. Đây là con gà của bạn.</h1><p class="lede">Người mua nhận một con theo vòng đời, hoặc một cây theo một vụ. Mỗi cá thể một mã QR. Đến mùa: qua lấy, hoặc trại mua lại. Không phải kênh đầu tư.</p><div class="row"><a class="btn btn-solid" href="#/vao">Vào vườn nhà</a><a class="btn" href="#/cho">Xem suất còn</a><a class="btn" href="#/m/GA-0142">Thử quét GA-0142</a></div><div class="grid" style="margin-top:36px"><article class="card"><div class="bd"><p class="k">Cửa ngoài</p><p class="h">Web quảng cáo + chợ</p><p class="muted">Ai cũng xem được suất còn và nhật ký một mã khi quét QR. Không cần tài khoản.</p></div></article><article class="card"><div class="bd"><p class="k">Cửa trong</p><p class="h">Vườn nhà</p><p class="muted">Đăng nhập bằng SĐT trên hợp đồng. Thấy hết mã đã nhận, chọn đến lấy hoặc bán lại.</p></div></article><article class="card"><div class="bd"><p class="k">Định danh</p><p class="h">SĐT, không phải Google</p><p class="muted">Google chỉ là chìa khóa phụ. Cô Hạnh không cần Gmail. Bếp anh Khoa dùng chung số quán.</p></div></article></div><p class="foot">Bản chạy thử. Giá trên này là số mẫu, chưa phải giá trại.</p></main>`;
  }
  function login() {
    const sent = state.otpSentTo;
    return `${topbar()}<main class="wrap split split-2"><section class="panel"><p class="k">Vào vườn nhà</p><h2 class="h">Số điện thoại trên hợp đồng</h2><p class="muted">Trại gửi mã 6 số qua Zalo. Không tạo mật khẩu. Google là bước phụ.</p><label>Số điện thoại</label><input id="phone" inputmode="numeric" placeholder="0901 111 111" value="${sent || ""}"><div id="otp-block" class="${sent ? "" : "hide"}"><label>Mã Zalo (6 số)</label><input id="otp" inputmode="numeric" maxlength="6" placeholder="111111"></div><p class="err" id="login-err"></p><div class="row"><button class="btn btn-solid" id="send-otp" type="button">${sent ? "Vào vườn" : "Gửi mã Zalo"}</button></div><p class="muted" style="margin:16px 0 8px">Hoặc</p><button class="btn google" id="google-btn" type="button">Tiếp tục với Google</button><p class="muted" style="margin-top:8px">Google chỉ mở được nếu email đã gắn với SĐT hợp đồng.</p></section><aside><div class="demo-acc"><p><strong>Tài khoản mẫu</strong></p><p>Mai — 0901111111 / 111111</p><p>Khoa — 0902222222 / 222222</p><p>Hạnh — 0903333333 / 333333 · không Google</p><p>Sổ trại — 0900000000 / 000000</p><button class="btn" data-demo="0901111111">Vào hộ Mai</button><button class="btn" data-demo="0902222222">Vào hộ Khoa</button><button class="btn" data-demo="0903333333">Vào hộ Hạnh</button></div></aside></main>${state.googleOpen ? googleSheet() : ""}`;
  }
  function googleSheet() {
    return `<div class="sheet" id="google-sheet"><div class="in"><p class="k">Chọn tài khoản Google</p><p class="muted">Mô phỏng OAuth. Email phải đã gắn hợp đồng.</p><button class="btn" style="width:100%;margin:8px 0" data-gmail="mai.nguyen@gmail.com">mai.nguyen@gmail.com — Chị Mai</button><button class="btn" style="width:100%;margin:8px 0" data-gmail="khoa.bep@gmail.com">khoa.bep@gmail.com — Anh Khoa</button><button class="btn" style="width:100%;margin:8px 0" data-gmail="hanh@gmail.com">hanh@gmail.com — chưa gắn</button><button class="btn" id="close-sheet" style="width:100%;margin-top:8px">Đóng</button></div></div>`;
  }
  function garden() {
    const acc = account();
    if (!acc) return login();
    if (acc.kind === "trại") return farmDesk();
    const units = acc.codes.map((c) => MFARM.units[c]).filter(Boolean);
    return `${topbar()}<main class="wrap"><p class="k">${acc.kind === "quán" ? "Bếp quán" : acc.kind === "biếu" ? "Suất biếu họ" : "Nhà"}</p><h1 class="h" style="font-size:36px">Vườn của ${acc.name}</h1><p class="lede">Một suất = một mã.</p><div class="grid" style="margin-top:22px">${units.map(unitCard).join("")}</div></main>`;
  }
  function unitCard(u) {
    const action = u.status === "den_han" ? `<a class="btn btn-clay" href="#/cuoi/${u.code}">Chọn cửa cuối vụ</a>` : `<a class="btn" href="#/m/${u.code}">Xem nhật ký</a>`;
    return `<article class="card"><div class="ph" style="background-image:url('${u.photo}')"></div><div class="bd"><p class="k">${u.code} · ${u.label}</p><p class="h" style="font-size:22px">${u.name}</p><p>${pill(u)} <span class="muted">${u.weight}</span></p><p class="muted">${u.place}</p><div class="row">${action}</div></div></article>`;
  }
  function market() {
    const list = Object.values(MFARM.units).filter((u) => u.status === "chua_ban");
    return `${topbar()}<main class="wrap"><p class="k">Chợ suất</p><h1 class="h" style="font-size:36px">Còn mã nào thì mới bán</h1><p class="lede">Không bán một con gà tương lai.</p><div class="grid" style="margin-top:22px">${list.map((u) => `<article class="card"><div class="ph" style="background-image:url('${u.photo}')"></div><div class="bd"><p class="k">${u.code}</p><p class="h" style="font-size:22px">${u.name}</p><p>${pill(u)}</p><p class="price">${money(u.adoptPrice)}</p><p class="muted">Đến hạn: ${u.due}</p><a class="btn" href="#/m/${u.code}">Xem cá thể</a></div></article>`).join("")}</div></main>`;
  }
  function detail(code) {
    const u = MFARM.units[code];
    if (!u) return `${topbar()}<main class="wrap"><h1>Không có mã ${code}</h1></main>`;
    const logs = MFARM.logs[code] || [];
    const mine = owns(code);
    const publicNote = u.ownerPhone ? "Nhật ký công khai của đúng mã này. Cửa cuối vụ chỉ mở trong vườn nhà." : "Mã chưa bán.";
    return `${topbar()}<main class="wrap split split-2"><section><div class="card"><div class="ph" style="height:220px;background-image:url('${u.photo}')"></div><div class="bd"><p class="k">${u.code} · ${u.place}</p><h1 class="h">${u.name}</h1><p>${pill(u)} · ${u.weight}</p><p class="muted">${u.feed}. ${u.medicine}.</p></div></div><h2 class="h" style="margin-top:22px">Nhật ký</h2><div class="timeline">${logs.length ? logs.map((l) => `<div class="titem"><strong>${l.week}</strong><span class="muted">${l.date}</span><p>${l.text}</p>${l.medicine ? `<p class="med">Có thuốc — đã ghi sổ</p>` : ""}</div>`).join("") : `<p class="muted">Chưa có dòng nhật ký.</p>`}</div></section><aside class="panel"><p class="muted">${publicNote}</p>${u.status === "chua_ban" ? `<p class="price">${money(u.adoptPrice)}</p><p class="muted">Nhận nuôi qua Zalo trại.</p>` : ""}${mine && u.status === "den_han" ? `<a class="btn btn-clay" href="#/cuoi/${u.code}">Đến hạn — chọn cửa</a>` : ""}${mine && u.status !== "den_han" ? `<p class="okbox">Mã này nằm trong vườn của ${account().name}.</p>` : ""}${!mine && u.ownerPhone ? `<p class="notice">Đang xem như người quét QR. Đặt lịch / bán lại thì <a href="#/vao">vào vườn nhà</a>.</p>` : ""}${isFarm() ? farmLogForm(code) : ""}</aside></main>`;
  }
  function farmLogForm(code) {
    return `<hr style="border:none;border-top:1px solid var(--line);margin:16px 0"><p class="k">Sổ trại</p><label>Dòng nhật ký mới</label><input id="log-text" placeholder="Tuần này: cân, ăn, thuốc..."><label><input type="checkbox" id="log-med" style="width:auto"> Có thuốc</label><button class="btn btn-leaf" id="save-log" data-code="${code}" type="button">Ghi sổ</button>`;
  }
  function checkout(code) {
    const acc = account();
    const u = MFARM.units[code];
    if (!acc) return login();
    if (!u || !owns(code)) return `${topbar()}<main class="wrap"><div class="notice">Cửa cuối vụ chỉ mở cho chủ suất.</div></main>`;
    if (u.status !== "den_han") return `${topbar()}<main class="wrap"><p>Mã ${code} chưa đến hạn.</p></main>`;
    const back = buyback(u);
    const rate = Math.round(u.buybackRate * 100);
    return `${topbar()}<main class="wrap"><p class="k">${u.code}</p><h1 class="h" style="font-size:36px">Hai cửa. Không cửa thứ ba.</h1><p class="lede">Giá ngày chốt (mẫu): ${money(u.marketPrice)} ${u.marketUnit}. Bán lại = ${rate}%.</p><div class="grid" style="margin-top:20px"><article class="panel"><p class="k">Cửa 1</p><p class="h">Đến trại lấy</p><p class="muted">Đặt lịch. Giết mổ chỉ khi đủ phép.</p><button class="btn btn-leaf" data-door="lay" data-code="${code}" type="button">Đặt lịch lấy</button></article><article class="panel"><p class="k">Cửa 2</p><p class="h">Bán lại cho trại</p><p class="price">${money(back)}</p><p class="muted">Có thể không lời so với ${money(u.adoptPrice)} đã trả.</p><button class="btn btn-clay" data-door="ban" data-code="${code}" type="button">Bán lại</button></article></div><p class="notice" style="margin-top:16px">Im lặng quá hạn thì mặc định cửa 2.</p>${state.flash ? `<p class="okbox" style="margin-top:12px">${state.flash}</p>` : ""}</main>`;
  }
  function farmDesk() {
    const all = Object.values(MFARM.units);
    return `${topbar()}<main class="wrap"><p class="k">Người giữ sổ</p><h1 class="h" style="font-size:36px">Sổ cá thể</h1><div class="grid" style="margin-top:20px">${all.map((u) => `<article class="card"><div class="bd"><p class="k">${u.code} · ${u.ownerPhone || "chưa bán"}</p><p class="h" style="font-size:20px">${u.name}</p><p>${pill(u)} ${u.weight}</p><a class="btn" href="#/m/${u.code}">Nhật ký / ghi sổ</a></div></article>`).join("")}</div></main>`;
  }
  function enter(phone) {
    const acc = MFARM.accounts[phone];
    if (!acc) return false;
    state.session = { phone, name: acc.name, at: Date.now() };
    state.otpSentTo = null;
    state.googleOpen = false;
    saveSession();
    location.hash = "#/vuon";
    return true;
  }
  function route() {
    state.flash = state.flash && route._keepFlash ? state.flash : null;
    route._keepFlash = false;
    const parts = (location.hash.slice(1) || "/").split("/").filter(Boolean);
    let html;
    if (parts[0] === "vao") html = login();
    else if (parts[0] === "vuon") html = garden();
    else if (parts[0] === "cho") html = market();
    else if (parts[0] === "m" && parts[1]) html = detail(parts[1].toUpperCase());
    else if (parts[0] === "cuoi" && parts[1]) html = checkout(parts[1].toUpperCase());
    else html = landing();
    app.innerHTML = html;
    bind();
  }
  function bind() {
    $("#logout")?.addEventListener("click", () => { state.session = null; saveSession(); location.hash = "#/"; });
    $("#send-otp")?.addEventListener("click", () => {
      const phone = normalize($("#phone").value);
      const acc = MFARM.accounts[phone];
      const err = $("#login-err");
      if (!acc) { err.textContent = "Số này chưa có trên hợp đồng."; return; }
      if (!state.otpSentTo) { state.otpSentTo = phone; route(); return; }
      const otp = ($("#otp")?.value || "").trim();
      if (otp !== acc.pin) { err.textContent = "Mã Zalo không khớp. Số mẫu: " + acc.pin; return; }
      enter(phone);
    });
    $("#google-btn")?.addEventListener("click", () => { state.googleOpen = true; route(); });
    $("#close-sheet")?.addEventListener("click", () => { state.googleOpen = false; route(); });
    document.querySelectorAll("[data-gmail]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mail = btn.getAttribute("data-gmail");
        const phone = MFARM.googleMap[mail];
        state.googleOpen = false;
        if (!phone) {
          state.otpSentTo = null; route();
          const n = $("#login-err");
          if (n) n.textContent = mail + " chưa gắn hợp đồng. Cô Hạnh vào bằng Zalo.";
          return;
        }
        enter(phone);
      });
    });
    document.querySelectorAll("[data-demo]").forEach((btn) => btn.addEventListener("click", () => enter(btn.getAttribute("data-demo"))));
    $("#save-log")?.addEventListener("click", () => {
      const code = $("#save-log").getAttribute("data-code");
      const text = ($("#log-text").value || "").trim();
      if (!text) return;
      MFARM.logs[code] = MFARM.logs[code] || [];
      MFARM.logs[code].unshift({ week: "Mới ghi", date: new Date().toISOString().slice(0, 10), text, medicine: $("#log-med").checked });
      route();
    });
    document.querySelectorAll("[data-door]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-code");
        const door = btn.getAttribute("data-door");
        const u = MFARM.units[code];
        if (door === "lay") { u.status = "da_lay"; u.statusLabel = "Đã đặt lịch lấy"; state.flash = "Đã ghi cửa 1. Trại nhắn lịch trên Zalo."; }
        else { u.status = "da_ban_lai"; u.statusLabel = "Đã bán lại"; state.flash = "Đã ghi cửa 2. Trại chuyển " + money(buyback(u)) + "."; }
        route._keepFlash = true; route();
      });
    });
  }
  function normalize(v) { return (v || "").replace(/\s+/g, ""); }
  window.addEventListener("hashchange", route);
  route();
})();
