/* Phukhieo Marketing - front-end demo
   ข้อมูลตัวอย่างเก็บใน localStorage ของเบราว์เซอร์เครื่องนี้เท่านั้น
   ก่อนเปิดใช้งานจริงหลายอุปกรณ์ ให้เชื่อม Firebase Auth/Database/Storage
   และตั้ง Security Rules ฝั่งเซิร์ฟเวอร์
*/
(() => {
  "use strict";
  const STORAGE_KEY = "pkm_products_v1";
  const ADMIN_PIN = "2468"; // เปลี่ยนได้ แต่ไม่ปลอดภัยสำหรับระบบจริง
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  const $ = (selector) => document.querySelector(selector);
  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = value => new Intl.NumberFormat("th-TH").format(Number(value) || 0);
  const loadProducts = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
  const saveProducts = products => localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  const placeholder = "assets/images/product-placeholder.svg";
  const imageSrc = product => product.image || placeholder;
  const statusText = status => status === "approved" ? "อนุมัติแล้ว" : status === "rejected" ? "ไม่อนุมัติ" : "รอตรวจสอบ";

  function productCard(product, owner = false) {
    return `<article class="product-card">
      <a href="product.html?id=${encodeURIComponent(product.id)}"><img class="product-image" src="${imageSrc(product)}" alt="${escapeHTML(product.name)}" onerror="this.src='${placeholder}'"></a>
      <div class="product-card-body"><h3>${escapeHTML(product.name)}</h3><div class="product-price">฿${money(product.price)}</div>
      <div class="product-meta"><span>${escapeHTML(product.contact || "Phukhieo School")}</span><span class="status-pill">${statusText(product.status)}</span></div></div>
      ${owner ? `<div class="admin-card-actions"><button class="btn btn-outline" data-edit="${escapeHTML(product.id)}">แก้ไข</button><button class="btn btn-danger" data-delete="${escapeHTML(product.id)}">ลบ</button></div>` : ""}
    </article>`;
  }
  function renderCards(target, products, owner = false, emptyText = "ยังไม่มีสินค้า") {
    if (!target) return;
    target.innerHTML = products.length ? products.map(p => productCard(p, owner)).join("") : `<div class="empty-state">${emptyText}</div>`;
  }
  function setupMenu() {
    const button = $(".menu-toggle"), nav = $(".main-nav");
    if (button && nav) button.addEventListener("click", () => {
      const open = nav.classList.toggle("open"); button.setAttribute("aria-expanded", String(open));
    });
  }
  function setupHome() {
    const target = $("#featured-products");
    if (target) {
      const products = loadProducts().filter(p => p.status === "approved").slice(0, 3);
      renderCards(target, products, false, "ยังไม่มีสินค้าแนะนำในขณะนี้ ลองกลับมาใหม่ภายหลังนะ");
    }
  }
  function setupSearch() {
    const target = $("#all-products");
    if (!target) return;
    const input = $("#search-input"), sort = $("#sort-select"), count = $("#results-count");
    const render = () => {
      let products = loadProducts().filter(p => p.status === "approved");
      const query = (input?.value || "").trim().toLowerCase();
      if (query) products = products.filter(p => `${p.name} ${p.description} ${p.contact}`.toLowerCase().includes(query));
      if (sort?.value === "price-low") products.sort((a,b) => a.price - b.price);
      else if (sort?.value === "price-high") products.sort((a,b) => b.price - a.price);
      else products.sort((a,b) => b.createdAt - a.createdAt);
      if (count) count.textContent = `พบ ${products.length} รายการ`;
      renderCards(target, products, false, "ไม่พบสินค้า ลองค้นหาด้วยคำอื่น");
    };
    input?.addEventListener("input", render); sort?.addEventListener("change", render); render();
  }
  function setupDetail() {
    const target = $("#product-detail");
    if (!target) return;
    const id = new URLSearchParams(location.search).get("id");
    const product = loadProducts().find(p => p.id === id && p.status === "approved");
    if (!product) { target.innerHTML = `<div class="empty-state">ไม่พบสินค้านี้ หรือสินค้ายังไม่ได้รับการอนุมัติ</div>`; return; }
    target.innerHTML = `<img class="detail-image" src="${imageSrc(product)}" alt="${escapeHTML(product.name)}" onerror="this.src='${placeholder}'">
      <div class="detail-info"><span class="eyebrow">PHUKHIEO MARKETPLACE</span><h1>${escapeHTML(product.name)}</h1><div class="detail-price">฿${money(product.price)}</div>
      <p class="detail-description">${escapeHTML(product.description || "ไม่มีรายละเอียดเพิ่มเติม")}</p>
      <div class="detail-contact"><b>ช่องทางติดต่อผู้ขาย</b><p>${escapeHTML(product.contact)}</p><small>โปรดนัดรับและซื้อขายในพื้นที่ที่ปลอดภัยตามกฎของโรงเรียน</small></div></div>`;
  }
  function setupSeller() {
    const form = $("#product-form");
    if (!form) return;
    const imageInput = $("#product-image"), preview = $("#image-preview"), editId = $("#edit-id");
    let selectedImage = "";
    const currentProducts = () => loadProducts();
    const resetForm = () => {
      form.reset(); editId.value = ""; selectedImage = "";
      preview.innerHTML = "<span>ภาพตัวอย่างจะแสดงที่นี่</span>";
      $("#form-title").textContent = "เพิ่มสินค้าใหม่"; $("#submit-product").textContent = "ส่งให้ Admin อนุมัติ ↗";
      $("#cancel-edit").classList.add("hidden"); imageInput.required = true;
    };
    imageInput?.addEventListener("change", () => {
      const file = imageInput.files?.[0]; if (!file) return;
      if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { alert("กรุณาเลือกไฟล์ JPG, PNG หรือ WEBP"); imageInput.value = ""; return; }
      if (file.size > MAX_IMAGE_BYTES) { alert("รูปภาพต้องมีขนาดไม่เกิน 2 MB"); imageInput.value = ""; return; }
      const reader = new FileReader();
      reader.onload = () => { selectedImage = reader.result; preview.innerHTML = `<img src="${selectedImage}" alt="ตัวอย่างรูปสินค้า">`; };
      reader.readAsDataURL(file);
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      const name = $("#product-name").value.trim(), price = Number($("#product-price").value);
      const description = $("#product-description").value.trim(), contact = $("#product-contact").value.trim();
      const id = editId.value;
      const products = currentProducts();
      const existing = id ? products.find(p => p.id === id) : null;
      const image = selectedImage || existing?.image;
      if (!name || !contact || !Number.isFinite(price) || price < 0 || !image) { alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบ"); return; }
      const product = { id: id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), name, price, description, contact, image,
        status: existing ? existing.status : "pending", createdAt: existing ? existing.createdAt : Date.now() };
      if (existing) products[products.findIndex(p => p.id === id)] = product; else products.unshift(product);
      try { saveProducts(products); alert(existing ? "บันทึกการแก้ไขแล้ว" : "ส่งสินค้าให้ Admin ตรวจสอบแล้ว"); resetForm(); renderSellerList(); }
      catch { alert("พื้นที่จัดเก็บของเบราว์เซอร์ไม่เพียงพอ ลองใช้รูปภาพขนาดเล็กลง"); }
    });
    $("#cancel-edit")?.addEventListener("click", resetForm);
    function renderSellerList() {
      const target = $("#my-products-list"); if (!target) return;
      // โหมดเดโม: แสดงรายการทั้งหมดที่บันทึกในเบราว์เซอร์นี้
      renderCards(target, currentProducts().sort((a,b) => b.createdAt-a.createdAt), true, "ยังไม่มีสินค้าในอุปกรณ์นี้");
      target.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => {
        const p = currentProducts().find(item => item.id === button.dataset.edit); if (!p) return;
        editId.value = p.id; $("#product-name").value = p.name; $("#product-price").value = p.price;
        $("#product-description").value = p.description || ""; $("#product-contact").value = p.contact;
        selectedImage = p.image; preview.innerHTML = `<img src="${p.image}" alt="ตัวอย่างรูปสินค้า">`;
        imageInput.required = false; $("#form-title").textContent = "แก้ไขรายละเอียดสินค้า";
        $("#submit-product").textContent = "บันทึกการแก้ไข"; $("#cancel-edit").classList.remove("hidden");
        window.scrollTo({top:0,behavior:"smooth"});
      }));
      target.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => {
        if (!confirm("ต้องการลบสินค้านี้ใช่ไหม?")) return;
        saveProducts(currentProducts().filter(p => p.id !== button.dataset.delete)); renderSellerList();
      }));
    }
    renderSellerList();
  }
  function setupAdmin() {
    const loginForm = $("#admin-login-form"); if (!loginForm) return;
    const loginPanel = $("#admin-login-panel"), dashboard = $("#admin-dashboard");
    const renderAdmin = () => {
      const products = loadProducts();
      renderCards($("#pending-products"), products.filter(p => p.status === "pending"), false, "ไม่มีสินค้ารออนุมัติ");
      renderCards($("#approved-products"), products.filter(p => p.status === "approved"), false, "ยังไม่มีสินค้าที่อนุมัติ");
      const pending = $("#pending-products");
      pending.querySelectorAll(".product-card").forEach((card, index) => {
        const p = products.filter(x => x.status === "pending")[index];
        const actions = document.createElement("div"); actions.className = "admin-card-actions";
        actions.innerHTML = `<button class="btn btn-success" data-approve="${escapeHTML(p.id)}">อนุมัติ</button><button class="btn btn-danger" data-reject="${escapeHTML(p.id)}">ไม่อนุมัติ</button>`;
        card.appendChild(actions);
      });
      dashboard.querySelectorAll("[data-approve]").forEach(btn => btn.addEventListener("click", () => updateStatus(btn.dataset.approve, "approved")));
      dashboard.querySelectorAll("[data-reject]").forEach(btn => btn.addEventListener("click", () => updateStatus(btn.dataset.reject, "rejected")));
    };
    const updateStatus = (id, status) => { const products=loadProducts(); const p=products.find(x=>x.id===id); if(p){p.status=status;saveProducts(products);renderAdmin();} };
    loginForm.addEventListener("submit", event => {
      event.preventDefault();
      if ($("#admin-pin").value === ADMIN_PIN) {
        loginPanel.classList.add("hidden"); dashboard.classList.remove("hidden"); renderAdmin();
      } else $("#admin-login-message").textContent = "รหัส PIN ไม่ถูกต้อง";
    });
    $("#admin-logout")?.addEventListener("click", () => { dashboard.classList.add("hidden"); loginPanel.classList.remove("hidden"); $("#admin-pin").value=""; });
  }
  document.addEventListener("DOMContentLoaded", () => {
    setupMenu(); setupHome(); setupSearch(); setupDetail(); setupSeller(); setupAdmin();
  });
})();

