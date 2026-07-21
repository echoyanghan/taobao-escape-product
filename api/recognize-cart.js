const DEFAULT_MODEL = "qwen3-vl-flash";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_ITEMS = 12;

function integerSetting(name, fallback, min, max) {
  const value = Math.round(Number(process.env[name]));
  return Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function setCors(request, response) {
  const origin = request.headers.origin || "";
  const allowedOrigins = new Set([
    "https://echoyanghan.github.io",
    "https://taobao-escape-product.vercel.app",
    process.env.PUBLIC_APP_ORIGIN || ""
  ]);
  const isSameHost = origin && request.headers.host && new URL(origin).host === request.headers.host;
  if (allowedOrigins.has(origin) || isSameHost) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "no-store");
}

function send(response, status, body) {
  response.status(status).json(body);
}

function parseBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body);
  return {};
}

function validateImage(dataUrl) {
  if (typeof dataUrl !== "string") return "没有收到截图";
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return "仅支持 JPG、PNG 或 WebP 图片";
  const bytes = Math.floor((match[2].length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) return "图片过大，请压缩到 3MB 以内";
  return "";
}

function cleanText(value, maxLength = 180) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeBox(rawBox, width, height, coordinateSpace = "auto") {
  if (!Array.isArray(rawBox) || rawBox.length < 4) return null;
  let [x1, y1, x2, y2] = rawBox.map(Number);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
  if (coordinateSpace === "normalized1000") {
    x1 = (x1 / 1000) * width;
    x2 = (x2 / 1000) * width;
    y1 = (y1 / 1000) * height;
    y2 = (y2 / 1000) * height;
  } else if (Math.max(Math.abs(x1), Math.abs(x2)) <= 1 && Math.max(Math.abs(y1), Math.abs(y2)) <= 1) {
    x1 *= width;
    x2 *= width;
    y1 *= height;
    y2 *= height;
  }
  x1 = clamp(x1, 0, width);
  x2 = clamp(x2, 0, width);
  y1 = clamp(y1, 0, height);
  y2 = clamp(y2, 0, height);
  if (x2 <= x1 || y2 <= y1) return null;
  return [x1, y1, x2, y2];
}

function cropFromBoxes(imageBox, rowBox, width, height, coordinateSpace = "auto") {
  const box = normalizeBox(imageBox, width, height, coordinateSpace);
  if (box) {
    const [x1, y1, x2, y2] = box;
    return {
      x: x1 / width,
      y: y1 / height,
      w: (x2 - x1) / width,
      h: (y2 - y1) / height
    };
  }
  const row = normalizeBox(rowBox, width, height, coordinateSpace);
  if (!row) return null;
  const [, y1, , y2] = row;
  const rowHeight = y2 - y1;
  return {
    x: 0.085,
    y: clamp(y1 + rowHeight * 0.08, 0, height) / height,
    w: 0.24,
    h: clamp(rowHeight * 0.84, 1, height) / height
  };
}

function extractContent(payload) {
  const content = payload?.output?.choices?.[0]?.message?.content;
  if (typeof content === "string") return { text: content, words: [] };
  if (!Array.isArray(content)) return { text: "", words: [] };
  const text = content
    .map((part) => part?.text || part?.output_text || "")
    .filter(Boolean)
    .join("\n");
  const words = content.flatMap((part) => part?.ocr_result?.words_info || []);
  return { text, words };
}

function parseJsonObject(text) {
  const source = String(text || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(source.slice(start, end + 1));
  } catch {
    return null;
  }
}

function wordBox(word) {
  const location = word?.location;
  if (Array.isArray(location) && location.length >= 8) {
    const xs = [location[0], location[2], location[4], location[6]].map(Number);
    const ys = [location[1], location[3], location[5], location[7]].map(Number);
    if ([...xs, ...ys].every(Number.isFinite)) return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  const rect = word?.rotate_rect;
  if (Array.isArray(rect) && rect.length >= 4) {
    const [cx, cy, width, height] = rect.map(Number);
    if ([cx, cy, width, height].every(Number.isFinite)) return [cx - width / 2, cy - height / 2, cx + width / 2, cy + height / 2];
  }
  return null;
}

function fallbackItemsFromWords(words, width, height) {
  const lines = words
    .map((word) => ({ text: cleanText(word?.text), box: wordBox(word) }))
    .filter((line) => line.text && line.box)
    .map((line) => ({ ...line, x: (line.box[0] + line.box[2]) / 2, y: (line.box[1] + line.box[3]) / 2 }));
  const ignoredPrice = /(?:优惠|立减|满\s*\d|减\s*\d|券|合计|总计|已省|运费|原价)/;
  const pricePattern = /(?:¥|￥)\s*(\d+(?:\.\d{1,2})?)/;
  const prices = lines
    .map((line) => ({ line, match: line.text.match(pricePattern) }))
    .filter(({ line, match }) => match && !ignoredPrice.test(line.text) && line.x > width * 0.28)
    .map(({ line, match }) => ({ ...line, price: Number(match[1]) }))
    .filter((line) => line.price > 0 && line.price < 100000)
    .sort((a, b) => a.y - b.y)
    .filter((line, index, list) => index === 0 || Math.abs(line.y - list[index - 1].y) > 18)
    .slice(0, MAX_ITEMS);
  if (!prices.length) return [];
  const gaps = prices.slice(1).map((price, index) => price.y - prices[index].y).filter((gap) => gap > 50);
  const typicalGap = gaps.length ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : Math.min(height * 0.24, 260);
  return prices
    .map((price, index) => {
      const previousY = prices[index - 1]?.y;
      const nextY = prices[index + 1]?.y;
      const top = previousY ? (previousY + price.y) / 2 : price.y - typicalGap * 0.72;
      const bottom = nextY ? (price.y + nextY) / 2 : price.y + typicalGap * 0.3;
      const candidates = lines.filter(
        (line) => line.y >= top && line.y < price.y - 8 && line.x > width * 0.27 && !pricePattern.test(line.text) && !ignoredPrice.test(line.text)
      );
      const title = candidates
        .filter((line) => line.text.length >= 4 && !/(数量|规格|颜色|尺码|店铺|发货)/.test(line.text))
        .sort((a, b) => b.text.length - a.text.length)[0]?.text;
      if (!title) return null;
      const rowLines = lines.filter((line) => line.y >= top && line.y < bottom);
      const qtyText = rowLines.map((line) => line.text).find((text) => /数量\s*[x×]\s*\d+/i.test(text));
      const qty = qtyText ? Number(qtyText.match(/数量\s*[x×]\s*(\d+)/i)?.[1]) || 1 : 1;
      const rowBox = [0, clamp(top, 0, height), width, clamp(bottom, 0, height)];
      return {
        title,
        price: price.price,
        originalPrice: null,
        qty: clamp(qty, 1, 99),
        spec: "",
        shop: "淘宝购物车",
        rowBox,
        crop: cropFromBoxes(null, rowBox, width, height),
        confidence: 0.58,
        priceConfidence: 0.64,
        warnings: ["由文字位置自动分组，请确认商品和价格"]
      };
    })
    .filter(Boolean);
}

function normalizeItems(rawItems, words, width, height, coordinateSpace = "auto") {
  const items = Array.isArray(rawItems) ? rawItems : [];
  const normalized = items
    .slice(0, MAX_ITEMS)
    .map((item) => {
      const title = cleanText(item?.title);
      const price = finiteNumber(item?.price);
      const rowBox = normalizeBox(item?.row_bbox || item?.rowBox, width, height, coordinateSpace);
      if (!title || (price !== null && (price <= 0 || price >= 100000))) return null;
      let confidence = clamp(finiteNumber(item?.confidence) ?? 0.72, 0, 1);
      let priceConfidence = clamp(finiteNumber(item?.price_confidence ?? item?.priceConfidence) ?? confidence, 0, 1);
      const warnings = Array.isArray(item?.warnings) ? item.warnings.map((value) => cleanText(value, 80)).filter(Boolean).slice(0, 3) : [];
      const crop = cropFromBoxes(item?.image_bbox || item?.imageBox, rowBox, width, height, coordinateSpace);
      const titleLooksMerged = /(?:淘宝|天猫).*(?:数量|规格|颜色|尺码)|(?:数量\s*[x×]|[；;].*(?:数量|规格|颜色|尺码))/i.test(title);
      if (!rowBox) {
        confidence = Math.min(confidence, 0.62);
        priceConfidence = Math.min(priceConfidence, 0.68);
        warnings.unshift("商品行定位不完整，请重点核对标题和价格");
      }
      if (titleLooksMerged) {
        confidence = Math.min(confidence, 0.5);
        priceConfidence = Math.min(priceConfidence, 0.5);
        warnings.unshift("标题可能串入相邻商品信息，请手动修正");
      }
      if (price === null) warnings.unshift("没有可靠识别到当前价格，请手动填写");
      else if (priceConfidence < 0.78 && !warnings.length) warnings.push("截图中价格可能有歧义，请确认");
      return {
        title,
        price,
        originalPrice: finiteNumber(item?.original_price ?? item?.originalPrice),
        qty: clamp(Math.round(finiteNumber(item?.qty) || 1), 1, 99),
        spec: cleanText(item?.spec, 100),
        shop: cleanText(item?.shop || "淘宝购物车", 80),
        rowBox,
        crop,
        confidence,
        priceConfidence,
        warnings: warnings.slice(0, 3)
      };
    })
    .filter(Boolean);
  const fallback = fallbackItemsFromWords(words, width, height);
  const positionedCount = normalized.filter((item) => item.rowBox).length;
  if (fallback.length >= normalized.length && positionedCount < Math.ceil(normalized.length * 0.6)) return fallback;
  return normalized.length ? normalized : fallback;
}

function promptForScreenshot(width, height) {
  const coordinateRule = "坐标规则：row_bbox 和 image_bbox 的四个值必须是相对整张截图的 0 到 1000 归一化整数，不要返回原图像素坐标。";
  return `${coordinateRule}\n\n${basePromptForScreenshot(width, height)}`;
}

function basePromptForScreenshot(width, height) {
  return `你是电商购物车界面理解助手。请理解截图的视觉布局，不要只做逐行文字抄录。截图尺寸为 ${width}x${height} 像素。请从上到下识别每一个完整或大部分可见的商品卡片，并返回严格 JSON，不要 Markdown，不要解释。\n\nJSON 格式：{"items":[{"title":"商品标题","price":实际当前单价或null,"original_price":原价或null,"qty":数量,"spec":"规格","shop":"店铺或平台","row_bbox":[x1,y1,x2,y2],"image_bbox":[x1,y1,x2,y2],"confidence":0到1,"price_confidence":0到1,"warnings":[]}]}\n\n规则：\n1. 利用商品主图、店铺分组、横向分隔和数量控件理解商品卡片；返回顺序必须与页面从上到下一致。\n2. 每件商品的 title、price、qty、spec 必须来自同一个商品卡片，禁止跨卡片拼接。\n3. row_bbox 和 image_bbox 必填，使用原图像素坐标。row_bbox 覆盖商品卡片，image_bbox 只精确框住该商品主图，不含标题和价格。\n4. price 只填写醒目的单件当前成交价。不要把划线原价、优惠金额、满减门槛、合计或运费当成 price。\n5. qty 读取“×N”或数量控件中的数字；规格、店铺、优惠标签不要拼进 title。\n6. 标题与当前价格可见时即可返回；看不清的字段填 null 并降低置信度，禁止猜测。\n7. 同一商品只返回一次，最多 ${MAX_ITEMS} 件。`;
}

export default async function handler(request, response) {
  setCors(request, response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return send(response, 405, { error: "仅支持 POST 请求" });
  if (!process.env.DASHSCOPE_API_KEY) {
    return send(response, 503, { error: "识别服务尚未配置", code: "SERVICE_NOT_CONFIGURED" });
  }
  let body;
  try {
    body = parseBody(request);
  } catch {
    return send(response, 400, { error: "请求格式不正确" });
  }
  const image = body.image;
  const imageError = validateImage(image);
  if (imageError) return send(response, 400, { error: imageError });
  const rawWidth = Math.round(Number(body.width) || 0);
  const rawHeight = Math.round(Number(body.height) || 0);
  if (rawWidth < 1 || rawHeight < 1) return send(response, 400, { error: "无法读取截图尺寸" });
  const width = clamp(rawWidth, 320, 10000);
  const height = clamp(rawHeight, 320, 30000);

  const controller = new AbortController();
  const modelTimeout = integerSetting("MODEL_TIMEOUT_MS", 55000, 10000, 180000);
  const timer = setTimeout(() => controller.abort(), modelTimeout);
  const endpoint = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
  try {
    const headers = {
      Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json"
    };
    const maxPixels = integerSetting("QWEN_MAX_PIXELS", 1605632, 65536, 8388608);
    const maxTokens = integerSetting("QWEN_MAX_TOKENS", 2048, 512, 4096);
    const imagePart = { image, min_pixels: 65536, max_pixels: maxPixels };
    const model = process.env.QWEN_VISION_MODEL || DEFAULT_MODEL;
    const extractResponse = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model,
        input: {
          messages: [{
            role: "user",
            content: [imagePart, { text: promptForScreenshot(width, height) }]
          }]
        },
        parameters: { max_tokens: maxTokens, temperature: 0.01, enable_thinking: false }
      })
    });
    const extractPayload = await extractResponse.json().catch(() => ({}));
    if (!extractResponse.ok) {
      const upstreamMessage = cleanText(extractPayload?.message || extractPayload?.error?.message || "Qwen 视觉模型调用失败", 160);
      return send(response, extractResponse.status >= 500 ? 502 : 400, { error: upstreamMessage, code: "VISION_UPSTREAM_ERROR" });
    }
    const { text } = extractContent(extractPayload);
    const parsed = parseJsonObject(text);
    const items = normalizeItems(parsed?.items, [], width, height, "normalized1000");
    if (!items.length) {
      return send(response, 422, {
        error: "没有识别到完整商品，请上传包含商品标题和价格的购物车截图",
        code: "NO_COMPLETE_ITEMS"
      });
    }
    return send(response, 200, {
      items,
      meta: {
        model,
        itemCount: items.length,
        coordinateLines: 0,
        coordinateRecognitionAvailable: items.some((item) => Boolean(item.rowBox && item.crop)),
        usage: { extraction: extractPayload?.usage || null, coordinates: null }
      }
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return send(response, timedOut ? 504 : 500, {
      error: timedOut ? "识别超时，请压缩图片后重试" : "识别服务暂时不可用，请稍后重试",
      code: timedOut ? "OCR_TIMEOUT" : "OCR_REQUEST_FAILED"
    });
  } finally {
    clearTimeout(timer);
  }
}

export {
  extractContent,
  fallbackItemsFromWords,
  normalizeItems,
  parseJsonObject,
  validateImage
};
