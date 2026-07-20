const productIcons = { 服饰: "衣", 美妆: "妆", 数码: "数", 家居: "家", 食品: "食" };
const paymentMethodIcons = {
  支付宝: "assets/payment/alipay.svg",
  微信支付: "assets/payment/wechat-pay.svg",
  银行卡: "assets/payment/bank-card.svg"
};
const antiProducts = (window.TAOBAO_ESCAPE_PRODUCTS || []).map((product) => ({
  ...product,
  note: product.triggerCopy || product.factualSellingPoint,
  image: product.images?.[0] || "",
  icon: productIcons[product.category] || "宝",
  bg: "#f5f5f5"
}));

const homeTabs = ["推荐", "精致变美", "保健自律", "效率升级", "品质生活", "悦己奖励"];
const channelIntroductions = {
  精致变美: "到底要变成什么样，才可以不再挑剔自己",
  保健自律: "身体想休息，为什么最后变成了补充清单",
  效率升级: "工具变得越来越高效，为什么反而更累了",
  品质生活: "生活过得好，为什么需要商品作证",
  悦己奖励: "辛苦为什么总要用买点什么来补偿"
};
const channelProductIds = {
  精致变美: ["beauty-01", "fashion-01", "beauty-03", "beauty-02", "fashion-04", "fashion-05", "beauty-04", "beauty-08", "beauty-05", "beauty-07"],
  保健自律: ["food-02", "food-01", "digital-09", "fashion-03", "food-03", "health-01", "food-04", "food-05", "home-05", "digital-04"],
  效率升级: ["digital-13", "digital-02", "digital-12", "digital-01", "digital-03", "productivity-01", "digital-05", "home-04"],
  品质生活: ["lifestyle-01", "fashion-07", "digital-06", "fashion-06", "digital-10", "digital-11", "home-02", "home-03", "home-01", "home-08", "home-06", "home-07"],
  悦己奖励: ["food-06", "food-07", "reward-01", "digital-08", "fashion-02", "fashion-08", "beauty-06", "digital-07"]
};
const recommendationBatches = [
  ["escape-01", "escape-02", "escape-03", "escape-04", "fashion-07", "digital-01", "beauty-08", "food-07", "home-05", "digital-07", "fashion-03", "home-01"],
  ["escape-01", "escape-02", "escape-03", "escape-04", "food-07", "fashion-02", "digital-02", "home-08", "beauty-07", "digital-10", "fashion-08", "digital-03"],
  ["escape-01", "escape-02", "escape-03", "escape-04", "fashion-05", "digital-08", "food-03", "home-02", "beauty-04", "fashion-06", "digital-11", "reward-01"],
  ["escape-01", "escape-02", "escape-03", "escape-04", "fashion-07", "food-04", "digital-06", "home-08", "beauty-06", "fashion-01", "digital-12", "food-07"],
  ["escape-01", "escape-02", "escape-03", "escape-04", "food-05", "fashion-08", "home-06", "digital-02", "beauty-07", "home-02", "fashion-03", "digital-07"]
];

const platformPatterns = [
  { name: "淘宝", test: /taobao|tb\.cn|tmall/i },
  { name: "京东", test: /jd\.com|jingdong/i },
  { name: "小红书", test: /xiaohongshu|xhslink/i },
  { name: "抖音", test: /douyin|iesdouyin/i },
  { name: "拼多多", test: /pinduoduo|yangkeduo|pdd/i }
];

const decisionText = {
  pending: "待明早确认",
  saved: "确认省下",
  rational: "理性购买"
};

const logisticsTemplates = [
  ["订单已提交", 0, "订单已生成，逃宝仓开始同步商品信息。"],
  ["商家已接单", 3, "商家已接单，正在核对待定商品。"],
  ["仓库处理中", 24, "包裹内容已出库：明早确认单。"],
  ["包裹已揽收", 527, "承运方已揽收，预计明早送达。"],
  ["派送中", 558, "骑手正在前往收货地址，请保持手机畅通。"],
  ["待签收", 588, "包裹已送达，签收后逐件确认。"]
];

const stageDurations = [0, 18, 42, 72, 96, 120];

function loadProfile() {
  try {
    const savedProfile = JSON.parse(localStorage.getItem("taobao_escape_profile") || "null");
    if (savedProfile?.nickname && savedProfile?.id) {
      if (savedProfile.nickname === "今晚先逃一下") {
        savedProfile.nickname = "万能的逃宝";
        localStorage.setItem("taobao_escape_profile", JSON.stringify(savedProfile));
      }
      return savedProfile;
    }
  } catch (error) {
    // Fall through to a stable local demo profile.
  }
  const now = new Date();
  const datePart = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
  const profile = { nickname: "万能的逃宝", id: `TB_${datePart}` };
  localStorage.setItem("taobao_escape_profile", JSON.stringify(profile));
  return profile;
}

const state = {
  view: "home",
  route: null,
  homeTab: "推荐",
  homeShuffle: 0,
  activeProductId: null,
  reviewReturn: "logistics",
  profile: loadProfile(),
  draftLink: "",
  scanItems: [],
  scanFileName: "",
  scanPreview: "",
  scanSource: "",
  scanStatus: "idle",
  scanError: "",
  scanMeta: null,
  scanRequestId: null,
  couponClaimed: JSON.parse(localStorage.getItem("taobao_escape_coupon") || "false"),
  cartManaging: false,
  pendingDeleteId: null,
  ledgerEditing: false,
  ledgerSelectedIds: [],
  ledgerFilter: "all",
  ledgerPage: 1,
  ledgerOpenDays: null,
  pendingLedgerDelete: false,
  editingOrderId: null,
  payConfirmOpen: false,
  messagesManaging: false,
  selectedMessageIds: [],
  pendingMessageDelete: false,
  deletedMessageIds: JSON.parse(localStorage.getItem("taobao_escape_deleted_messages") || "[]"),
  readMessageIds: JSON.parse(localStorage.getItem("taobao_escape_read_messages") || "[]"),
  payMethod: localStorage.getItem("taobao_escape_pay_method") || "支付宝",
  toast: "",
  cart: JSON.parse(localStorage.getItem("taobao_escape_cart") || "[]"),
  orders: normalizeOrders(JSON.parse(localStorage.getItem("taobao_escape_orders") || "[]")),
  activeOrderId: localStorage.getItem("taobao_escape_active_order") || null
};

const app = document.querySelector("#app");
const modal = document.querySelector("#importModal");
const draftPlatform = document.querySelector("#draftPlatform");
const draftTitle = document.querySelector("#draftTitle");
const draftPrice = document.querySelector("#draftPrice");

const money = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 1
});

function save() {
  localStorage.setItem("taobao_escape_cart", JSON.stringify(state.cart));
  localStorage.setItem("taobao_escape_orders", JSON.stringify(state.orders));
  localStorage.setItem("taobao_escape_active_order", state.activeOrderId || "");
  localStorage.setItem("taobao_escape_coupon", JSON.stringify(state.couponClaimed));
  localStorage.setItem("taobao_escape_pay_method", state.payMethod);
  localStorage.setItem("taobao_escape_deleted_messages", JSON.stringify(state.deletedMessageIds));
  localStorage.setItem("taobao_escape_read_messages", JSON.stringify(state.readMessageIds));
}

function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return String(Date.now() + Math.random());
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paymentIcon(method, className = "") {
  return `<img class="${className}" src="${paymentMethodIcons[method]}" alt="" aria-hidden="true" />`;
}