/* --- ANIMATION & ADMIN AUTHENTICATION PKstudent_mk --- */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Falling Flowers Animation
  function createFlower() {
    const flower = document.createElement('div');
    flower.classList.add('flower-petal');
    const flowerIcons = ['🌸', '🌺', '💮', '✨', '🌸'];
    flower.innerText = flowerIcons[Math.floor(Math.random() * flowerIcons.length)];
    
    flower.style.left = Math.random() * 100 + 'vw';
    flower.style.animationDuration = Math.random() * 3 + 4 + 's';
    flower.style.fontSize = Math.random() * 10 + 16 + 'px';
    
    document.body.appendChild(flower);

    setTimeout(() => {
      flower.remove();
    }, 7000);
  }
  setInterval(createFlower, 450);

  // 2. Twinkling Stars Decorative Setup
  const mainContainers = document.querySelectorAll('.hero, .container, header, .card');
  mainContainers.forEach(container => {
    container.style.position = 'relative';
    for (let i = 0; i < 3; i++) {
      const star = document.createElement('span');
      star.classList.add('star-sparkle');
      star.innerText = '✦';
      star.style.top = Math.random() * 80 + 10 + '%';
      star.style.left = Math.random() * 90 + 5 + '%';
      star.style.animationDelay = Math.random() * 2 + 's';
      container.appendChild(star);
    }
  });

  // 3. Admin Key check logic (PKstudent_mk)
  const passInputs = document.querySelectorAll('input[type="password"]');
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      const passInput = form.querySelector('input[type="password"]');
      if (passInput) {
        if (passInput.value === "PKstudent_mk") {
          alert("เข้าสู่ระบบแอดมินโรงเรียนภูเขียวเรียบร้อยแล้วค่ะ! 🌸");
        }
      }
    });
  });
});
