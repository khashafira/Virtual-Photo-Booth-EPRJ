const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const captureBtn = document.getElementById("capture");
const resetBtn = document.getElementById("reset");
const shutterSound = new Audio("assets/shutter.mp3");

const twibbon = new Image();
twibbon.src = "assets/twibbon-4.png";

let stream;
let currentFacing = "environment"; 
let timerValue = 0;

/* ===== CAMERA ===== */
async function startCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: currentFacing },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });

    video.srcObject = stream;
    await video.play();

    if (currentFacing === "user") {
      video.style.transform = "scaleX(-1)";
    } else {
      video.style.transform = "scaleX(1)";
    }

  } catch (err) {
    alert("Kamera tidak dapat diakses");
    console.error(err);
  }
}

startCamera();

document.getElementById("switchCamera").onclick = () => {
  currentFacing = currentFacing === "environment" ? "user" : "environment";
  startCamera();
};

/* ===== TIMER ===== */
document.querySelectorAll(".timer button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".timer button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    timerValue = parseInt(btn.dataset.time);
  };
});

function startCountdown(seconds, callback) {
  const cd = document.getElementById("countdown");
  cd.style.display = "flex";
  cd.textContent = seconds;

  const interval = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(interval);
      cd.style.display = "none";
      callback();
    } else {
      cd.textContent = seconds;
    }
  }, 1000);
}

/* ===== CAPTURE ===== */
captureBtn.onclick = () => {
  if (timerValue > 0) {
    startCountdown(timerValue, takePhoto);
  } else {
    takePhoto();
  }
};

function takePhoto() {
  shutterSound.currentTime = 0;
  shutterSound.play();
  navigator.vibrate?.(100);
  flash();

  const cropSize = Math.min(video.videoWidth, video.videoHeight);
  canvas.width = cropSize;
  canvas.height = cropSize;

  const sx = (video.videoWidth - cropSize) / 2;
  const sy = (video.videoHeight - cropSize) / 2;

  ctx.save();

  if (currentFacing === "user") {
    ctx.translate(cropSize, 0);
    ctx.scale(-1, 1);
  }

  ctx.filter = "brightness(1.05) contrast(1.05) saturate(1.1)";

  ctx.drawImage(
    video,
    sx, sy, cropSize, cropSize,
    0, 0, cropSize, cropSize
  );

  ctx.restore();
  ctx.filter = "none";

  ctx.drawImage(twibbon, 0, 0, cropSize, cropSize);

  uploadToCloudinary();
}

/* ===== FLASH ===== */
function flash() {
  const f = document.getElementById("flash");
  f.classList.add("active");
  setTimeout(() => f.classList.remove("active"), 300);
}

/* ===== UPLOAD ===== */
function uploadToCloudinary() {
  document.getElementById("result").innerHTML = `
    <div class="qr-card">
      <p class="loading">⏳ Memproses foto…</p>
    </div>
  `;

  canvas.toBlob(blob => {
    if (!blob) {
      alert("Gagal membuat gambar");
      return;
    }

    const formData = new FormData();
    formData.append("file", blob, "donordarahEPRJ.jpg");
    formData.append("upload_preset", "TwibbonDonorDarah");

    fetch("https://api.cloudinary.com/v1_1/dqlpclki8/image/upload", {
      method: "POST",
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (!data.secure_url) {
        alert("Upload gagal");
        return;
      }
      showQR(data.secure_url);
    });
  }, "image/jpeg", 0.95);
}

/* ===== QR ===== */
function showQR(url) {
  const downloadURL = url.replace(
    "/upload/",
    "/upload/fl_attachment:donordarahEPRJ/"
  );

  document.getElementById("result").innerHTML = `
    <div class="qr-card">
      <p>Scan untuk mengunduh foto</p>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(downloadURL)}">
    </div>
  `;

  resetBtn.style.display = "block";
}

resetBtn.onclick = () => {
  document.getElementById("result").innerHTML = "";
  resetBtn.style.display = "none";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};