function toMoney(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function yuanToCents(value) {
  return Math.round((Number(value) || 0) * 100);
}

function centsToYuan(value) {
  return Math.round(value) / 100;
}

function itemSubtotal(item) {
  return toMoney((Number(item.unitPrice ?? item.price) || 0) * (Number(item.qty) || 1));
}

function displayTimeFrom(date, minuteOffset = 0) {
  const copy = new Date(date.getTime() + minuteOffset * 60000);
  return copy.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function displayClockFrom(date, minuteOffset = 0) {
  const copy = new Date(date.getTime() + minuteOffset * 60000);
  return copy.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function allocateDiscount(items, discount) {
  const subtotals = items.map((item) => yuanToCents(itemSubtotal(item)));
  const totalCents = subtotals.reduce((sum, amount) => sum + amount, 0);
  const discountCents = Math.min(yuanToCents(discount), totalCents);
  if (!totalCents || !discountCents) return items.map(() => 0);
  const raw = subtotals.map((amount) => (amount / totalCents) * discountCents);
  const allocated = raw.map(Math.floor);
  let remainder = discountCents - allocated.reduce((sum, amount) => sum + amount, 0);
  raw
    .map((amount, index) => ({ index, fraction: amount - Math.floor(amount) }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ index }) => {
      if (remainder > 0) {
        allocated[index] += 1;
        remainder -= 1;
      }
    });
  return allocated.map(centsToYuan);
}

function normalizeOrderItems(order, rawItems, discount) {
  const sourceItems = Array.isArray(rawItems) ? rawItems : [];
  const allocated = allocateDiscount(sourceItems, discount);
  return sourceItems.map((item, index) => {
    const qty = Math.max(1, Number(item.qty) || 1);
    const unitPrice = Number(item.unitPrice ?? item.price) || 0;
    const subtotal = item.subtotal ?? unitPrice * qty;
    const allocatedDiscount = item.allocatedDiscount ?? allocated[index] ?? 0;
    const decision = item.decision || order.status || "pending";
    return {
      ...item,
      id: item.id || uid(),
      qty,
      unitPrice: toMoney(unitPrice),
      price: toMoney(unitPrice),
      subtotal: toMoney(subtotal),
      allocatedDiscount: toMoney(allocatedDiscount),
      finalAmount: toMoney(item.finalAmount ?? Math.max(0, subtotal - allocatedDiscount)),
      decision: decisionText[decision] ? decision : "pending",
      decidedAt: item.decidedAt || null,
      ledgerDeleted: item.ledgerDeleted || false
    };
  });
}

function estimatePackageWeight(items) {
  const weights = {
    "服饰": 0.4,
    "保健品": 0.35,
    "运动": 2.4,
    "美妆": 0.3,
    "数码": 0.8,
    "其他": 0.45
  };
  const total = items.reduce((sum, item) => {
    const base = weights[item.category || "其他"] || weights["其他"];
    return sum + base * (Number(item.qty) || 1);
  }, 0);
  return Math.max(0.2, Math.round(total * 10) / 10).toFixed(1) + "kg";
}

function createLogisticsTimeline(createdDate) {
  return logisticsTemplates.map(([title, offset, text]) => ({
    title,
    time: displayClockFrom(createdDate, offset),
    text
  }));
}

function normalizeOrders(orders) {
  return (Array.isArray(orders) ? orders : []).map((order) => {
    const rawItems = Array.isArray(order.items) ? order.items : [];
    const rawSubtotal = rawItems.reduce((sum, item) => sum + itemSubtotal(item), 0);
    const payableTotal = toMoney(order.payableTotal ?? order.total ?? rawSubtotal);
    const discount = toMoney(order.discount ?? Math.max(0, rawSubtotal - payableTotal));
    const normalizedItems = normalizeOrderItems(order, rawItems, discount);
    const total = toMoney(order.total && order.payableTotal ? order.total : rawSubtotal || payableTotal);
    const createdTimestamp = order.createdTimestamp || Date.now();
    const createdDate = new Date(createdTimestamp);
    return {
      ...order,
      id: order.id || uid(),
      total,
      discount,
      payableTotal,
      createdTimestamp,
      createdAt: order.createdAt || displayTimeFrom(createdDate),
      dateKey: order.dateKey || dateKey(createdDate),
      timeSlot: order.timeSlot || timeSlot(createdDate),
      logisticsStage: order.logisticsStage ?? 0,
      logisticsTimeline: order.logisticsTimeline || createLogisticsTimeline(createdDate),
      orderNumber: order.orderNumber || `TB${String(createdTimestamp).slice(-10)}`,
      trackingNumber: order.trackingNumber || `YT${String(createdTimestamp).slice(-9)}${normalizedItems.length}`,
      carrier: order.carrier || "逃宝标准达",
      packageWeight: order.packageWeight || estimatePackageWeight(normalizedItems),
      categorySummary: order.categorySummary || categorySummary(normalizedItems),
      items: normalizedItems
    };
  });
}

function orderPayable(order) {
  return toMoney(order?.payableTotal ?? order?.total ?? 0);
}

function ledgerId(order, item) {
  return `${order.id}::${item.id}`;
}

function ledgerRecords(includeDeleted = false) {
  return state.orders
    .flatMap((order) =>
      (order.items || [])
        .filter((item) => includeDeleted || !item.ledgerDeleted)
        .map((item) => ({ order, item, id: ledgerId(order, item) }))
    )
    .sort(
      (a, b) =>
        (b.item.decidedTimestamp || b.order.createdTimestamp || 0) -
        (a.item.decidedTimestamp || a.order.createdTimestamp || 0)
    );
}

function savedRecords() {
  return ledgerRecords().filter(({ item }) => item.decision !== "rational");
}

function savedAmount() {
  return savedRecords().reduce((sum, { item }) => sum + item.finalAmount, 0);
}

function confirmedSavedCount() {
  return ledgerRecords().filter(({ item }) => item.decision === "saved").length;
}

function pendingCount() {
  return ledgerRecords().filter(({ item }) => item.decision === "pending").length;
}

function rationalCount() {
  return ledgerRecords().filter(({ item }) => item.decision === "rational").length;
}

function pendingAmount() {
  return ledgerRecords()
    .filter(({ item }) => item.decision === "pending")
    .reduce((sum, { item }) => sum + item.finalAmount, 0);
}

function pendingOrder() {
  return state.orders.find((order) =>
    (order.items || []).some((item) => item.decision === "pending" && !item.ledgerDeleted)
  );
}

function cartTotal() {
  return selectedCartItems().reduce((sum, item) => sum + item.price * item.qty, 0);
}

function checkoutDiscount() {
  return state.couponClaimed ? Math.min(10, cartTotal()) : 0;
}

function payableTotal() {
  return Math.max(0, cartTotal() - checkoutDiscount());
}

function selectedCartItems() {
  return state.cart.filter((item) => item.selected !== false);
}

function allCartSelected() {
  return state.cart.length > 0 && state.cart.every((item) => item.selected !== false);
}

function selectedScanItems() {
  return state.scanItems.filter((item) => item.selected !== false);
}

function scanItemsReady() {
  const selected = selectedScanItems();
  return selected.length > 0 && selected.every((item) => String(item.title || "").trim() && Number(item.price) > 0);
}

function cartItemCount() {
  return state.cart.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
}

function cartAllTotal() {
  return state.cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
}

function cartItemKey(item) {
  return [item.platform, item.title, item.spec || ""].map((value) => String(value || "").trim().toLowerCase()).join("::");
}

function mergeCartItems(existingItems, incomingItems) {
  const merged = [...existingItems];
  incomingItems.forEach((incoming) => {
    const key = cartItemKey(incoming);
    const index = merged.findIndex((item) => cartItemKey(item) === key);
    if (index === -1) merged.unshift(incoming);
    else {
      merged[index] = {
        ...merged[index],
        ...incoming,
        id: merged[index].id,
        qty: (Number(merged[index].qty) || 1) + (Number(incoming.qty) || 1),
        image: incoming.image || merged[index].image,
        selected: true
      };
    }
  });
  return merged;
}

function scanTotal() {
  return selectedScanItems().reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
}

function dateKey(date = new Date()) {
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function timeSlot(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 23 || hour < 2) return "23:00-02:00";
  if (hour < 6) return "02:00-06:00";
  if (hour < 12) return "06:00-12:00";
  if (hour < 18) return "12:00-18:00";
  return "18:00-23:00";
}

function categorySummary(items) {
  return items.reduce((result, item) => {
    const key = item.category || "其他";
    result[key] = (result[key] || 0) + item.price * item.qty;
    return result;
  }, {});
}

function detectPlatform(link) {
  return platformPatterns.find((item) => item.test.test(link))?.name || "外部购物平台";
}

function guessedTitle(platform) {
  const map = {
    淘宝: "深夜刷到的高心动商品",
    京东: "今晚差点付款的数码/家电",
    小红书: "被种草的生活方式单品",
    抖音: "直播间限时冲动好物",
    拼多多: "看起来很划算的凑单商品"
  };
  return map[platform] || "今晚想买的东西";
}

function guessedPrice(platform) {
  const map = { 淘宝: 299, 京东: 1299, 小红书: 499, 抖音: 199, 拼多多: 89 };
  return map[platform] || 199;
}

function openImport(link = "") {
  const value = link || state.draftLink.trim();
  const platform = detectPlatform(value);
  draftPlatform.value = platform;
  draftTitle.value = guessedTitle(platform);
  draftPrice.value = guessedPrice(platform);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeImport() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function addDraftToCart() {
  const title = draftTitle.value.trim() || "今晚想买的东西";
  const platform = draftPlatform.value.trim() || "外部购物平台";
  const price = Math.max(1, Number(draftPrice.value) || 1);
  const item = {
    id: uid(),
    title,
    platform,
    price,
    qty: 1,
    selected: true,
    note: "明早再问",
    category: "外部商品",
    icon: platform === "京东" ? "📦" : platform === "小红书" ? "🌱" : platform === "抖音" ? "🎥" : "🛍️"
  };
  state.cart = mergeCartItems(state.cart, [item]);
  state.draftLink = "";
  state.view = "cart";
  state.route = null;
  save();
  closeImport();
  render();
}

function addAntiProduct(product) {
  if (!product) return;
  const item = {
    id: uid(),
    title: product.title,
    platform: product.shop || `${product.brand || "逃宝"}旗舰店`,
    price: product.price,
    qty: 1,
    selected: true,
    note: product.tags?.[0] || product.note,
    category: product.category,
    icon: product.icon,
    image: product.image,
    spec: product.specs?.[0] || "默认款"
  };
  state.cart = mergeCartItems(state.cart, [item]);
  showToast(`已加入购物车 · ${product.title}`);
  save();
  render();
}

function removeCartItem(id) {
  state.cart = state.cart.filter((item) => item.id !== id);
  state.pendingDeleteId = null;
  showToast("已移出购物车，今晚少想一件");
  save();
  render();
}

function selectedIds() {
  return selectedCartItems().map((item) => item.id);
}

function removeSelectedItems() {
  const ids = new Set(selectedIds());
  if (!ids.size) return;
  const count = ids.size;
  state.cart = state.cart.filter((item) => !ids.has(item.id));
  showToast(`已移出 ${count} 件商品`);
  save();
  render();
}

function toggleCartItem(id) {
  state.cart = state.cart.map((item) => (item.id === id ? { ...item, selected: item.selected === false } : item));
  save();
  render();
}

function toggleAllCart() {
  const shouldSelect = !allCartSelected();
  state.cart = state.cart.map((item) => ({ ...item, selected: shouldSelect }));
  save();
  render();
}

function changeQty(id, delta) {
  state.cart = state.cart.map((item) =>
    item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
  );
  save();
  render();
}

function showToast(message) {
  state.toast = message;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 1600);
}

function selectPayMethod(method) {
  if (!["支付宝", "微信支付", "银行卡"].includes(method)) return;
  state.payMethod = method;
  save();
  const card = app.querySelector(".pay-method-card");
  if (!card) return;
  const selectedLabel = card.querySelector(".pay-method-head strong");
  if (selectedLabel) selectedLabel.textContent = method;
  card.querySelectorAll("[data-pay-method]").forEach((button) => {
    const active = button.dataset.payMethod === method;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function createOrder() {
  const selectedItems = selectedCartItems();
  if (!selectedItems.length) return;
  const total = toMoney(cartTotal());
  const discount = toMoney(checkoutDiscount());
  const payable = toMoney(payableTotal());
  const now = new Date();
  const createdTimestamp = now.getTime();
  const orderItems = normalizeOrderItems({ status: "pending" }, selectedItems, discount);
  const order = {
    id: uid(),
    items: orderItems,
    total,
    discount,
    payableTotal: payable,
    status: "pending",
    createdTimestamp,
    createdAt: displayTimeFrom(now),
    dateKey: dateKey(now),
    timeSlot: timeSlot(now),
    categorySummary: categorySummary(orderItems),
    logisticsStage: 0,
    logisticsTimeline: createLogisticsTimeline(now),
    orderNumber: `TB${String(createdTimestamp).slice(-10)}`,
    trackingNumber: `YT${String(createdTimestamp).slice(-9)}${orderItems.length}`,
    carrier: "逃宝标准达",
    packageWeight: estimatePackageWeight(orderItems)
  };
  state.orders.unshift(order);
  state.cart = state.cart.filter((item) => item.selected === false);
  state.activeOrderId = order.id;
  state.route = "success";
  save();
  render();
}

function startPayment() {
  if (!selectedCartItems().length) return;
  state.payConfirmOpen = false;
  state.route = "paying";
  render();
  window.setTimeout(() => {
    if (state.route === "paying") createOrder();
  }, 1700);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取图片失败，请重新选择"));
    reader.readAsDataURL(file);
  });
}

function cropImage(image, crop) {
  const canvas = document.createElement("canvas");
  const size = 220;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f5f6f8";
  ctx.fillRect(0, 0, size, size);
  const sx = Math.max(0, Number(crop?.x) || 0) * image.naturalWidth;
  const sy = Math.max(0, Number(crop?.y) || 0) * image.naturalHeight;
  const sw = Math.min(image.naturalWidth - sx, Math.max(1 / image.naturalWidth, Number(crop?.w) || 0) * image.naturalWidth);
  const sh = Math.min(image.naturalHeight - sy, Math.max(1 / image.naturalHeight, Number(crop?.h) || 0) * image.naturalHeight);
  const scale = Math.min(size / sw, size / sh);
  const width = sw * scale;
  const height = sh * scale;
  ctx.drawImage(image, sx, sy, sw, sh, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

async function prepareScreenshot(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("请选择 JPG、PNG 或 WebP 图片");
  if (file.size > 20 * 1024 * 1024) throw new Error("原图超过 20MB，请先裁短或压缩后重试");
  const sourceUrl = URL.createObjectURL(file);
  let bitmap = null;
  try {
    const image = await loadImage(sourceUrl);
    if (typeof image.decode === "function") await image.decode();
    const maxWidth = 1600;
    const maxPixels = 8_000_000;
    const widthScale = Math.min(1, maxWidth / image.naturalWidth);
    const pixelScale = Math.min(1, Math.sqrt(maxPixels / (image.naturalWidth * image.naturalHeight)));
    const scale = Math.min(widthScale, pixelScale);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    // Most phone screenshots are already small enough. Keeping the original bytes
    // avoids mobile canvas decoders occasionally blanking the lower part of long images.
    if (scale === 1 && file.size <= 2_400_000) {
      const dataUrl = await readFileAsDataUrl(file);
      if (dataUrl.length <= 3_400_000) return { dataUrl, width, height };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("当前浏览器无法处理这张图片，请换用 JPG 截图重试");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file);
      ctx.drawImage(bitmap, 0, 0, width, height);
    } else {
      ctx.drawImage(image, 0, 0, width, height);
    }
    let dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    if (dataUrl.length > 3_400_000) dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    if (dataUrl.length > 4_000_000) throw new Error("这张长截图仍然太大，请裁成两张后分别导入");
    return { dataUrl, width, height };
  } finally {
    bitmap?.close?.();
    URL.revokeObjectURL(sourceUrl);
  }
}

function recognitionApiEndpoint() {
  if (window.TAOBAO_ESCAPE_RECOGNITION_API) return window.TAOBAO_ESCAPE_RECOGNITION_API;
  if (window.location.hostname.endsWith("github.io")) return "";
  return "/api/recognize-cart";
}

function normalizeRecognitionItem(item, image) {
  const confidence = Math.max(0, Math.min(1, Number(item.confidence) || 0));
  const priceConfidence = Math.max(0, Math.min(1, Number(item.priceConfidence) || 0));
  const warnings = Array.isArray(item.warnings) ? item.warnings.filter(Boolean) : [];
  return {
    id: uid(),
    title: String(item.title || "").trim(),
    platform: String(item.shop || "淘宝购物车").trim(),
    price: Number(item.price) > 0 ? Number(item.price) : "",
    originalPrice: Number(item.originalPrice) > 0 ? Number(item.originalPrice) : null,
    qty: Math.max(1, Math.round(Number(item.qty) || 1)),
    spec: String(item.spec || "").trim(),
    note: warnings[0] || (priceConfidence >= 0.78 ? "价格已识别，请核对" : "价格可能有歧义，请确认"),
    category: "其他",
    icon: "宝",
    image: item.crop && image ? cropImage(image, item.crop) : "",
    confidence,
    priceConfidence,
    warnings,
    selected: true
  };
}

async function startScreenshotScan(file) {
  const requestId = uid();
  state.scanRequestId = requestId;
  state.scanFileName = file?.name || "淘宝购物车截图";
  state.scanPreview = file ? URL.createObjectURL(file) : "";
  state.scanSource = "";
  state.scanItems = [];
  state.scanStatus = "loading";
  state.scanError = "";
  state.scanMeta = null;
  state.route = "scan";
  render();
  try {
    const prepared = await prepareScreenshot(file);
    if (state.scanRequestId !== requestId) return;
    if (state.scanPreview?.startsWith("blob:")) URL.revokeObjectURL(state.scanPreview);
    state.scanPreview = prepared.dataUrl;
    state.scanSource = prepared.dataUrl;
    render();
    const endpoint = recognitionApiEndpoint();
    if (!endpoint) throw new Error("真实识别服务尚未配置，请稍后重试");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: prepared.dataUrl,
        width: prepared.width,
        height: prepared.height,
        fileName: state.scanFileName
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMessage = typeof result.error === "string" ? result.error : result.error?.message;
      throw new Error(errorMessage || "没有识别到完整商品，请换一张截图重试");
    }
    const image = await loadImage(prepared.dataUrl);
    if (state.scanRequestId !== requestId) return;
    state.scanItems = (result.items || []).map((item) => normalizeRecognitionItem(item, image)).filter((item) => item.title);
    if (!state.scanItems.length) throw new Error("没有识别到完整商品，请上传包含标题和价格的购物车截图");
    state.scanStatus = "success";
    state.scanMeta = result.meta || null;
    state.scanError = "";
  } catch (error) {
    if (state.scanRequestId !== requestId) return;
    state.scanItems = [];
    state.scanStatus = "error";
    state.scanError = error?.message || "识别失败，请重新上传";
  }
  render();
}

function importScanItems() {
  const itemsToImport = selectedScanItems();
  if (!itemsToImport.length) return;
  if (!scanItemsReady()) {
    showToast("请先补全所选商品的名称和价格");
    render();
    return;
  }
  const incomingItems = itemsToImport.map((item) => ({
      id: uid(),
      title: item.title,
      platform: item.platform,
      price: item.price,
      qty: item.qty,
      selected: true,
      note: item.note,
      spec: item.spec,
      category: item.category,
      icon: item.icon,
      image: item.image
    }));
  state.cart = mergeCartItems(state.cart, incomingItems);
  state.scanItems = [];
  state.scanFileName = "";
  state.scanPreview = "";
  state.scanSource = "";
  state.scanStatus = "idle";
  state.scanError = "";
  state.scanMeta = null;
  state.view = "cart";
  state.route = null;
  save();
  render();
}

function updateScanItem(id, field, value) {
  const allowedFields = new Set(["title", "price", "qty", "spec"]);
  if (!allowedFields.has(field)) return;
  state.scanItems = state.scanItems.map((item) => {
    if (item.id !== id) return item;
    if (field === "price") return { ...item, price: Number(value) > 0 ? Number(value) : "", priceConfidence: 1, warnings: [] };
    if (field === "qty") return { ...item, qty: Math.max(1, Math.round(Number(value) || 1)) };
    return { ...item, [field]: value };
  });
}

function toggleScanItem(id) {
  state.scanItems = state.scanItems.map((item) =>
    item.id === id ? { ...item, selected: item.selected === false } : item
  );
  render();
}

function activeOrder() {
  return state.orders.find((order) => order.id === state.activeOrderId) || state.orders[0];
}

function currentLogisticsStage(order) {
  if (!order?.createdTimestamp) return order?.logisticsStage || 0;
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - order.createdTimestamp) / 1000));
  return stageDurations.reduce((stage, seconds, index) => (elapsedSeconds >= seconds ? index : stage), 0);
}

