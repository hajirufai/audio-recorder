let mediaRecorder, audioChunks = [];
let audioContext, analyser, microphone;
let canvas, canvasCtx, volumeLevel, animationFrame;
let timerInterval, seconds = 0;
let startTime;

// Get DOM elements
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const timer = document.getElementById("timer");
const volumeMeter = document.getElementById("volumeMeter");
const volumeLevelBar = document.getElementById("volumeLevel");
const waveform = document.getElementById("waveform");
const audioPlayer = document.getElementById("audioPlayer");
const downloadBtn = document.getElementById("downloadBtn");

startBtn.addEventListener("click", startRecording);
stopBtn.addEventListener("click", stopRecording);

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        // Setup MediaRecorder
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            stopVisualization();
            
            // Create Blob & play audio
            let audioBlob = new Blob(audioChunks, { type: "audio/wav" });
            let audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            audioPlayer.style.display = "block";

            // Enable download button
            downloadBtn.href = audioUrl;
            downloadBtn.style.display = "block";
        };

        // Start recording
        mediaRecorder.start();
        startBtn.disabled = true;
        stopBtn.disabled = false;

        // Initialize AudioContext & Analyser
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        // Show visual elements
        volumeMeter.style.display = "block";
        waveform.style.display = "block";

        // Start real-time visualization
        visualizeAudio();
        startTimer();
    });
}

function visualizeAudio() {
    let dataArray = new Uint8Array(analyser.frequencyBinCount);
    canvasCtx = waveform.getContext("2d");

    function draw() {
        animationFrame = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        // Update volume meter
        let sum = dataArray.reduce((a, b) => a + b, 0);
        let average = sum / dataArray.length;
        let percentage = Math.min(100, (average / 128) * 100);
        volumeLevelBar.style.width = percentage + "%";

        // Draw waveform
        canvasCtx.clearRect(0, 0, waveform.width, waveform.height);
        canvasCtx.fillStyle = "black";
        canvasCtx.fillRect(0, 0, waveform.width, waveform.height);

        let barWidth = (waveform.width / dataArray.length) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            barHeight = dataArray[i] / 2;
            canvasCtx.fillStyle = "lime";
            canvasCtx.fillRect(x, waveform.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}

function startTimer() {
    seconds = 0;
    startTime = Date.now();
    timerInterval = setInterval(() => {
        let elapsed = Math.floor((Date.now() - startTime) / 1000);
        let minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
        let secs = String(elapsed % 60).padStart(2, "0");
        timer.textContent = `${minutes}:${secs}`;
    }, 1000);
}

function stopRecording() {
    mediaRecorder.stop();
    clearInterval(timerInterval);
    timer.textContent = "00:00";

    stopBtn.disabled = true;
    startBtn.disabled = false;
}

function stopVisualization() {
    cancelAnimationFrame(animationFrame);
    waveform.style.display = "none";
    volumeMeter.style.display = "none";
    microphone.disconnect();
    audioContext.close();
}
