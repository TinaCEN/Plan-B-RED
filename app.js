const phone = document.querySelector(".phone");
const overlay = document.getElementById("packetOverlay");
const openPacket = document.getElementById("openPacket");
const closeOverlay = document.getElementById("closeOverlay");
const sealButton = document.getElementById("sealButton");
const resultPage = document.getElementById("resultPage");
const resultBack = document.getElementById("resultBack");
const modal = document.querySelector(".packet-modal");
const canvas = document.getElementById("scratchCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const scratchState = {
  active: false,
  lastX: 0,
  lastY: 0,
  revealed: false,
  pointerInUse: false,
  resultTimer: 0,
};

const sealDefault = {
  left: 97,
  top: 318,
};

const REVEAL_THRESHOLD = 0.8;

function drawScratchLayer() {
  const { width, height } = canvas;
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#ffe9a8");
  gradient.addColorStop(0.34, "#f4d790");
  gradient.addColorStop(0.58, "#d8d8d8");
  gradient.addColorStop(0.78, "#ffe49a");
  gradient.addColorStop(1, "#f2c260");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#ffffff";
  for (let x = -8; x < width + 8; x += 12) {
    for (let y = -8; y < height + 8; y += 12) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#efbd5f";
  ctx.lineWidth = 1;
  for (let x = -height; x < width; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + height, height);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function resetScratch() {
  scratchState.active = false;
  scratchState.revealed = false;
  window.clearTimeout(scratchState.resultTimer);
  modal.classList.remove("revealed", "scratching");
  sealButton.style.left = `${sealDefault.left}px`;
  sealButton.style.top = `${sealDefault.top}px`;
  sealButton.style.transform = "";
  drawScratchLayer();
}

function openOverlay() {
  phone.classList.add("modal-open");
  phone.classList.remove("result-open");
  overlay.setAttribute("aria-hidden", "false");
  resultPage.setAttribute("aria-hidden", "true");
  resetScratch();
}

function closePacketOverlay() {
  phone.classList.remove("modal-open");
  overlay.setAttribute("aria-hidden", "true");
  scratchState.active = false;
  window.clearTimeout(scratchState.resultTimer);
}

function showResultPage() {
  phone.classList.remove("modal-open");
  phone.classList.add("result-open");
  overlay.setAttribute("aria-hidden", "true");
  resultPage.setAttribute("aria-hidden", "false");
}

function closeResultPage() {
  phone.classList.remove("result-open");
  resultPage.setAttribute("aria-hidden", "true");
  closePacketOverlay();
}

function getPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches ? event.touches[0] : event;
  return {
    x: (source.clientX - rect.left) * (canvas.width / rect.width),
    y: (source.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function moveSeal(event) {
  const source = event.touches ? event.touches[0] : event;
  const modalRect = modal.getBoundingClientRect();
  const sealSize = sealButton.offsetWidth;
  const halfSeal = sealSize / 2;
  const offsetX = 38;
  const offsetY = 16;
  const minLeft = 16;
  const maxLeft = modalRect.width - sealSize + 16;
  const minTop = 48;
  const maxTop = modalRect.height - sealSize - 20;

  const nextLeft = source.clientX - modalRect.left + offsetX - halfSeal;
  const nextTop = source.clientY - modalRect.top + offsetY - halfSeal;
  const clampedLeft = Math.min(Math.max(nextLeft, minLeft), maxLeft);
  const clampedTop = Math.min(Math.max(nextTop, minTop), maxTop);

  sealButton.style.left = `${clampedLeft}px`;
  sealButton.style.top = `${clampedTop}px`;
  sealButton.style.transform = "scale(0.98)";
}

function scratchLine(x, y) {
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 26;
  ctx.beginPath();
  ctx.moveTo(scratchState.lastX, scratchState.lastY);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function revealProgress() {
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let cleared = 0;

  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] < 24) {
      cleared += 1;
    }
  }

  return cleared / (pixels.length / 4);
}

function revealAll() {
  if (scratchState.revealed) return;
  scratchState.revealed = true;
  modal.classList.remove("scratching");
  modal.classList.add("revealed");
  sealButton.style.transform = "scale(1)";
  canvas.style.transition = "opacity 260ms ease";
  canvas.style.opacity = "0";
  window.setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.opacity = "1";
    canvas.style.transition = "";
  }, 280);
  scratchState.resultTimer = window.setTimeout(showResultPage, 1250);
}

function beginScratch(event) {
  event.preventDefault();
  if (event.pointerId !== undefined && canvas.setPointerCapture) {
    scratchState.pointerInUse = true;
    canvas.setPointerCapture(event.pointerId);
  }
  const point = getPoint(event);
  scratchState.active = true;
  scratchState.lastX = point.x;
  scratchState.lastY = point.y;
  modal.classList.add("scratching");
  moveSeal(event);
  scratchLine(point.x, point.y);
}

function moveScratch(event) {
  if (!scratchState.active || scratchState.revealed) return;
  event.preventDefault();
  const point = getPoint(event);
  moveSeal(event);
  scratchLine(point.x, point.y);
  scratchState.lastX = point.x;
  scratchState.lastY = point.y;

  if (revealProgress() >= REVEAL_THRESHOLD) {
    revealAll();
  }
}

function endScratch() {
  scratchState.active = false;
  modal.classList.remove("scratching");
  sealButton.style.transform = "";
}

function beginMouseScratch(event) {
  if (scratchState.pointerInUse) return;
  beginScratch(event);
}

function moveMouseScratch(event) {
  if (scratchState.pointerInUse) return;
  moveScratch(event);
}

function endPointerScratch() {
  endScratch();
  scratchState.pointerInUse = false;
}

openPacket.addEventListener("click", openOverlay);
closeOverlay.addEventListener("click", closePacketOverlay);
sealButton.addEventListener("click", revealAll);
resultBack.addEventListener("click", closeResultPage);

canvas.addEventListener("pointerdown", beginScratch);
canvas.addEventListener("pointermove", moveScratch);
window.addEventListener("pointerup", endPointerScratch);
window.addEventListener("pointercancel", endPointerScratch);

canvas.addEventListener("mousedown", beginMouseScratch);
canvas.addEventListener("mousemove", moveMouseScratch);
window.addEventListener("mouseup", endScratch);

canvas.addEventListener("touchstart", beginScratch, { passive: false });
canvas.addEventListener("touchmove", moveScratch, { passive: false });
window.addEventListener("touchend", endScratch);
window.addEventListener("touchcancel", endScratch);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePacketOverlay();
  }
});

drawScratchLayer();
