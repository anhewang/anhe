// ui.js — 程序化绘制 iPhone Duo 两块屏幕的界面内容（不依赖外部 UI 图片素材）。
// 外屏（合盖时朝向观众）：iOS 风格锁屏 —— 实时时钟、日期、简历摘要通知、头像。
// 内屏（展开后展示）：iOS 风格主屏 —— 个人小组件、简历分区应用、联系方式 Dock。
// 尺寸约定与 chuspeeism/iphone-duo（MIT）保持一致：内屏 1600×1125，外屏 774×1125。

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", "Helvetica Neue", sans-serif';
const INNER_W = 1600;
const OUTER_W = 774;
const SCREEN_H = 1125;

// ---------- 基础绘制 ----------

function blob(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// 与页面背景一致的深色极光壁纸
function drawWallpaper(ctx, w, h) {
  ctx.fillStyle = '#05050e';
  ctx.fillRect(0, 0, w, h);
  const base = ctx.createLinearGradient(0, 0, w * .7, h);
  base.addColorStop(0, '#0a0a1a');
  base.addColorStop(.45, '#180b2b');
  base.addColorStop(1, '#0d1b2a');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  blob(ctx, w * .22, h * .18, w * .5, 'rgba(94,92,230,.5)');
  blob(ctx, w * .82, h * .3, w * .42, 'rgba(188,80,220,.4)');
  blob(ctx, w * .48, h * .85, w * .5, 'rgba(0,180,255,.36)');
  blob(ctx, w * .93, h * .93, w * .32, 'rgba(0,220,180,.26)');
}

function text(ctx, str, x, y, size, weight, color, align = 'center', shadow = 0) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (shadow) {
    ctx.shadowColor = `rgba(0,0,0,${shadow})`;
    ctx.shadowBlur = size * .18;
    ctx.shadowOffsetY = size * .04;
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function dot(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- 白色线性图标 ----------

function briefcase(ctx, cx, cy, s) {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = s * .1;
  ctx.beginPath();
  ctx.roundRect(cx - s * .22, cy - s * .5, s * .44, s * .3, s * .08);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(cx - s * .5, cy - s * .28, s, s * .72, s * .12);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.roundRect(cx - s * .08, cy - s * .02, s * .16, s * .18, s * .04);
  ctx.fill();
}

function chart(ctx, cx, cy, s) {
  ctx.fillStyle = '#fff';
  const bw = s * .2, gap = s * .14, heights = [.42, .68, .94];
  let x = cx - (bw * 3 + gap * 2) / 2;
  for (const hgt of heights) {
    ctx.beginPath();
    ctx.roundRect(x, cy + s * .45 - s * hgt, bw, s * hgt, bw * .45);
    ctx.fill();
    x += bw + gap;
  }
}

function gradCap(ctx, cx, cy, s) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(cx - s * .56, cy - s * .08);
  ctx.lineTo(cx, cy - s * .4);
  ctx.lineTo(cx + s * .56, cy - s * .08);
  ctx.lineTo(cx, cy + s * .24);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx - s * .32, cy + s * .16, s * .64, s * .16, s * .05);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = s * .06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + s * .5, cy);
  ctx.lineTo(cx + s * .5, cy + s * .34);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + s * .5, cy + s * .4, s * .06, 0, Math.PI * 2);
  ctx.fill();
}

function spark(ctx, cx, cy, s) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * .52);
  ctx.quadraticCurveTo(cx + s * .06, cy - s * .06, cx + s * .52, cy);
  ctx.quadraticCurveTo(cx + s * .06, cy + s * .06, cx, cy + s * .52);
  ctx.quadraticCurveTo(cx - s * .06, cy + s * .06, cx - s * .52, cy);
  ctx.quadraticCurveTo(cx - s * .06, cy - s * .06, cx, cy - s * .52);
  ctx.fill();
}

function compass(ctx, cx, cy, s) {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = s * .07;
  ctx.beginPath();
  ctx.arc(cx, cy, s * .48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(cx + s * .3, cy - s * .3);
  ctx.lineTo(cx - s * .07, cy + s * .07);
  ctx.lineTo(cx + s * .12, cy + s * .12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.moveTo(cx - s * .3, cy + s * .3);
  ctx.lineTo(cx + s * .07, cy - s * .07);
  ctx.lineTo(cx - s * .12, cy - s * .12);
  ctx.closePath();
  ctx.fill();
}

function phoneGlyph(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-.65);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = s * .19;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, s * .3, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();
}

function mailGlyph(ctx, cx, cy, s) {
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = s * .08;
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.roundRect(cx - s * .46, cy - s * .32, s * .92, s * .64, s * .08);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * .42, cy - s * .26);
  ctx.lineTo(cx, cy + s * .08);
  ctx.lineTo(cx + s * .42, cy - s * .26);
  ctx.stroke();
}