function updateOrderItem(orderId, itemId, updater) {
  state.orders = state.orders.map((order) =>
    order.id === orderId
      ? {
          ...order,
          items: (order.items || []).map((item) => (item.id === itemId ? updater(item, order) : item))
        }
      : order
  );
}

function setItemDecision(orderId, itemId, decision) {
  if (!decisionText[decision]) return;
  updateOrderItem(orderId, itemId, (item) => ({
    ...item,
    decision,
    decidedTimestamp: Date.now(),
    decidedAt: new Date().toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
  }));
  const label = decision === "rational" ? `已调整 -${money.format(state.orders.find((order) => order.id === orderId)?.items.find((item) => item.id === itemId)?.finalAmount || 0)}，这件商品已转为理性购买` : "已确认省下，这件商品继续留在已省金额里";
  showToast(label);
  save();
  render();
}

function openLedgerEditor(recordId) {
  state.editingOrderId = recordId;
  render();
}

function closeLedgerEditor() {
  state.editingOrderId = null;
  render();
}

function updateLedgerOrder() {
  const record = ledgerRecords(true).find((item) => item.id === state.editingOrderId);
  if (!record) return;
  const amountInput = document.querySelector("#ledgerAmount");
  const statusInput = document.querySelector("input[name='ledgerStatus']:checked");
  const nextTotal = toMoney(Math.max(0, Number(amountInput?.value) || 0));
  const nextStatus = statusInput?.value || record.item.decision;
  updateOrderItem(record.order.id, record.item.id, (item) => ({
    ...item,
    finalAmount: nextTotal,
    decision: decisionText[nextStatus] ? nextStatus : item.decision,
    manualAdjusted: true,
    adjustedAt: new Date().toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }));
  state.editingOrderId = null;
  showToast("账本已更新");
  save();
  render();
}

function toggleLedgerOrder(id) {
  const ids = new Set(state.ledgerSelectedIds);
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  state.ledgerSelectedIds = [...ids];
  render();
}

function toggleAllLedgerOrders() {
  const records = state.route === "ledger" ? filteredLedgerRecords() : ledgerRecords();
  state.ledgerSelectedIds =
    state.ledgerSelectedIds.length === records.length ? [] : records.map((record) => record.id);
  render();
}

function deleteSelectedLedgerOrders() {
  const ids = new Set(state.ledgerSelectedIds);
  if (!ids.size) return;
  const count = ids.size;
  state.orders = state.orders
    .map((order) => ({
      ...order,
      items: (order.items || []).map((item) => (ids.has(ledgerId(order, item)) ? { ...item, ledgerDeleted: true } : item))
    }))
    .filter((order) => (order.items || []).some((item) => !item.ledgerDeleted));
  if (!state.orders.some((order) => order.id === state.activeOrderId)) {
    state.activeOrderId = state.orders[0]?.id || null;
  }
  state.ledgerSelectedIds = [];
  state.pendingLedgerDelete = false;
  state.ledgerEditing = false;
  showToast(`已删除 ${count} 条记录`);
  save();
  render();
}

function effectiveOrders() {
  return savedRecords();
}

function todayAmount() {
  const today = dateKey();
  return savedRecords()
    .filter(({ order }) => (order.dateKey || "今天") === today)
    .reduce((sum, { item }) => sum + item.finalAmount, 0);
}

function weekAmount() {
  return savedRecords()
    .slice(0, 7)
    .reduce((sum, { item }) => sum + item.finalAmount, 0);
}

function filteredLedgerRecords() {
  if (state.ledgerFilter === "all") return ledgerRecords();
  return ledgerRecords().filter(({ item }) => item.decision === state.ledgerFilter);
}

