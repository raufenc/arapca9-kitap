const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const progressFill = document.getElementById('progressFill');
const timeCurrent = document.getElementById('timeCurrent');
const speedBtn = document.getElementById('speedBtn');
const loopBtn = document.getElementById('loopBtn');
const themeToggle = document.getElementById('themeToggle');
const fullScreenBtn = document.getElementById('fullScreenBtn');
const visualizer = document.getElementById('visualizer');

const timings = [5, 16, 27, 36, 45, 56, 66, 80]; 
const totalTime = 80; 
let isLooping = false;
let audioCtx, analyser, dataArray, source;
let scormReported = false;

// Frekans çubuklarını oluştur
for (let i = 0; i < 24; i++) {
    const bar = document.createElement('div');
    bar.className = 'v-bar';
    visualizer.appendChild(bar);
}
const bars = document.querySelectorAll('.v-bar');

// Ses Bağlamını Başlat (Kritik Düzeltme)
async function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            source = audioCtx.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            analyser.fftSize = 64;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            renderFrame();
        } catch (e) {
            console.error("AudioContext initialization failed:", e);
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
}

// script.js içindeki renderFrame fonksiyonunu bu şekilde güncelleyin
function renderFrame() {
    if (!analyser) return;
    requestAnimationFrame(renderFrame);
    
    if (!audio.paused) {
        analyser.getByteFrequencyData(dataArray);
        
        // Ekolayzır barlarını güncelle
        bars.forEach((bar, i) => {
            const val = dataArray[i] || 0;
            const height = Math.max(4, (val / 255) * 55); 
            bar.style.height = height + 'px';
        });

        // SES ŞİDDETİ HESAPLAMA (Ortalama ses seviyesi)
        const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const scaleEffect = 1 + (volume / 255) * 0.2; // %20'ye kadar büyüme
        const opacityEffect = 0.1 + (volume / 255) * 0.4; // %50'ye kadar parlama

        // Her iki taraftaki bloba da aynı etkiyi uygula
        const blobs = document.querySelectorAll('.blob');
        blobs.forEach(blob => {
            blob.style.opacity = opacityEffect;
            blob.style.transform = `scale(${scaleEffect})`;
        });

    } else {
        // Müzik durduğunda varsayılana dön
        bars.forEach(bar => bar.style.height = '4px');
        const blobs = document.querySelectorAll('.blob');
        blobs.forEach(blob => {
            blob.style.opacity = "0.1";
            blob.style.transform = "scale(1)";
        });
    }
}

// Şarkı %95 bittiğinde otomatik "Completed" yap
audio.addEventListener('timeupdate', () => {
    const cur = audio.currentTime;
    // ... Mevcut progress ve timing kodları ...

    if (!scormReported && (cur / totalTime) > 0.95) {
        reportScormComplete();
        scormReported = true;
    }
});

// Oynat/Durdur Fonksiyonu (Düzeltildi)
async function togglePlay() {
    await initAudio(); // Her tıklandığında ses bağlamını kontrol et
    
    if (audio.paused) {
        audio.play().then(() => {
            playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        }).catch(err => {
            console.error("Playback failed:", err);
            // Bazı tarayıcılarda ses dosyasının tam yüklenmesini beklemek gerekebilir
        });
    } else {
        audio.pause();
        playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }
}

playBtn.addEventListener('click', togglePlay);

// ... (Zamanlama, SCORM ve Diğer Fonksiyonlar Aynı Kalsın)
audio.addEventListener('timeupdate', () => {
    const cur = audio.currentTime;
    progressFill.style.width = (cur / totalTime * 100) + "%";
    timeCurrent.innerText = formatTime(cur);

    timings.forEach((startTime, index) => {
        if (index < timings.length - 1) {
            const endTime = timings[index + 1];
            const row = document.getElementById('row-' + index);
            if (cur >= startTime && cur < endTime) {
                if(!row.classList.contains('active-row')) {
                    document.querySelectorAll('.lyrics-row').forEach(r => r.classList.remove('active-row'));
                    row.classList.add('active-row');
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    });
});

audio.addEventListener('ended', () => {
    if (!isLooping) {
        playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        if (!scormReported) {
            reportScormComplete();
            scormReported = true;
        }
    }
});

function reportScormComplete() {
    let api = null;
    let win = window;
    while (win.parent && win.parent !== win) {
        if (win.parent.LMSInitialize || win.parent.API_1484_11) {
            api = win.parent;
            break;
        }
        win = win.parent;
    }
    if (api) {
        try {
            if (api.LMSSetValue) {
                api.LMSSetValue("cmi.core.lesson_status", "completed");
                api.LMSCommit("");
            } else if (api.API_1484_11) {
                api.API_1484_11.SetValue("cmi.completion_status", "completed");
                api.API_1484_11.Commit("");
            }
        } catch (e) { console.error(e); }
    }
}

loopBtn.addEventListener('click', () => {
    isLooping = !isLooping;
    audio.loop = isLooping;
    loopBtn.classList.toggle('active-tool', isLooping);
});

speedBtn.addEventListener('click', () => {
    const rates = [1, 1.25, 1.5, 0.75];
    let nextIndex = (rates.indexOf(audio.playbackRate) + 1) % rates.length;
    audio.playbackRate = rates[nextIndex];
    speedBtn.innerText = audio.playbackRate + 'x';
    speedBtn.classList.remove('speed-flash');
    void speedBtn.offsetWidth; 
    speedBtn.classList.add('speed-flash');
});

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    document.body.classList.toggle('dark-theme');
});

fullScreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
        document.exitFullscreen();
    }
});

function formatTime(s) {
    let m = Math.floor(s / 60);
    let sec = Math.floor(s % 60);
    return (m < 10 ? "0" + m : m) + ":" + (sec < 10 ? "0" + sec : sec);
}

document.getElementById('progressContainer').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * totalTime;
});

document.querySelectorAll('.lyrics-row').forEach((row, i) => {
    row.addEventListener('click', () => {
        audio.currentTime = timings[i];
        if (audio.paused) togglePlay();
    });
});