function torchGlyph(ctx, cx, cy) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(cx - 8, cy - 16, 16, 8, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx - 5, cy - 8, 10, 20, 3);
  ctx.fill();
}

function cameraGlyph(ctx, cx, cy) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(cx - 4, cy - 13, 8, 5, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx - 14, cy - 9, 28, 19, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.arc(cx, cy + .5, 6, 0, Math.PI * 2);
  ctx.fill();
}

function padlock(ctx, cx, cy) {
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 9, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.roundRect(cx - 13, cy - 2, 26, 19, 6);
  ctx.fill();
}

// ---------- 组件 ----------

function appIcon(ctx, x, y, size, c0, c1, glyph) {
  const r = size * .235;
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, r);
  ctx.fill();
  const hi = ctx.createLinearGradient(x, y, x, y + size * .5);
  hi.addColorStop(0, 'rgba(255,255,255,.22)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, r);
  ctx.fill();
  glyph(ctx, x + size / 2, y + size / 2, size * .52);
}

function roundButton(ctx, cx, cy, r, glyph) {
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  glyph(ctx, cx, cy);
}

function avatarCircle(ctx, cx, cy, r, avatar) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (avatar && avatar.width) {
    const scale = Math.max(2 * r / avatar.width, 2 * r / avatar.height);
    const dw = avatar.width * scale, dh = avatar.height * scale;
    ctx.drawImage(avatar, cx - dw / 2, cy - dh / 2 - r * .06, dw, dh);
  } else {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, '#5e5ce6');
    g.addColorStop(1, '#af52de');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    text(ctx, '蓓', cx, cy + r * .35, r, '600', '#fff');
  }
  ctx.restore();
}