function groupLedgerRecordsByDate(records = ledgerRecords()) {
  return records.reduce((result, record) => {
    const { order, item } = record;
    const key = item.decidedTimestamp
      ? dateKey(new Date(item.decidedTimestamp))
      : order.dateKey || order.createdAt?.split(" ")[0] || "今天";
    if (!result[key]) result[key] = [];
    result[key].push(record);
    return result;
  }, {});
}

function ledgerRecordView({ order, item, id }, editing = false) {
  return `
    <article class="ledger-order ${state.ledgerSelectedIds.includes(id) ? "selected" : ""}">
      ${
        editing
          ? `<button class="ledger-check ${state.ledgerSelectedIds.includes(id) ? "checked" : ""}" data-toggle-ledger="${id}" type="button" aria-label="选择记录"></button>`
          : ""
      }
      <div class="ledger-thumb">${item.image ? `<img src="${item.image}" alt="${esc(item.title)}" />` : item.icon || "🛍️"}</div>
      ${
        editing
          ? `<button class="ledger-order-main" data-edit-ledger="${id}" type="button">
              <strong>${esc(item.title || "购物车商品")}</strong>
              <p>×${item.qty} · ${order.timeSlot || "23:00-02:00"} · ${decisionText[item.decision]}${item.manualAdjusted ? " · 手动调整" : ""}</p>
            </button>`
          : `<div class="ledger-order-main">
              <strong>${esc(item.title || "购物车商品")}</strong>
              <p>×${item.qty} · ${order.timeSlot || "23:00-02:00"} · ${decisionText[item.decision]}${item.manualAdjusted ? " · 手动调整" : ""}</p>
            </div>`
      }
      <div class="ledger-order-side">
        <span>${money.format(item.finalAmount)}</span>
        ${editing ? `<i>›</i>` : ""}
      </div>
    </article>
  `;
}

function sumByTimeSlot() {
  const slots = ["18:00-23:00", "23:00-02:00", "02:00-06:00", "06:00-12:00", "12:00-18:00"];
  const totals = Object.fromEntries(slots.map((slot) => [slot, 0]));
  savedRecords().forEach(({ order, item }) => {
    const slot = order.timeSlot || "23:00-02:00";
    totals[slot] = (totals[slot] || 0) + item.finalAmount;
  });
  return totals;
}

function sumByCategory() {
  return savedRecords().reduce((result, { item }) => {
    const category = item.category || "其他";
    result[category] = (result[category] || 0) + item.finalAmount;
    return result;
  }, {});
}

function barRows(data) {
  const entries = Object.entries(data).filter(([, amount]) => amount > 0);
  const max = Math.max(...entries.map(([, amount]) => amount), 1);
  return entries
    .map(
      ([label, amount]) => `
        <div class="ledger-bar">
          <span>${esc(label)}</span>
          <div><i style="width: ${Math.max(8, (amount / max) * 100)}%"></i></div>
          <strong>${money.format(amount)}</strong>
        </div>
      `
    )
    .join("");
}

function shell(content) {
  return `
    <div class="app">
      <div class="content">${content}</div>
      ${bottomNav()}
      ${toastView()}
      ${deleteConfirmView()}
      ${ledgerEditorView()}
      ${ledgerDeleteConfirmView()}
      ${messageDeleteConfirmView()}
    </div>
  `;
}

function toastView() {
  return state.toast ? `<div class="toast">${esc(state.toast)}</div>` : "";
}

function deleteConfirmView() {
  if (!state.pendingDeleteId) return "";
  const item = state.cart.find((cartItem) => cartItem.id === state.pendingDeleteId);
  return `
    <div class="confirm-sheet">
      <div class="confirm-card">
        <h3>移出购物车？</h3>
        <p>${esc(item?.title || "这件商品")} 将从今晚的待定里移出。</p>
        <div class="confirm-actions">
          <button class="ghost-action" data-cancel-delete type="button">取消</button>
          <button class="danger-action" data-confirm-delete="${state.pendingDeleteId}" type="button">移出</button>
        </div>
      </div>
    </div>
  `;
}

function ledgerEditorView() {
  if (!state.editingOrderId) return "";
  const record = ledgerRecords(true).find((item) => item.id === state.editingOrderId);
  if (!record) return "";
  const { item } = record;
  const statusOptions = [
    ["pending", "待明早确认", "先放着，之后再决定"],
    ["saved", "确认省下", "这笔继续计入已省金额"],
    ["rational", "理性购买", "后来还是买了，从已省里移出"]
  ];
  return `
    <div class="confirm-sheet">
      <div class="confirm-card ledger-editor">
        <h3>调整账本记录</h3>
        <p>${esc(item.title || "购物车商品")}</p>
        <label class="field">
          <span>金额</span>
          <input id="ledgerAmount" type="number" min="0" step="0.1" value="${item.finalAmount}" />
        </label>
        <div class="status-options">
          ${statusOptions
            .map(
              ([value, label, help]) => `
                <label class="status-option ${item.decision === value ? "active" : ""}">
                  <input type="radio" name="ledgerStatus" value="${value}" ${item.decision === value ? "checked" : ""} />
                  <span><strong>${label}</strong><em>${help}</em></span>
                </label>
              `
            )
            .join("")}
        </div>
        <div class="confirm-actions">
          <button class="ghost-action" data-close-ledger-editor type="button">取消</button>
          <button class="danger-action" id="saveLedgerEdit" type="button">保存</button>
        </div>
      </div>
    </div>
  `;
}

function ledgerDeleteConfirmView() {
  if (!state.pendingLedgerDelete) return "";
  return `
    <div class="confirm-sheet">
      <div class="confirm-card">
        <h3>删除账本记录？</h3>
        <p>选中的 ${state.ledgerSelectedIds.length} 条记录将被永久删除，已省金额也会同步更新。</p>
        <div class="confirm-actions">
          <button class="ghost-action" data-cancel-ledger-delete type="button">取消</button>
          <button class="danger-action" data-confirm-ledger-delete type="button">删除</button>
        </div>
      </div>
    </div>
  `;
}

function messageDeleteConfirmView() {
  if (!state.pendingMessageDelete) return "";
  return `
    <div class="confirm-sheet">
      <div class="confirm-card">
        <h3>删除消息？</h3>
        <p>选中的 ${state.selectedMessageIds.length} 条消息将从消息列表移除，不会影响订单、物流或账本。</p>
        <div class="confirm-actions">
          <button class="ghost-action" data-cancel-message-delete type="button">取消</button>
          <button class="danger-action" data-confirm-message-delete type="button">删除</button>
        </div>
      </div>
    </div>
  `;
}

function payConfirmView() {
  if (!state.payConfirmOpen) return "";
  return `
    <div class="confirm-sheet">
      <div class="confirm-card payment-confirm">
        <div class="pay-confirm-mark">${paymentIcon(state.payMethod, "pay-confirm-logo")}</div>
        <p>${esc(state.payMethod)}</p>
        <div class="pay-confirm-amount">${money.format(payableTotal())}</div>
        <div class="pay-confirm-detail"><span>付款方式</span><strong>${esc(state.payMethod)}</strong></div>
        <div class="confirm-actions">
          <button class="ghost-action" data-cancel-pay type="button">取消</button>
          <button class="danger-action" data-confirm-pay type="button">确认支付</button>
        </div>
      </div>
    </div>
  `;
}

function messageItems() {
  const orderMessages = state.orders.map((order) => {
    const pending = (order.items || []).filter((item) => item.decision === "pending").length;
    const rational = (order.items || []).filter((item) => item.decision === "rational").length;
    return {
      id: `order-${order.id}`,
      icon: "🚚",
      title: "交易物流",
      text: pending
        ? `包裹正在配送中，明早还有 ${pending} 件商品待确认。`
        : rational
          ? "订单已签收，部分商品已转为理性购买。"
          : "订单已签收，本次消费已计入已省账本。",
      orderId: order.id
    };
  });
  return [
    ...orderMessages,
    { id: "promotion", icon: "🎟️", title: "活动优惠", text: "你有一张店铺优惠券可在结算时使用。" },
    { id: "assistant", icon: "💬", title: "逃宝助手", text: "购物车截图可以一次导入多件商品。" }
  ].filter((message) => !state.deletedMessageIds.includes(message.id));
}

function unreadMessages() {
  return messageItems().filter((message) => !state.readMessageIds.includes(message.id));
}

function markAllMessagesRead() {
  state.readMessageIds = [...new Set([...state.readMessageIds, ...messageItems().map((message) => message.id)])];
  showToast("已全部标为已读");
  save();
  render();
}

function toggleMessage(id) {
  const ids = new Set(state.selectedMessageIds);
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  state.selectedMessageIds = [...ids];
  render();
}

function toggleAllMessages() {
  const messages = messageItems();
  state.selectedMessageIds =
    state.selectedMessageIds.length === messages.length ? [] : messages.map((message) => message.id);
  render();
}

function deleteSelectedMessages() {
  if (!state.selectedMessageIds.length) return;
  const count = state.selectedMessageIds.length;
  state.deletedMessageIds = [...new Set([...state.deletedMessageIds, ...state.selectedMessageIds])];
  state.selectedMessageIds = [];
  state.pendingMessageDelete = false;
  state.messagesManaging = false;
  showToast(`已删除 ${count} 条消息`);
  save();
  render();
}

function bottomNav() {
  const tabs = [
    ["home", "🏠", "首页"],
    ["messages", "💬", "消息"],
    ["cart", "🛒", "购物车"],
    ["mine", "📦", "我的逃宝"]
  ];
  return `
    <nav class="bottom-nav" aria-label="底部导航">
      ${tabs
        .map(
          ([view, icon, label]) => `
            <button class="nav-btn ${state.view === view && !state.route ? "active" : ""}" data-view="${view}" type="button">
              ${view === "messages" && unreadMessages().length ? `<span class="badge">${unreadMessages().length}</span>` : ""}
              ${view === "cart" && state.cart.length ? `<span class="badge">${cartItemCount()}</span>` : ""}
              <i>${icon}</i><span>${label}</span>
            </button>
          `
        )
        .join("")}
    </nav>
  `;
}

function homeProducts() {
  const ids = state.homeTab === "推荐"
    ? recommendationBatches[state.homeShuffle % recommendationBatches.length]
    : channelProductIds[state.homeTab] || [];
  return ids.map((id) => antiProducts.find((item) => item.id === id)).filter(Boolean);
}

function activeProduct() {
  return antiProducts.find((item) => item.id === state.activeProductId) || antiProducts[0];
}

