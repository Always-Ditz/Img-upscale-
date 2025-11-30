// State
let selectedFile = null;
let selectedScale = 8;
let upscaledImageUrl = null;

// Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const upscaleBtn = document.getElementById('upscaleBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const previewArea = document.getElementById('previewArea');
const originalPreview = document.getElementById('originalPreview');
const upscaledPreview = document.getElementById('upscaledPreview');
const upscaledBox = document.getElementById('upscaledBox');
const resultActions = document.getElementById('resultActions');
const processingOverlay = document.getElementById('processingOverlay');
const scaleButtons = document.querySelectorAll('.scale-btn');
const loadingScreen = document.getElementById('loading-screen');
const container = document.querySelector('.container');

// Loading Screen
window.addEventListener('load', () => {
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            container.classList.add('visible');
        }, 200);
    }, 1500);
});

// Upload Area Click
uploadArea.addEventListener('click', () => fileInput.click());

// File Input Change
fileInput.addEventListener('change', handleFileSelect);

// Drag and Drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Scale Selection
scaleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        scaleButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedScale = parseInt(btn.dataset.scale);
    });
});

// Upscale Button
upscaleBtn.addEventListener('click', upscaleImage);

// Download Button
downloadBtn.addEventListener('click', downloadImage);

// Reset Button
resetBtn.addEventListener('click', resetAll);

// Handle File Select
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// Handle File
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file!');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB!');
        return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        originalPreview.src = e.target.result;
        upscaledPreview.src = '';
        previewArea.classList.add('visible');
        upscaleBtn.disabled = false;
        
        // Hide upscaled box and result actions
        upscaledBox.classList.remove('visible');
        resultActions.classList.remove('visible');
    };
    reader.readAsDataURL(file);
}

// Upscale Image
async function upscaleImage() {
    if (!selectedFile) return;

    processingOverlay.classList.add('visible');
    upscaleBtn.disabled = true;

    try {
        // Call Netlify Function
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('scale', selectedScale);

        const response = await fetch('/.netlify/functions/upscale', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upscale failed');
        }

        const data = await response.json();
        upscaledImageUrl = data.url;

        // Display upscaled image
        upscaledPreview.src = upscaledImageUrl;
        
        // Show upscaled box and result action buttons
        upscaledBox.classList.add('visible');
        resultActions.classList.add('visible');

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to upscale image. Please try again.');
        upscaleBtn.disabled = false;
    } finally {
        processingOverlay.classList.remove('visible');
    }
}

// Download Image
async function downloadImage() {
    if (!upscaledImageUrl) return;

    try {
        // Use proxy to avoid CORS
        const response = await fetch('/.netlify/functions/download?url=' + encodeURIComponent(upscaledImageUrl));
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Gunakan selectedScale yang sebenarnya
        a.download = `upscaled_${selectedScale}x_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log(`Downloaded with scale: ${selectedScale}x`);
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download image. Please try again.');
    }
}

// Reset All
function resetAll() {
    selectedFile = null;
    upscaledImageUrl = null;
    fileInput.value = '';
    originalPreview.src = '';
    upscaledPreview.src = '';
    previewArea.classList.remove('visible');
    upscaleBtn.disabled = true;
    
    // Hide upscaled box and result actions
    upscaledBox.classList.remove('visible');
    resultActions.classList.remove('visible');
        }