function drawStatusBar(ctx, w, now) {
  const time = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  text(ctx, time, w > 1000 ? 56 : 42, 64, 30, '600', 'rgba(255,255,255,.95)', 'left');
  // 信号
  const bx = w - 176;
  for (let i = 0; i < 4; i++) {
    const bh = 8 + i * 5;
    ctx.fillStyle = `rgba(255,255,255,${i === 3 ? .35 : .95})`;
    ctx.beginPath();
    ctx.roundRect(bx + i * 9, 68 - bh, 6, bh, 2);
    ctx.fill();
  }
  // Wi-Fi
  const wx = w - 118, wy = 58;
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(wx, wy, 6 + i * 7, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
  }
  dot(ctx, wx, wy - 1, 2.6, 'rgba(255,255,255,.95)');
  // 电池
  const ex = w - 66;
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(ex, 40, 40, 20, 6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.roundRect(ex + 3, 43, 26, 14, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(ex + 42.5, 46, 4, 8, 2);
  ctx.fill();
}

// ---------- 外屏：锁屏 ----------

function drawOuter(ctx, wallpaper, avatar, now) {
  const w = OUTER_W, h = SCREEN_H;
  ctx.clearRect(0, 0, w, h);
  // 壁纸取右半，与 iphone-duo 的处理一致
  ctx.drawImage(wallpaper, INNER_W - OUTER_W, 0, OUTER_W, h, 0, 0, OUTER_W, h);
  padlock(ctx, w / 2, 84);
  const date = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  text(ctx, date, w / 2, 170, 34, '500', 'rgba(255,255,255,.92)', 'center', .3);
  const time = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  text(ctx, time, w / 2, 352, 188, '200', 'rgba(255,255,255,.96)', 'center', .3);
  // 简历摘要通知卡片
  const x = 36, y = 520, cw = w - 72, ch = 158;
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.strokeStyle = 'rgba(255,255,255,.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, cw, ch, 36);
  ctx.fill();
  ctx.stroke();
  const g = ctx.createLinearGradient(x + 26, y + 26, x + 78, y + 78);
  g.addColorStop(0, '#5e5ce6');
  g.addColorStop(1, '#af52de');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x + 26, y + 30, 52, 52, 14);
  ctx.fill();
  text(ctx, '简', x + 52, y + 68, 30, '600', '#fff');
  text(ctx, '产品操盘 · 渠道营销', x + 96, y + 56, 27, '600', 'rgba(255,255,255,.95)', 'left');
  text(ctx, '现在', x + cw - 28, y + 56, 22, '400', 'rgba(255,255,255,.55)', 'right');
  text(ctx, '王蓓瑶 · 4 年消费电子 · 即时零售 0→1', x + 96, y + 104, 25, '400', 'rgba(255,255,255,.82)', 'left');
  // 头像与姓名
  avatarCircle(ctx, w / 2, 892, 52, avatar);
  text(ctx, '王蓓瑶', w / 2, 992, 34, '600', 'rgba(255,255,255,.95)', 'center', .35);
  // 手电筒 / 相机
  roundButton(ctx, 88, 1036, 36, torchGlyph);
  roundButton(ctx, w - 88, 1036, 36, cameraGlyph);
}

// ---------- 内屏：简历主屏 ----------

function drawInner(ctx, wallpaper, avatar, now) {
  const w = INNER_W, h = SCREEN_H;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(wallpaper, 0, 0);
  drawStatusBar(ctx, w, now);
  // 个人信息小组件
  const cw = 640, ch = 140, wx = (w - cw) / 2, wy = 116;
  ctx.fillStyle = 'rgba(255,255,255,.13)';
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(wx, wy, cw, ch, 40);
  ctx.fill();
  ctx.stroke();
  text(ctx, '王蓓瑶', wx + 44, wy + 60, 36, '700', '#fff', 'left', .25);
  text(ctx, 'Product Operator · 产品操盘', wx + 44, wy + 104, 25, '400', 'rgba(255,255,255,.78)', 'left');
  text(ctx, now.toLocaleDateString('zh-CN', { weekday: 'short' }), wx + cw - 60, wy + 50, 26, '600', '#ff453a', 'center');
  text(ctx, String(now.getDate()), wx + cw - 60, wy + 114, 56, '300', '#fff', 'center');
  // 简历分区应用
  const size = 172, gap = 96;
  let x = (w - (size * 5 + gap * 4)) / 2;
  const y = 462;
  const apps = [
    ['工作经验', '#0071e3', '#5856d6', briefcase],
    ['项目经验', '#5856d6', '#af52de', chart],
    ['教育背景', '#af52de', '#ff6482', gradCap],
    ['核心能力', '#0a84ff', '#00c7be', spark],
    ['发展规划', '#ff9f0a', '#ff453a', compass],
  ];
  for (const [label, c0, c1, glyph] of apps) {
    appIcon(ctx, x, y, size, c0, c1, glyph);
    text(ctx, label, x + size / 2, y + size + 48, 30, '500', 'rgba(255,255,255,.95)', 'center', .3);
    x += size + gap;
  }
  // 页面指示点
  dot(ctx, w / 2 - 16, 852, 5, 'rgba(255,255,255,.95)');
  dot(ctx, w / 2 + 16, 852, 5, 'rgba(255,255,255,.35)');
  // Dock：电话 / 邮件（对应真实联系方式）
  ctx.fillStyle = 'rgba(255,255,255,.13)';
  ctx.strokeStyle = 'rgba(255,255,255,.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(560, 886, 480, 176, 48);
  ctx.fill();
  ctx.stroke();
  appIcon(ctx, 602, 906, 136, '#34c759', '#1f9e44', phoneGlyph);
  appIcon(ctx, 862, 906, 136, '#0a84ff', '#0057d8', mailGlyph);
}

// ---------- 导出 ----------

export async function loadDefaultUIs() {
  const avatar = new Image();
  avatar.src = './assets/avatar.png';
  await Promise.resolve(avatar.decode()).catch(() => null); // 失败时回退为首字头像

  const wallpaper = document.createElement('canvas');
  wallpaper.width = INNER_W;
  wallpaper.height = SCREEN_H;
  drawWallpaper(wallpaper.getContext('2d'), INNER_W, SCREEN_H);

  const themes = { wallpaper: {} };
  for (const kind of ['inner', 'outer']) {
    const canvas = document.createElement('canvas');
    canvas.width = kind === 'inner' ? INNER_W : OUTER_W;
    canvas.height = SCREEN_H;
    themes.wallpaper[kind] = canvas;
  }

  function redraw() {
    const now = new Date();
    drawInner(themes.wallpaper.inner.getContext('2d'), wallpaper, avatar, now);
    drawOuter(themes.wallpaper.outer.getContext('2d'), wallpaper, avatar, now);
  }
  redraw();
  return { themes, redraw };
}