function homeView() {
  const products = homeProducts();
  return shell(`
    <header class="top-hero">
      <div class="brand-row">
        <div class="brand-name"><h1>逃宝</h1><span>万能的逃宝</span></div>
        <button class="saving-link" data-view="mine" type="button">${money.format(savedAmount())}</button>
      </div>
      <div class="tabs">
        ${homeTabs
          .map(
            (tab) => `<button class="tab-chip ${state.homeTab === tab ? "active" : ""}" data-home-tab="${tab}" type="button">${tab}</button>`
          )
          .join("")}
      </div>
    </header>

    <section class="search-card">
      ${
        state.cart.length
          ? `<div class="import-status">
              <div class="import-status-copy">
                <span class="upload-icon">✓</span>
                <div><strong>购物车已搬来 ${cartItemCount()} 件</strong><em>合计 ${money.format(cartAllTotal())}，可以继续逛或去结算</em></div>
              </div>
              <div class="import-status-actions">
                <button class="primary" data-view="cart" type="button">继续结算</button>
                <button class="ghost-upload" id="uploadScreenshot" type="button">再导入一张</button>
              </div>
            </div>`
          : `<button class="upload-card" id="uploadScreenshot" type="button">
              <span class="upload-icon">↑</span>
              <span class="upload-copy">
                <strong>这一车，今晚无痛拿下</strong>
                <em>上传购物车截图，先在逃宝买个痛快</em>
                <small>明早还想要，再认真买下</small>
              </span>
              <span class="upload-cta">上传购物车截图 <b>›</b></span>
            </button>`
      }
      <input id="screenshotInput" type="file" accept="image/*" hidden />
      <div class="secondary-actions">
        <button id="manualInput" type="button">无法上传？手动输入 ›</button>
      </div>
      <p class="prototype-disclosure">独立体验原型 · 非淘宝官方 · 不产生真实交易</p>
    </section>

    <section class="section">
      <div class="quick-grid compact">
        ${[
          ["✓", pendingCount() ? `待确认 ${pendingCount()}` : "待确认", 'data-review-pending="true"'],
          ["省", "已省账本", 'data-route="ledger"'],
          ["券", state.couponClaimed ? "券已领取" : "领券中心", 'data-home-action="coupon"'],
          ["车", "购物车", 'data-view="cart"']
        ]
          .map(([icon, text, action]) => `<button class="quick" ${action} type="button"><i>${icon}</i><span>${text}</span></button>`)
          .join("")}
      </div>
    </section>

    <div class="banner-row">
      <button class="banner dark" data-home-action="coupon" type="button">
        <h3>超级立减</h3>
        <p>热门商品限时直降，领券结算更划算</p>
        <span class="coupon">${state.couponClaimed ? "已领取" : "满 199 减 20"}</span>
      </button>
      <button class="banner" data-home-tab="保健自律" type="button">
        <h3>深夜补给站</h3>
        <p>健康计划已加入购物车，执行进度等待发货</p>
        <span class="coupon">去逛逛</span>
      </button>
    </div>

    <div class="feed-heading">
      <div class="feed-title">
        <span>${state.homeTab === "推荐" ? "猜你喜欢" : state.homeTab}</span>
        ${state.homeTab === "推荐" ? '<button class="feed-refresh" data-home-action="shuffle" type="button">换一批 ↻</button>' : ""}
      </div>
      ${state.homeTab === "推荐" ? "" : `<p class="channel-introduction">“${esc(channelIntroductions[state.homeTab])}”</p>`}
    </div>
    <section class="anti-grid">
      ${products
        .map(
          (item) => `
            <article class="anti-card">
              <button class="product-open" data-product="${item.id}" type="button" aria-label="查看${esc(item.title)}">
                <span class="anti-art" style="--bg: ${item.bg}">${item.image ? `<img src="${item.image}" alt="${esc(item.title)}" />` : item.icon}</span>
              </button>
              <div class="anti-body">
                <button class="product-title" data-product="${item.id}" type="button">${item.title}</button>
                <p class="tagline">${item.note}</p>
                <div class="price">${money.format(item.price)}<small>${item.originalPrice ? ` 券前 ${money.format(item.originalPrice)}` : ""}</small></div>
                <button class="tiny-btn" data-anti="${item.id}" type="button">加入购物车</button>
              </div>
            </article>
          `
        )
        .join("")}
    </section>
  `);
}

function productView() {
  const item = activeProduct();
  return `
    <div class="app">
      <section class="product-page">
        <div class="plain-top"><button class="back" data-route-home="true" type="button">‹</button><h2>商品详情</h2></div>
        <div class="product-hero" style="--bg: ${item.bg}">${item.image ? `<img src="${item.image}" alt="${esc(item.title)}" />` : item.icon}</div>
        <article class="product-info-card">
          <div class="price">${money.format(item.price)}<small>${item.originalPrice ? ` 券前 ${money.format(item.originalPrice)}` : ""}</small></div>
          <h1>${esc(item.title)}</h1>
          <p>${esc(item.note)}</p>
          <div class="product-meta"><span>已售 ${esc(item.sales || "800+")}</span><span>评分 ${item.rating || 4.8}</span><span>7 天无理由</span></div>
        </article>
        <article class="product-info-card">
          <div class="row"><span>优惠</span><strong>${esc(item.tags?.join(" · ") || "店铺券")}</strong></div>
          <div class="row"><span>选择</span><strong>${esc(item.specs?.[0] || "默认款")} · 1 件 ›</strong></div>
          <div class="row"><span>配送</span><strong>明早送达确认单</strong></div>
        </article>
      </section>
      <div class="fixed-pay product-actions">
        <button class="ghost-action" data-view="cart" type="button">购物车 ${cartItemCount() || ""}</button>
        <button class="primary" data-anti="${item.id}" type="button">加入购物车</button>
      </div>
      ${bottomNav()}
      ${toastView()}
    </div>
  `;
}

