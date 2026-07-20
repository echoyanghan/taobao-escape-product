import test from "node:test";
import assert from "node:assert/strict";

import {
  fallbackItemsFromWords,
  normalizeItems,
  parseJsonObject,
  validateImage
} from "../api/recognize-cart.js";

test("accepts supported data URLs and rejects non-images", () => {
  assert.equal(validateImage("data:image/jpeg;base64,AAAA"), "");
  assert.match(validateImage("data:text/plain;base64,AAAA"), /仅支持/);
});

test("extracts a JSON object from a fenced model response", () => {
  const parsed = parseJsonObject('```json\n{"items":[{"title":"测试商品"}]}\n```');
  assert.equal(parsed.items[0].title, "测试商品");
});

test("keeps uncertain products editable instead of inventing a price", () => {
  const [item] = normalizeItems(
    [{
      title: "完整商品标题",
      price: null,
      qty: 1,
      row_bbox: [0, 200, 750, 500],
      confidence: 0.8,
      price_confidence: 0.2
    }],
    [],
    750,
    1600
  );
  assert.equal(item.price, null);
  assert.match(item.warnings[0], /手动填写/);
  assert.ok(item.crop.y > 0);
});

test("groups OCR text by live coordinates rather than fixed screenshot slices", () => {
  const box = (text, x1, y1, x2, y2) => ({
    text,
    location: [x1, y1, x2, y1, x2, y2, x1, y2]
  });
  const words = [
    box("第一件完整商品标题", 260, 190, 700, 230),
    box("淘宝 测试店；蓝色；M；数量×2", 260, 245, 700, 275),
    box("¥88.20", 270, 300, 410, 342),
    box("第二件完整商品标题", 260, 520, 700, 560),
    box("¥199.00", 270, 630, 430, 674)
  ];
  const items = fallbackItemsFromWords(words, 750, 1200);
  assert.equal(items.length, 2);
  assert.equal(items[0].price, 88.2);
  assert.equal(items[0].qty, 2);
  assert.equal(items[1].title, "第二件完整商品标题");
  assert.ok(items[0].crop.x >= 0.08 && items[0].crop.w <= 0.25);
  assert.notEqual(items[0].crop.y, items[1].crop.y);
});
