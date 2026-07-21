// Vercel serves the recognition endpoint from the same origin. GitHub Pages
// stays on the existing Function Compute endpoint because it cannot run APIs.
if (!window.location.hostname.endsWith(".vercel.app")) {
  window.TAOBAO_ESCAPE_RECOGNITION_API = "https://taobao-ognition-tspknrcavq.cn-hangzhou.fcapp.run";
}