function scanView() {
  const isLoading = state.scanStatus === "loading";
  const isError = state.scanStatus === "error";
  const isSuccess = state.scanStatus === "success";
  const reviewCount = state.scanItems.filter((item) => !Number(item.price) || item.priceConfidence < 0.78).length;
  const heroTitle = isLoading
    ? "正在读取商品和价格"
    : isError
      ? "这张截图暂时没认出来"
      : `识别到 ${state.scanItems.length} 件商品`;
  const heroHint = isLoading
    ? "通常需要几秒，请不要关闭页面。"
    : isError
      ? state.scanError
      : "导入前请核对商品、数量和实际价格。";
  return `
    <div class="app">
      <section class="scan-page">
        <div class="plain-top"><button class="back" data-route-home="true" type="button">‹</button><h2>导入购物车</h2></div>
        <article class="scan-hero">
          ${state.scanPreview ? `<img src="${state.scanPreview}" alt="购物车截图预览" />` : `<div class="scan-placeholder">淘宝购物车截图</div>`}
          <div>
            <p class="mini">${esc(state.scanFileName || "购物车截图")}</p>
            <h3>${esc(heroTitle)}</h3>
            <p class="hint">${esc(heroHint)}</p>
          </div>
        </article>
        <input id="screenshotInput" type="file" accept="image/jpeg,image/png,image/webp" hidden />
        ${
          isLoading
            ? `<section class="scan-progress" aria-live="polite">
                <span class="scan-spinner" aria-hidden="true"></span>
                <div><strong>Qwen 视觉正在识别</strong><p>理解商品布局 · 区分当前价与优惠 · 定位完整商品</p></div>
              </section>`
            : ""
        }
        ${
          isError
            ? `<section class="scan-error" role="alert">
                <strong>没有生成演示结果</strong>
                <p>${esc(state.scanError)}</p>
                <div><button class="primary" id="uploadScreenshot" type="button">重新上传</button><button class="ghost-action" id="manualInput" type="button">手动添加</button></div>
              </section>`
            : ""
        }
        ${
          isSuccess
            ? `<section class="scan-summary">
                <div><span>已选金额</span><strong>${money.format(scanTotal())}</strong></div>
                <div><span>需要确认</span><strong>${reviewCount} 件</strong></div>
                <div><span>识别方式</span><strong>Qwen 视觉识别</strong></div>
              </section>
              <p class="scan-review-note">AI 可能看错价格。橙色项目请优先核对，确认后再导入。</p>
              <section class="cart-store scan-results">
                <div class="cart-head"><h3>识别结果</h3><span class="sub">已选 ${selectedScanItems().length} 件</span></div>
                ${state.scanItems
                  .map((item) => {
                    const needsReview = !Number(item.price) || item.priceConfidence < 0.78;
                    const confidenceLabel = !Number(item.price) ? "需填写价格" : needsReview ? "请确认价格" : "识别清晰";
                    return `
                      <article class="cart-item scan-result-item ${needsReview ? "needs-review" : ""}">
                        <button class="check ${item.selected !== false ? "checked" : ""}" data-toggle-scan="${item.id}" type="button" aria-label="选择商品"></button>
                        <div class="thumb">${item.image ? `<img src="${item.image}" alt="${esc(item.title)}" />` : item.icon}</div>
                        <div class="item-info">
                          <div class="scan-confidence ${needsReview ? "review" : "clear"}">${confidenceLabel}</div>
                          <label class="scan-edit-title">
                            <span>商品名</span>
                            <input data-scan-item="${item.id}" data-scan-field="title" value="${esc(item.title)}" />
                          </label>
                          <div class="scan-edit-row">
                            <label><span>规格</span><input data-scan-item="${item.id}" data-scan-field="spec" value="${esc(item.spec)}" placeholder="未识别" /></label>
                            <label><span>数量</span><input data-scan-item="${item.id}" data-scan-field="qty" type="number" min="1" value="${item.qty}" /></label>
                          </div>
                          <p class="scan-warning">${esc(item.note)}</p>
                          <label class="scan-price ${needsReview ? "review" : ""}"><span>当前单价 ¥</span><input data-scan-item="${item.id}" data-scan-field="price" type="number" min="0.1" step="0.1" value="${item.price}" placeholder="请填写" /></label>
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </section>`
            : ""
        }
      </section>
      ${
        isSuccess
          ? `<div class="fixed-pay">
              <span>合计 <strong class="danger">${money.format(scanTotal())}</strong></span>
              <button class="primary" id="importScan" ${scanItemsReady() ? "" : "disabled"} type="button">确认并导入</button>
            </div>`
          : ""
      }
      ${bottomNav()}
    </div>
  `;
}

function cartView() {
  if (!state.cart.length) {
    return shell(`
      <header class="page-top">
        <div class="page-title"><h2>购物车（0）</h2><div class="tools"><button data-cart-manage type="button">管理</button></div></div>
      </header>
      <div class="empty">导入一下，逃宝帮你清空购物车</div>
    `);
  }

  return shell(`
    <header class="page-top">
      <div class="page-title">
        <h2>购物车（${state.cart.length}）</h2>
        <div class="tools"><button data-cart-manage type="button">${state.cartManaging ? "完成" : "管理"}</button></div>
      </div>
    </header>
    <section class="cart-store">
      <div class="cart-head">
        <h3>逃宝 明早再说旗舰店 ›</h3>
        <button class="coupon-link ${state.couponClaimed ? "claimed" : ""}" data-claim-coupon type="button">${
          state.couponClaimed ? "满减券已领取" : "领满减券 ›"
        }</button>
      </div>
      ${state.cart
        .map(
          (item) => `
            <article class="cart-item">
              <button class="check ${item.selected === false ? "" : "checked"}" data-toggle-item="${item.id}" type="button" aria-label="选择商品"></button>
              <div class="thumb">${item.image ? `<img src="${item.image}" alt="${esc(item.title)}" />` : item.icon}</div>
              <div class="item-info">
                <div class="item-title">${esc(item.title)}</div>
                <div class="spec">${esc(item.platform)}${item.spec ? "；" + esc(item.spec) : ""}; 数量 ×${item.qty} ›</div>
                <div class="labels"><span>${state.couponClaimed ? "满减券已用" : "满减券待领"}</span><span>明早确认</span><span>${esc(item.note)}</span></div>
                <div class="item-bottom">
                  <span class="price">${money.format(item.price)}</span>
                  <div class="qty-stepper">
                    <button data-qty-dec="${item.id}" type="button">−</button>
                    <strong>${item.qty}</strong>
                    <button data-qty-inc="${item.id}" type="button">+</button>
                  </div>
                </div>
                <button class="tiny-btn" data-ask-remove="${item.id}" type="button">不放了</button>
              </div>
            </article>
          `
        )
        .join("")}
    </section>
    <div class="settle-bar">
      <button class="select-all-control" id="toggleAll" type="button" aria-label="全选">
        <i class="select-all-check ${allCartSelected() ? "checked" : ""}"></i>
        <span>全选</span>
      </button>
      ${
        state.cartManaging
          ? `<div class="total">已选：<strong>${selectedCartItems().length}</strong><div class="sub">管理今晚待定商品</div></div>
             <button class="danger-settle" id="deleteSelected" ${selectedCartItems().length ? "" : "disabled"} type="button">删除</button>`
          : `<div class="total">合计：<strong>${money.format(cartTotal())}</strong><div class="sub">预计已省 ${money.format(cartTotal())}</div></div>
             <button id="goCheckout" ${selectedCartItems().length ? "" : "disabled"} type="button">${
               selectedCartItems().length ? "结算" : "请选择"
             }</button>`
      }
    </div>
  `);
}

function checkoutView() {
  const checkoutItems = selectedCartItems();
  return `
    <div class="app">
      <section class="checkout-page">
        <div class="plain-top"><button class="back" data-back="cart" type="button">‹</button><h2>确认订单</h2></div>
        <article class="address-card">
          <strong>明天的你 09:00 后可签收</strong>
          <span class="sub">预计送达：一个问题「你现在还想买吗？」</span>
        </article>
        <article class="order-card">
          <h3>逃宝 明早再说旗舰店</h3>
          ${checkoutItems
            .map(
              (item) => `
                <div class="cart-item">
                  <div class="thumb">${item.image ? `<img src="${item.image}" alt="${esc(item.title)}" />` : item.icon}</div>
                  <div class="item-info">
                    <div class="item-title">${esc(item.title)}</div>
                    <div class="labels"><span>7 天价保</span><span>极速退款</span></div>
                    <div class="price">${money.format(item.price)} <small>×${item.qty}</small></div>
                  </div>
                </div>
              `
            )
            .join("")}
        </article>
        <article class="pay-card">
          <div class="row"><span>配送方式</span><strong>逃宝标准达</strong></div>
          <div class="row"><span>店铺优惠</span><strong>${state.couponClaimed ? "满减券已使用" : "可用满减券"}</strong></div>
          <div class="row"><span>预计送达</span><strong>明早 09:00 前</strong></div>
        </article>
        <article class="pay-card">
          <div class="row"><span>商品金额</span><strong>${money.format(cartTotal())}</strong></div>
          <div class="row"><span>店铺优惠${state.couponClaimed ? "（已使用）" : ""}</span><strong class="danger">-${money.format(checkoutDiscount())}</strong></div>
          <div class="row"><span>运费</span><strong>¥0</strong></div>
          <div class="row"><span>应付总额</span><strong class="danger">${money.format(payableTotal())}</strong></div>
        </article>
        <article class="pay-card pay-method-card">
          <div class="pay-methods">
            <div class="pay-method-head"><span>支付方式</span><strong>${esc(state.payMethod)}</strong></div>
            <div class="pay-method-grid">
              ${["支付宝", "微信支付", "银行卡"]
                .map(
                  (method) => `
                    <button class="${state.payMethod === method ? "active" : ""}" data-pay-method="${method}" aria-pressed="${state.payMethod === method}" type="button">
                      ${paymentIcon(method, "pay-method-logo")}
                      <span>${method}</span>
                    </button>
                  `
                )
                .join("")}
            </div>
          </div>
          <p class="hint">请选择本次订单的支付方式。</p>
        </article>
      </section>
      <div class="fixed-pay"><span>合计 <strong class="danger">${money.format(payableTotal())}</strong></span><button class="primary" id="payNow" type="button">提交订单</button></div>
      ${payConfirmView()}
      ${bottomNav()}
    </div>
  `;
}

function payingView() {
  return `
    <div class="app">
      <section class="success-page">
        <article class="paying-card">
          <div class="pay-spinner"></div>
          <p class="mini">${esc(state.payMethod)} · ${money.format(payableTotal())}</p>
          <h2>正在确认支付</h2>
          <div class="paying-steps">
            <span>核对订单金额</span>
            <span>验证支付方式</span>
            <span>生成交易订单</span>
          </div>
        </article>
      </section>
      ${bottomNav()}
    </div>
  `;
}

function successView() {
  const order = activeOrder();
  return `
    <div class="app">
      <section class="success-page">
        <div class="success-mark">✓</div>
        <article class="result-card">
          <p class="mini">${esc(state.payMethod)} · ${money.format(orderPayable(order))}</p>
          <h2>支付成功</h2>
          <div class="saved-big">+${money.format(orderPayable(order))}</div>
          <p class="hint">已计入已省金额，其中 ${money.format(orderPayable(order))} 待明早逐件确认。这是逃宝体验订单，未发起真实扣款。</p>
          <button class="primary full" data-route="logistics" type="button">查看交易物流</button>
        </article>
      </section>
      ${bottomNav()}
    </div>
  `;
}

function logisticsView() {
  const order = activeOrder();
  const stage = currentLogisticsStage(order);
  const timeline = order?.logisticsTimeline || [];
  return `
    <div class="app">
      <section class="logistics-page">
        <div class="plain-top"><button class="back" data-route="success" type="button">‹</button><h2>交易物流</h2></div>
        <article class="timeline">
          ${timeline
            .map(
              (step, index) => `
                <div class="timeline-step ${index < stage ? "done" : index === stage ? "current" : "future"}">
                  <span class="dot"></span>
                  <div><h3>${esc(step.title)}</h3><p><strong>${index <= stage ? step.time : "预计 " + step.time}</strong> · ${esc(step.text)}</p></div>
                </div>
              `
            )
            .join("")}
        </article>
        <article class="pay-card">
          <div class="row"><span>订单号</span><strong>${esc(order?.orderNumber || "-")}</strong></div>
          <div class="row"><span>运单号</span><strong>${esc(order?.trackingNumber || "-")}</strong></div>
          <div class="row"><span>承运方</span><strong>${esc(order?.carrier || "逃宝标准达")}</strong></div>
          <div class="row"><span>商品数量</span><strong>${(order?.items || []).length} 件 SKU</strong></div>
          <div class="row"><span>包裹重量</span><strong>${esc(order?.packageWeight || "0.4kg")}</strong></div>
          <div class="row"><span>收货备注</span><strong>明早本人签收</strong></div>
        </article>
        <button class="primary full" data-route="review" type="button">快进到明早签收</button>
      </section>
      ${bottomNav()}
    </div>
  `;
}

function reviewView() {
  const order = activeOrder();
  if (!order) return homeView();
  const pendingItems = (order.items || []).filter((item) => item.decision === "pending");
  return `
    <div class="app">
      <section class="review-page">
        <div class="plain-top"><button class="back" ${state.reviewReturn === "mine" ? `data-view="mine"` : `data-route="logistics"`} type="button">‹</button><h2>明早问题已送达</h2></div>
        <article class="result-card">
          <p class="mini">昨晚的你很想买它</p>
          <h2>今天的你，逐件看看还想要吗？</h2>
          <p class="hint">可以先处理一部分，没选的商品会继续保持待确认。</p>
        </article>
        <section class="review-list">
          ${(order.items || [])
            .map(
              (item) => `
                <article class="review-item ${item.decision}">
                  <div class="thumb">${item.image ? `<img src="${item.image}" alt="${esc(item.title)}" />` : item.icon || "🛍️"}</div>
                  <div class="item-info">
                    <div class="item-title">${esc(item.title)}</div>
                    <div class="spec">${esc(item.spec || "默认规格")}；数量 ×${item.qty}</div>
                    <div class="price">${money.format(item.finalAmount)}</div>
                    <div class="decision-pill">${decisionText[item.decision]}</div>
                    ${
                      item.decision === "pending"
                        ? `<div class="review-actions">
                            <button class="primary" data-decision-item="${order.id}::${item.id}" data-decision="saved" type="button">不想要了</button>
                            <button class="tiny-btn" data-decision-item="${order.id}::${item.id}" data-decision="rational" type="button">还想要</button>
                          </div>`
                        : `<p class="hint">${item.decision === "rational" ? "已调整出已省金额" : "继续保留在已省金额"}${item.decidedAt ? " · " + esc(item.decidedAt) : ""}</p>`
                    }
                  </div>
                </article>
              `
            )
            .join("")}
        </section>
        <button class="primary full" data-view="mine" type="button">${pendingItems.length ? `稍后继续，返回已省账本` : "完成确认，查看已省账本"}</button>
      </section>
      ${bottomNav()}
    </div>
  `;
}

function messagesView() {
  const messages = messageItems();
  const unreadCount = unreadMessages().length;
  return shell(`
    <header class="page-top">
      <div class="page-title">
        <h2>消息${unreadCount ? `（${unreadCount}）` : ""}</h2>
        <div class="tools message-tools">
          ${!state.messagesManaging && unreadCount ? `<button data-read-all type="button">全部已读</button>` : ""}
          <button class="${state.messagesManaging ? "active" : ""}" data-message-manage type="button">${state.messagesManaging ? "完成" : "管理"}</button>
        </div>
      </div>
    </header>
    <section class="message-panel">
      ${messages
        .map(
          (message) => `
            <article class="message-item ${state.readMessageIds.includes(message.id) ? "read" : ""} ${state.selectedMessageIds.includes(message.id) ? "selected" : ""}">
              ${
                state.messagesManaging
                  ? `<button class="message-check ${state.selectedMessageIds.includes(message.id) ? "checked" : ""}" data-toggle-message="${message.id}" type="button" aria-label="选择消息"></button>`
                  : ""
              }
              <button class="message-open" ${message.orderId && !state.messagesManaging ? `data-open-order="${message.orderId}" data-message-id="${message.id}"` : `data-read-message="${message.id}"`} type="button">
              <div class="message-icon">${message.icon}</div>
              <div class="message-main">
                <strong>${message.title}</strong>
                <p>${message.text}</p>
              </div>
              ${state.readMessageIds.includes(message.id) ? "" : `<span class="unread-dot"></span>`}
              </button>
            </article>
          `
        )
        .join("")}
      ${messages.length ? "" : `<div class="empty">暂无消息</div>`}
    </section>
    ${
      state.messagesManaging && messages.length
        ? `<div class="message-manage-bar">
            <button data-toggle-all-messages type="button">${state.selectedMessageIds.length === messages.length ? "取消全选" : "全选"}</button>
            <span>已选 ${state.selectedMessageIds.length} 条</span>
            <button class="delete" data-delete-messages ${state.selectedMessageIds.length ? "" : "disabled"} type="button">删除</button>
          </div>`
        : ""
    }
  `);
}

function mineView() {
  const recentRecords = ledgerRecords().slice(0, 3);
  const latestOrder = state.orders[0];
  const nextOrder = pendingOrder();
  const nextItem = nextOrder?.items?.find((item) => item.decision === "pending" && !item.ledgerDeleted);
  const completedItems = confirmedSavedCount() + rationalCount();

  return shell(`
    <header class="account-profile-head">
      <div class="account-identity">
        <div class="profile-avatar" aria-hidden="true"><span>逃</span><i></i></div>
        <div>
          <p>我的逃宝</p>
          <h2>${esc(state.profile.nickname)}</h2>
          <span>逃宝号 ${esc(state.profile.id)}</span>
        </div>
      </div>
      <span class="member-level">99VIP</span>
    </header>

    <section class="account-assets-band">
      <div class="asset-overview">
        <div><span>累计已省</span><strong>${money.format(savedAmount())}</strong></div>
        ${
          pendingCount()
            ? `<button data-review-pending type="button">去确认 ${pendingCount()} 件</button>`
            : `<span class="confirmed-label">已全部确认</span>`
        }
      </div>
      <p>${pendingCount() ? `还有 ${money.format(pendingAmount())} 等你明早做决定` : "今晚的商品都已经完成确认"}</p>
      <div class="asset-summary">
        <div><strong>${money.format(todayAmount())}</strong><span>今日已省</span></div>
        <div><strong>${money.format(weekAmount())}</strong><span>本周已省</span></div>
        <div><strong>${state.couponClaimed ? 1 : 0}</strong><span>可用优惠券</span></div>
      </div>
    </section>

    ${
      nextItem
        ? `<section class="pending-focus-band">
            <div class="account-section-head"><div><span>待你确认</span><h3>今天还想要吗？</h3></div><strong>${pendingCount()} 件</strong></div>
            <article class="pending-product">
              <div class="ledger-thumb">${nextItem.image ? `<img src="${nextItem.image}" alt="${esc(nextItem.title)}" />` : nextItem.icon || "🛍️"}</div>
              <div><strong>${esc(nextItem.title)}</strong><span>${esc(nextItem.spec || "默认规格")} · 数量 ×${nextItem.qty}</span></div>
              <div class="pending-product-action"><strong>${money.format(nextItem.finalAmount)}</strong><button data-review-pending type="button">去确认</button></div>
            </article>
          </section>`
        : ""
    }

    <section class="account-order-band">
      <div class="account-section-head"><h3>我的订单</h3><span>${state.orders.length} 笔体验订单</span></div>
      <div class="order-status-grid">
        <button ${pendingCount() ? "data-review-pending" : "disabled"} type="button"><i class="status-warm" aria-hidden="true">⏱</i><strong>${pendingCount()}</strong><span>待确认</span></button>
        <button ${latestOrder ? `data-open-order="${latestOrder.id}"` : "disabled"} type="button"><i class="status-blue" aria-hidden="true">🚚</i><strong>${state.orders.length}</strong><span>配送中</span></button>
        <button data-mine-target="ledger-panel" type="button"><i class="status-green" aria-hidden="true">✓</i><strong>${completedItems}</strong><span>已处理</span></button>
      </div>
    </section>

    <section class="ledger-panel">
      <div class="ledger-title">
        <div><h3>最近记录</h3><span>按商品查看每一次决定</span></div>
        <button data-route="ledger" type="button">查看全部 ›</button>
      </div>
      <div class="recent-ledger-list">
        ${recentRecords.map((record) => ledgerRecordView(record)).join("") || `<div class="empty">还没有记录。完成一笔体验订单后，这里会出现最近的决定。</div>`}
      </div>
    </section>

    <section class="prototype-info" aria-labelledby="prototypeInfoTitle">
      <div class="prototype-info-head">
        <span>关于产品</span>
        <h3 id="prototypeInfoTitle">逃宝是什么</h3>
      </div>
      <p>逃宝是一款消费冲动代偿体验原型：今晚先在这里完成一次模拟购买，明早再判断是否真的需要。</p>
      <ol class="prototype-steps">
        <li><i>1</i><span><strong>导入</strong>上传购物车截图，或手动添加商品</span></li>
        <li><i>2</i><span><strong>体验</strong>完成模拟结算，不会发生真实扣款或发货</span></li>
        <li><i>3</i><span><strong>确认</strong>第二天重新决定省下，还是认真买下</span></li>
      </ol>
      <div class="prototype-legal-note">
        <strong>原型与隐私说明</strong>
        <p>本项目为独立、非商业产品原型，与淘宝、支付宝、微信及页面所示品牌不存在隶属、授权、合作或背书关系。使用智能识别时，截图会经逃宝服务端转发至阿里云百炼 Qwen 视觉模型，识别完成后本项目不主动保存原图；请避免选择含姓名、地址、手机号等个人信息的图片。</p>
        <p>页面中的第三方名称、商标与商品图片权利归其各自权利人所有，仅用于原型研究与功能演示，不代表已取得公开传播或商业使用授权。</p>
      </div>
    </section>
  `);
}

function ledgerView() {
  const pageSize = 20;
  const records = filteredLedgerRecords();
  const visibleRecords = records.slice(0, state.ledgerPage * pageSize);
  const grouped = groupLedgerRecordsByDate(visibleRecords);
  const days = Object.entries(grouped);
  const openDays = Array.isArray(state.ledgerOpenDays) ? state.ledgerOpenDays : days.slice(0, 1).map(([day]) => day);
  const filters = [
    ["all", "全部"],
    ["saved", "确认省下"],
    ["rational", "认真买下"],
    ["pending", "待确认"]
  ];
  const daySections = days
    .map(([day, dayRecords]) => {
      const isOpen = openDays.includes(day);
      const total = dayRecords.reduce((sum, { item }) => sum + item.finalAmount, 0);
      return `
        <section class="ledger-day full-ledger-day">
          <button class="ledger-day-toggle" data-ledger-day="${esc(day)}" type="button" aria-expanded="${isOpen}">
            <span><strong>${esc(day)}</strong><em>${dayRecords.length} 件商品</em></span>
            <span>${money.format(total)} ${isOpen ? "⌃" : "⌄"}</span>
          </button>
          ${isOpen ? `<div class="ledger-day-records">${dayRecords.map((record) => ledgerRecordView(record, state.ledgerEditing)).join("")}</div>` : ""}
        </section>
      `;
    })
    .join("");

  return shell(`
    <header class="ledger-page-head">
      <div class="plain-top"><button class="back" data-view="mine" type="button">‹</button><div><span>我的逃宝</span><h2>全部记录</h2></div></div>
      <div class="ledger-page-summary"><div><span>累计已省</span><strong>${money.format(savedAmount())}</strong></div><div><span>共记录</span><strong>${ledgerRecords().length} 件</strong></div></div>
    </header>
    <section class="ledger-filter-bar" aria-label="记录筛选">
      ${filters
        .map(([value, label]) => `<button class="${state.ledgerFilter === value ? "active" : ""}" data-ledger-filter="${value}" type="button">${label}</button>`)
        .join("")}
    </section>
    <section class="full-ledger-panel">
      <div class="ledger-title">
        <div><h3>${filters.find(([value]) => value === state.ledgerFilter)?.[1] || "全部"}</h3><span>${records.length} 条记录</span></div>
        <button class="${state.ledgerEditing ? "active" : ""}" data-ledger-editing type="button">${state.ledgerEditing ? "完成" : "管理"}</button>
      </div>
      ${daySections || `<div class="empty">这个分类下还没有记录。</div>`}
      ${visibleRecords.length < records.length ? `<button class="ledger-load-more" data-ledger-more type="button">加载更多</button>` : ""}
    </section>
    ${
      state.ledgerEditing && records.length
        ? `<div class="ledger-manage-bar">
            <button data-toggle-all-ledger type="button">${state.ledgerSelectedIds.length === records.length ? "取消全选" : "全选"}</button>
            <span>已选 ${state.ledgerSelectedIds.length} 条</span>
            <button class="delete" data-ask-ledger-delete ${state.ledgerSelectedIds.length ? "" : "disabled"} type="button">删除</button>
          </div>`
        : ""
    }
  `);
}

const scrollContainerClasses = ["content", "checkout-page", "scan-page", "review-page", "logistics-page", "product-page", "success-page"];
let renderedScreenKey = null;

function screenKey() {
  return state.route ? `route:${state.route}` : `view:${state.view}`;
}

function captureScrollPositions() {
  return scrollContainerClasses
    .map((className) => {
      const element = app.querySelector(`.${className}`);
      return element ? [className, element.scrollTop] : null;
    })
    .filter(Boolean);
}

function restoreScrollPositions(positions) {
  positions.forEach(([className, scrollTop]) => {
    const element = app.querySelector(`.${className}`);
    if (element) element.scrollTop = scrollTop;
  });
}

function render() {
  const nextScreenKey = screenKey();
  const scrollPositions = renderedScreenKey === nextScreenKey ? captureScrollPositions() : [];
  if (state.route === "checkout") app.innerHTML = checkoutView();
  else if (state.route === "scan") app.innerHTML = scanView();
  else if (state.route === "product") app.innerHTML = productView();
  else if (state.route === "paying") app.innerHTML = payingView();
  else if (state.route === "success") app.innerHTML = successView();
  else if (state.route === "logistics") app.innerHTML = logisticsView();
  else if (state.route === "review") app.innerHTML = reviewView();
  else if (state.route === "ledger") app.innerHTML = ledgerView();
  else if (state.view === "cart") app.innerHTML = cartView();
  else if (state.view === "messages") app.innerHTML = messagesView();
  else if (state.view === "mine") app.innerHTML = mineView();
  else app.innerHTML = homeView();
  renderedScreenKey = nextScreenKey;
  restoreScrollPositions(scrollPositions);
}

app.addEventListener("input", (event) => {
  if (event.target.id === "linkInput") state.draftLink = event.target.value;
  const scanInput = event.target.closest("[data-scan-item][data-scan-field]");
  if (scanInput) {
    updateScanItem(scanInput.dataset.scanItem, scanInput.dataset.scanField, scanInput.value);
    const total = money.format(scanTotal());
    const summaryAmount = app.querySelector(".scan-summary div:first-child strong");
    const footerAmount = app.querySelector(".fixed-pay .danger");
    const importButton = app.querySelector("#importScan");
    if (summaryAmount) summaryAmount.textContent = total;
    if (footerAmount) footerAmount.textContent = total;
    if (importButton) importButton.disabled = !scanItemsReady();
  }
});

app.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  const routeButton = event.target.closest("[data-route]");
  const backButton = event.target.closest("[data-back]");
  const antiButton = event.target.closest("[data-anti]");
  const askRemoveButton = event.target.closest("[data-ask-remove]");
  const confirmDeleteButton = event.target.closest("[data-confirm-delete]");
  const payMethodButton = event.target.closest("[data-pay-method]");
  const editLedgerButton = event.target.closest("[data-edit-ledger]");
  const decisionButton = event.target.closest("[data-decision]");
  const decisionItemButton = event.target.closest("[data-decision-item]");
  const openOrder = event.target.closest("[data-open-order]");
  const homeTabButton = event.target.closest("[data-home-tab]");
  const homeActionButton = event.target.closest("[data-home-action]");
  const productButton = event.target.closest("[data-product]");
  const pendingReviewButton = event.target.closest("[data-review-pending]");
  const mineTargetButton = event.target.closest("[data-mine-target]");
  const ledgerFilterButton = event.target.closest("[data-ledger-filter]");
  const ledgerDayButton = event.target.closest("[data-ledger-day]");

  if (event.target.closest("#manualInput")) {
    state.draftLink = "";
    openImport("manual");
  }
  if (event.target.closest("#uploadScreenshot")) app.querySelector("#screenshotInput")?.click();
  if (event.target.closest("#importScan")) importScanItems();
  const toggleScanButton = event.target.closest("[data-toggle-scan]");
  if (toggleScanButton) toggleScanItem(toggleScanButton.dataset.toggleScan);
  if (event.target.closest("[data-claim-coupon]")) {
    state.couponClaimed = true;
    showToast("满 199 减 20 券已领取，结算自动抵扣");
    save();
    render();
  }
  if (homeTabButton) {
    state.homeTab = homeTabButton.dataset.homeTab;
    state.homeShuffle = 0;
    showToast(`已切换到${state.homeTab}`);
    render();
  }
  if (homeActionButton?.dataset.homeAction === "coupon") {
    if (!state.couponClaimed) {
      state.couponClaimed = true;
      showToast("满 199 减 20 券已放入账户，结算自动抵扣");
      save();
    } else showToast("满减券已经在账户里");
    render();
  }
  if (homeActionButton?.dataset.homeAction === "shuffle") {
    state.homeShuffle += 1;
    showToast("已换一批商品");
    render();
  }
  if (productButton) {
    state.activeProductId = productButton.dataset.product;
    state.route = "product";
    render();
  }
  if (pendingReviewButton) {
    const order = pendingOrder();
    if (!order) {
      showToast("当前没有待确认商品");
      render();
    } else {
      state.activeOrderId = order.id;
      state.reviewReturn = "mine";
      state.route = "review";
      save();
      render();
    }
  }
  if (mineTargetButton) {
    const targets = { "ledger-panel": ".ledger-panel" };
    const target = app.querySelector(targets[mineTargetButton.dataset.mineTarget]);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (ledgerFilterButton) {
    state.ledgerFilter = ledgerFilterButton.dataset.ledgerFilter;
    state.ledgerPage = 1;
    state.ledgerSelectedIds = [];
    state.ledgerOpenDays = Object.keys(groupLedgerRecordsByDate(filteredLedgerRecords())).slice(0, 1);
    render();
  }
  if (ledgerDayButton) {
    const days = new Set(state.ledgerOpenDays || []);
    if (days.has(ledgerDayButton.dataset.ledgerDay)) days.delete(ledgerDayButton.dataset.ledgerDay);
    else days.add(ledgerDayButton.dataset.ledgerDay);
    state.ledgerOpenDays = [...days];
    render();
  }
  if (event.target.closest("[data-ledger-more]")) {
    state.ledgerPage += 1;
    render();
  }
  const toggleItem = event.target.closest("[data-toggle-item]");
  const qtyInc = event.target.closest("[data-qty-inc]");
  const qtyDec = event.target.closest("[data-qty-dec]");
  if (event.target.closest("#toggleAll")) toggleAllCart();
  if (event.target.closest("[data-cart-manage]")) {
    state.cartManaging = !state.cartManaging;
    render();
  }
  if (event.target.closest("#deleteSelected")) removeSelectedItems();
  if (event.target.closest("[data-ledger-editing]")) {
    state.ledgerEditing = !state.ledgerEditing;
    state.ledgerSelectedIds = [];
    state.editingOrderId = null;
    render();
  }
  const toggleLedgerButton = event.target.closest("[data-toggle-ledger]");
  if (toggleLedgerButton) toggleLedgerOrder(toggleLedgerButton.dataset.toggleLedger);
  if (event.target.closest("[data-toggle-all-ledger]")) toggleAllLedgerOrders();
  if (event.target.closest("[data-ask-ledger-delete]") && state.ledgerSelectedIds.length) {
    state.pendingLedgerDelete = true;
    render();
  }
  if (event.target.closest("[data-cancel-ledger-delete]")) {
    state.pendingLedgerDelete = false;
    render();
  }
  if (event.target.closest("[data-confirm-ledger-delete]")) deleteSelectedLedgerOrders();
  if (editLedgerButton) openLedgerEditor(editLedgerButton.dataset.editLedger);
  if (event.target.closest("[data-close-ledger-editor]")) closeLedgerEditor();
  if (event.target.closest("#saveLedgerEdit")) updateLedgerOrder();
  if (payMethodButton) {
    selectPayMethod(payMethodButton.dataset.payMethod);
  }
  if (toggleItem) toggleCartItem(toggleItem.dataset.toggleItem);
  if (qtyInc) changeQty(qtyInc.dataset.qtyInc, 1);
  if (qtyDec) changeQty(qtyDec.dataset.qtyDec, -1);
  if (event.target.closest("#goCheckout")) {
    if (!selectedCartItems().length) return;
    state.route = "checkout";
    render();
  }
  if (event.target.closest("#payNow")) {
    state.payConfirmOpen = true;
    render();
  }
  if (event.target.closest("[data-cancel-pay]")) {
    state.payConfirmOpen = false;
    render();
  }
  if (event.target.closest("[data-confirm-pay]")) startPayment();
  if (event.target.closest("[data-read-all]")) markAllMessagesRead();
  if (event.target.closest("[data-message-manage]")) {
    state.messagesManaging = !state.messagesManaging;
    state.selectedMessageIds = [];
    render();
  }
  const toggleMessageButton = event.target.closest("[data-toggle-message]");
  if (toggleMessageButton) toggleMessage(toggleMessageButton.dataset.toggleMessage);
  if (event.target.closest("[data-toggle-all-messages]")) toggleAllMessages();
  if (event.target.closest("[data-delete-messages]") && state.selectedMessageIds.length) {
    state.pendingMessageDelete = true;
    render();
  }
  if (event.target.closest("[data-cancel-message-delete]")) {
    state.pendingMessageDelete = false;
    render();
  }
  if (event.target.closest("[data-confirm-message-delete]")) deleteSelectedMessages();
  const readMessageButton = event.target.closest("[data-read-message]");
  if (readMessageButton && !state.messagesManaging) {
    state.readMessageIds = [...new Set([...state.readMessageIds, readMessageButton.dataset.readMessage])];
    save();
    render();
  }
  if (viewButton) {
    if (state.route === "scan") state.scanRequestId = null;
    if (state.route === "ledger") {
      state.ledgerEditing = false;
      state.ledgerSelectedIds = [];
    }
    state.view = viewButton.dataset.view;
    state.route = null;
    render();
  }
  if (routeButton) {
    if (routeButton.dataset.route === "review") state.reviewReturn = "logistics";
    if (routeButton.dataset.route === "ledger") {
      state.ledgerFilter = "all";
      state.ledgerPage = 1;
      state.ledgerEditing = false;
      state.ledgerSelectedIds = [];
      state.ledgerOpenDays = Object.keys(groupLedgerRecordsByDate()).slice(0, 1);
    }
    state.route = routeButton.dataset.route;
    render();
  }
  if (backButton) {
    state.view = backButton.dataset.back;
    state.route = null;
    render();
  }
  if (event.target.closest("[data-route-home]")) {
    if (state.route === "scan") state.scanRequestId = null;
    state.view = "home";
    state.route = null;
    render();
  }
  if (antiButton) addAntiProduct(antiProducts.find((item) => item.id === antiButton.dataset.anti));
  if (askRemoveButton) {
    state.pendingDeleteId = askRemoveButton.dataset.askRemove;
    render();
  }
  if (event.target.closest("[data-cancel-delete]")) {
    state.pendingDeleteId = null;
    render();
  }
  if (confirmDeleteButton) removeCartItem(confirmDeleteButton.dataset.confirmDelete);
  if (decisionButton && decisionItemButton) {
    const [orderId, itemId] = decisionItemButton.dataset.decisionItem.split("::");
    setItemDecision(orderId, itemId, decisionButton.dataset.decision);
  }
  if (openOrder) {
    const messageId = openOrder.dataset.messageId;
    if (messageId) state.readMessageIds = [...new Set([...state.readMessageIds, messageId])];
    state.activeOrderId = openOrder.dataset.openOrder;
    state.route = "logistics";
    save();
    render();
  }
});

app.addEventListener("change", (event) => {
  if (event.target.id === "screenshotInput") {
    const file = event.target.files?.[0];
    if (file) startScreenshotScan(file);
    event.target.value = "";
  }
  const scanInput = event.target.closest("[data-scan-item][data-scan-field]");
  if (scanInput) {
    updateScanItem(scanInput.dataset.scanItem, scanInput.dataset.scanField, scanInput.value);
    render();
  }
});

document.querySelector("#closeModal").addEventListener("click", closeImport);
document.querySelector("#confirmImport").addEventListener("click", addDraftToCart);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeImport();
});

render();
