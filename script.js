// Voice Changer Pro - Main JavaScript File

class VoiceChanger {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.isRecording = false;
        this.currentAudio = null;
        this.currentEffect = null;
        this.waveformCanvas = null;
        this.waveformCtx = null;
        this.animationId = null;
        
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupWaveform();
        this.setupDarkMode();
    }

    setupElements() {
        this.recordBtn = document.getElementById('recordBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.audioFile = document.getElementById('audioFile');
        this.audioControls = document.getElementById('audioControls');
        this.playBtn = document.getElementById('playBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.uploadArea = document.getElementById('uploadArea');
        this.darkModeToggle = document.getElementById('darkModeToggle');
        this.effectBtns = document.querySelectorAll('.effect-btn');
        this.waveformCanvas = document.getElementById('waveform');
        this.waveformCtx = this.waveformCanvas.getContext('2d');
    }

    setupEventListeners() {
        // Recording controls
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.uploadBtn.addEventListener('click', () => this.audioFile.click());
        this.audioFile.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Audio controls
        this.playBtn.addEventListener('click', () => this.togglePlayback());
        this.downloadBtn.addEventListener('click', () => this.downloadAudio());
        
        // Upload area
        this.uploadArea.addEventListener('click', () => this.audioFile.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Effect buttons
        this.effectBtns.forEach(btn => {
            btn.addEventListener('click', () => this.applyEffect(btn.dataset.effect));
        });
        
        // Dark mode toggle
        this.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
    }

    setupWaveform() {
        this.waveformCtx.fillStyle = '#00d4ff';
        this.waveformCtx.strokeStyle = '#00d4ff';
        this.waveformCtx.lineWidth = 2;
    }

    setupDarkMode() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateDarkModeIcon(savedTheme);
    }

    async toggleRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };
            
            this.mediaRecorder.onstop = () => {
                this.processRecording();
            };
            
            // Setup audio context for waveform
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            this.analyser.fftSize = 256;
            this.microphone.connect(this.analyser);
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            this.recordBtn.innerHTML = '<i class="fas fa-stop"></i><span>Stop Recording</span>';
            this.recordBtn.classList.add('recording');
            this.audioControls.style.display = 'flex';
            
            this.startWaveformAnimation();
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Unable to access microphone. Please check permissions.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            this.recordBtn.innerHTML = '<i class="fas fa-microphone"></i><span>Start Recording</span>';
            this.recordBtn.classList.remove('recording');
            
            this.stopWaveformAnimation();
            
            // Stop all tracks
            if (this.microphone) {
                this.microphone.mediaStream.getTracks().forEach(track => track.stop());
            }
        }
    }

    processRecording() {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.currentAudio = audioBlob;
        
        // Create audio element for playback
        const audioUrl = URL.createObjectURL(audioBlob);
        this.audioElement = new Audio(audioUrl);
        
        this.showSuccessMessage('Recording completed successfully!');
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('audio/')) {
            this.currentAudio = file;
            this.audioElement = new Audio(URL.createObjectURL(file));
            this.audioControls.style.display = 'flex';
            this.showSuccessMessage('Audio file uploaded successfully!');
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.style.background = 'rgba(0, 212, 255, 0.1)';
    }

    handleDrop(event) {
        event.preventDefault();
        this.uploadArea.style.background = 'rgba(0, 212, 255, 0.05)';
        
        const files = event.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('audio/')) {
            this.currentAudio = files[0];
            this.audioElement = new Audio(URL.createObjectURL(files[0]));
            this.audioControls.style.display = 'flex';
            this.showSuccessMessage('Audio file uploaded successfully!');
        }
    }

    togglePlayback() {
        if (this.audioElement) {
            if (this.audioElement.paused) {
                this.audioElement.play();
                this.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                this.audioElement.pause();
                this.playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
    }

    downloadAudio() {
        if (this.currentAudio) {
            // Show loading state
            this.downloadBtn.innerHTML = '<div class="loading"></div>';
            this.downloadBtn.disabled = true;
            
            // Simulate processing time for better UX
            setTimeout(() => {
                const url = URL.createObjectURL(this.currentAudio);
                const a = document.createElement('a');
                a.href = url;
                
                // Create filename with effect name if applied
                const effectSuffix = this.currentEffect ? `-${this.currentEffect}` : '';
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                a.download = `voice-changed${effectSuffix}-${timestamp}.wav`;
                
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // Reset button state
                this.downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
                this.downloadBtn.disabled = false;
                this.downloadBtn.classList.add('success');
                
                this.showSuccessMessage(`Audio downloaded successfully! ${this.currentEffect ? `(${this.currentEffect} effect applied)` : ''}`);
                
                // Remove success class after animation
                setTimeout(() => {
                    this.downloadBtn.classList.remove('success');
                }, 600);
                
            }, 500);
        } else {
            this.showSuccessMessage('No audio to download. Please record or upload audio first.');
        }
    }

    applyEffect(effectType) {
        // Remove active class from all effect buttons
        this.effectBtns.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        const activeBtn = document.querySelector(`[data-effect="${effectType}"]`);
        activeBtn.classList.add('active');
        
        this.currentEffect = effectType;
        
        if (this.currentAudio) {
            this.processAudioWithEffect(effectType);
        } else {
            this.showSuccessMessage(`${effectType.charAt(0).toUpperCase() + effectType.slice(1)} effect selected!`);
        }
    }

    async processAudioWithEffect(effectType) {
        if (!this.currentAudio) {
            this.showSuccessMessage('Please record or upload audio first!');
            return;
        }

        // Show processing state
        const activeBtn = document.querySelector(`[data-effect="${effectType}"]`);
        const originalContent = activeBtn.innerHTML;
        activeBtn.innerHTML = '<div class="loading"></div>';
        activeBtn.disabled = true;

        try {
            // Create audio context for processing
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await this.currentAudio.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Apply effect processing
            const processedBuffer = await this.applyWebAudioEffect(audioBuffer, effectType, audioContext);
            
            // Convert processed buffer back to blob
            const processedBlob = await this.audioBufferToBlob(processedBuffer);
            this.currentAudio = processedBlob;
            
            // Update audio element for playback
            const audioUrl = URL.createObjectURL(processedBlob);
            this.audioElement = new Audio(audioUrl);
            
            this.showSuccessMessage(`${effectType.charAt(0).toUpperCase() + effectType.slice(1)} effect applied successfully!`);
            
        } catch (error) {
            console.error('Error processing audio:', error);
            this.showSuccessMessage('Error applying effect. Please try again.');
        } finally {
            // Reset button state
            activeBtn.innerHTML = originalContent;
            activeBtn.disabled = false;
        }
    }

    async applyWebAudioEffect(audioBuffer, effectType, audioContext) {
        const effects = {
            robot: { pitch: 0.5, speed: 0.8, echo: 0.3, distortion: 0.7 },
            deep: { pitch: 0.3, speed: 0.9, echo: 0.1, distortion: 0.2 },
            chipmunk: { pitch: 2.0, speed: 1.2, echo: 0.0, distortion: 0.1 },
            female: { pitch: 1.3, speed: 1.0, echo: 0.1, distortion: 0.0 },
            male: { pitch: 0.7, speed: 0.95, echo: 0.1, distortion: 0.1 },
            echo: { pitch: 1.0, speed: 1.0, echo: 0.8, distortion: 0.0 }
        };
        
        const effect = effects[effectType];
        
        // Create offline context for processing
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length * (1 / effect.speed),
            audioBuffer.sampleRate
        );
        
        // Create source
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = effect.speed;
        
        // Create gain node for volume control
        const gainNode = offlineContext.createGain();
        gainNode.gain.value = 0.8;
        
        // Create pitch shifter (simplified)
        const pitchShifter = offlineContext.createScriptProcessor(4096, 1, 1);
        pitchShifter.onaudioprocess = (event) => {
            const inputBuffer = event.inputBuffer;
            const outputBuffer = event.outputBuffer;
            const inputData = inputBuffer.getChannelData(0);
            const outputData = outputBuffer.getChannelData(0);
            
            for (let i = 0; i < inputData.length; i++) {
                // Simple pitch shifting by resampling
                const sourceIndex = Math.floor(i * effect.pitch);
                if (sourceIndex < inputData.length) {
                    outputData[i] = inputData[sourceIndex];
                } else {
                    outputData[i] = 0;
                }
            }
        };
        
        // Create echo effect
        if (effect.echo > 0) {
            const delayNode = offlineContext.createDelay();
            delayNode.delayTime.value = 0.3;
            const echoGain = offlineContext.createGain();
            echoGain.gain.value = effect.echo;
            
            source.connect(delayNode);
            delayNode.connect(echoGain);
            echoGain.connect(offlineContext.destination);
        }
        
        // Connect nodes
        source.connect(pitchShifter);
        pitchShifter.connect(gainNode);
        gainNode.connect(offlineContext.destination);
        
        // Start processing
        source.start(0);
        
        // Render the processed audio
        return await offlineContext.startRendering();
    }

    async audioBufferToBlob(audioBuffer) {
        // Convert AudioBuffer to WAV blob
        const numberOfChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const length = audioBuffer.length;
        
        // Create WAV header
        const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
        const view = new DataView(arrayBuffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * numberOfChannels * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * numberOfChannels * 2, true);
        
        // Convert audio data
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    startWaveformAnimation() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            if (!this.isRecording) return;
            
            this.animationId = requestAnimationFrame(draw);
            
            this.analyser.getByteFrequencyData(dataArray);
            
            this.waveformCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            this.waveformCtx.fillRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
            
            const barWidth = (this.waveformCanvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * this.waveformCanvas.height;
                
                const gradient = this.waveformCtx.createLinearGradient(0, this.waveformCanvas.height - barHeight, 0, this.waveformCanvas.height);
                gradient.addColorStop(0, '#00d4ff');
                gradient.addColorStop(0.5, '#8b5cf6');
                gradient.addColorStop(1, '#ff6b9d');
                
                this.waveformCtx.fillStyle = gradient;
                this.waveformCtx.fillRect(x, this.waveformCanvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        };
        
        draw();
    }

    stopWaveformAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Clear the canvas
        this.waveformCtx.clearRect(0, 0, this.waveformCanvas.width, this.waveformCanvas.height);
    }

    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateDarkModeIcon(newTheme);
    }

    updateDarkModeIcon(theme) {
        const icon = this.darkModeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    showSuccessMessage(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #00d4ff, #8b5cf6, #ff6b9d);
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(successDiv);
            }, 300);
        }, 3000);
    }
}

// Add CSS animations for success messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the voice changer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new VoiceChanger();
});

// Handle page visibility change to stop recording when tab is not active
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.voiceChanger && window.voiceChanger.isRecording) {
        window.voiceChanger.stopRecording();
    }
});

// Make voiceChanger globally accessible for debugging
window.addEventListener('load', () => {
    window.voiceChanger = new VoiceChanger();
});
