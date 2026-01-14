// ============================================
// STRUCTURI DE DATE PROBABILISTICE
// Presentation Mode JavaScript
// ============================================

// Global state
let pyodide = null;
let pyodideReady = false;
let currentSlide = 0;
let totalSlides = 0;
let slides = [];
let currentTheme = 'dark';
let hideNavTimeout = null;
let slidesLoaded = false;

let bloomFilter = {
    size: 32,
    numHashes: 3,
    bitArray: [],
    addedElements: []
};

let hllState = {
    p: 4,
    registers: [],
    totalAdded: 0,
    uniqueSet: new Set()
};

// ============================================
// Slides Loader (from HTML fragments)
// ============================================

async function loadSlides() {
    const container = document.getElementById('slidesContainer');
    const loadingEl = document.getElementById('slidesLoading');
    
    if (!container || typeof SLIDES_CONFIG === 'undefined') {
        console.error('Slides container or config not found');
        return false;
    }
    
    try {
        // Load all slides in parallel
        const slidePromises = SLIDES_CONFIG.map(async (config, index) => {
            const response = await fetch(`slides/${config.file}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${config.file}: ${response.status}`);
            }
            const html = await response.text();
            return { config, html, index };
        });
        
        const loadedSlides = await Promise.all(slidePromises);
        
        // Sort by index to maintain order
        loadedSlides.sort((a, b) => a.index - b.index);
        
        // Clear loading indicator
        if (loadingEl) {
            loadingEl.remove();
        }
        
        // Create slide elements
        loadedSlides.forEach(({ config, html, index }) => {
            const section = document.createElement('section');
            section.className = 'slide';
            
            // Add extra classes
            config.classes.forEach(cls => section.classList.add(cls));
            
            // Set data attributes
            section.setAttribute('data-slide', index);
            section.setAttribute('data-title', config.title);
            section.setAttribute('data-file', config.file.replace('.html', ''));
            
            // Set inner HTML
            section.innerHTML = html;
            
            container.appendChild(section);
        });
        
        slidesLoaded = true;
        return true;
        
    } catch (error) {
        console.error('Error loading slides:', error);
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div class="loading-error">
                    <p>❌ Eroare la încărcarea slide-urilor</p>
                    <p class="error-details">${error.message}</p>
                    <button onclick="location.reload()">Reîncearcă</button>
                </div>
            `;
        }
        return false;
    }
}

// ============================================
// Slide Navigation
// ============================================

function initSlides() {
    slides = document.querySelectorAll('.slide');
    totalSlides = slides.length;
    
    // Update total slides display
    document.getElementById('totalSlides').textContent = totalSlides;
    
    // Create dots
    createSlideDots();
    
    // Get initial slide from URL or default to 0
    const initialSlide = getSlideFromURL();
    const validSlide = Math.min(Math.max(0, initialSlide), totalSlides - 1);
    goToSlide(validSlide, false); // Don't update URL on initial load
    
    // Setup keyboard navigation
    document.addEventListener('keydown', handleKeyboard);
    
    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
        if (event.state && typeof event.state.slide === 'number') {
            goToSlide(event.state.slide, false);
        }
    });
}

function createSlideDots() {
    const dotsContainer = document.getElementById('slideDots');
    dotsContainer.innerHTML = '';
    
    slides.forEach((slide, index) => {
        const dot = document.createElement('div');
        dot.className = 'slide-dot';
        
        // Add section-specific class
        if (slide.classList.contains('bloom-section')) {
            dot.classList.add('bloom-dot');
        } else if (slide.classList.contains('hll-section')) {
            dot.classList.add('hll-dot');
        } else if (slide.classList.contains('transition-section')) {
            dot.classList.add('transition-dot');
        }
        
        // Get slide title for tooltip
        const slideTitle = getSlideTitle(slide, index);
        dot.setAttribute('data-tooltip', `${index + 1}. ${slideTitle}`);
        dot.setAttribute('data-slide-index', index);
        
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            goToSlide(index);
        });
        
        dotsContainer.appendChild(dot);
    });
}

function getSlideTitle(slide, index) {
    // First try data-title attribute (from config)
    const dataTitle = slide.getAttribute('data-title');
    if (dataTitle) {
        return dataTitle;
    }
    
    // Try to get title from h1 or h2
    const h1 = slide.querySelector('h1');
    const h2 = slide.querySelector('h2');
    
    if (h1) {
        return h1.textContent.trim();
    } else if (h2) {
        return h2.textContent.trim();
    }
    
    // Fallback based on slide class
    if (slide.classList.contains('cover')) return 'Introducere';
    if (slide.classList.contains('final-slide')) return 'Întrebări';
    
    return `Slide ${index + 1}`;
}

function goToSlide(index, updateURL = true) {
    if (index < 0 || index >= totalSlides) return;
    
    // Remove active from all slides
    slides.forEach(slide => slide.classList.remove('active'));
    
    // Add active to current slide
    slides[index].classList.add('active');
    
    // Scroll slide to top
    slides[index].scrollTop = 0;
    
    // Update current slide
    currentSlide = index;
    
    // Update UI
    updateSlideUI();
    
    // Update URL
    if (updateURL) {
        updateURLWithSlide(index);
    }
}

function updateURLWithSlide(index) {
    const slideNum = index + 1;
    const slideFile = slides[index]?.getAttribute('data-file') || '';
    const newURL = `${window.location.pathname}?slide=${slideNum}&file=${slideFile}`;
    window.history.replaceState({ slide: index, file: slideFile }, '', newURL);
}

function getSlideFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const querySlide = urlParams.get('slide');
    if (querySlide) {
        const slideNum = parseInt(querySlide, 10);
        if (!isNaN(slideNum) && slideNum >= 1) {
            return slideNum - 1; // Convert to 0-based index
        }
    }
    return 0; // Default to first slide
}

function nextSlide() {
    if (currentSlide < totalSlides - 1) {
        goToSlide(currentSlide + 1);
    }
}

function prevSlide() {
    if (currentSlide > 0) {
        goToSlide(currentSlide - 1);
    }
}

function updateSlideUI() {
    // Update counter
    document.getElementById('currentSlide').textContent = currentSlide + 1;
    
    // Update progress bar
    const progress = ((currentSlide + 1) / totalSlides) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    
    // Update dots
    const dots = document.querySelectorAll('.slide-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
    
    // Update nav buttons
    const prevBtn = document.querySelector('.slide-nav-btn.prev');
    const nextBtn = document.querySelector('.slide-nav-btn.next');
    
    if (prevBtn) prevBtn.disabled = currentSlide === 0;
    if (nextBtn) nextBtn.disabled = currentSlide === totalSlides - 1;
}

function handleKeyboard(e) {
    // Don't navigate if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
            e.preventDefault();
            nextSlide();
            break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
            e.preventDefault();
            prevSlide();
            break;
        case 'Home':
            e.preventDefault();
            goToSlide(0);
            break;
        case 'End':
            e.preventDefault();
            goToSlide(totalSlides - 1);
            break;
    }
}


// ============================================
// Pyodide Setup
// ============================================

async function loadPyodideRuntime() {
    const statusDot = document.querySelector('.status-dot');
    const pyodideStatus = document.getElementById('pyodideStatus');
    
    // Check if loadPyodide function exists (from CDN)
    if (typeof loadPyodide === 'undefined') {
        console.error('Pyodide library not loaded from CDN');
        statusDot.classList.remove('loading');
        statusDot.style.background = 'var(--accent-danger)';
        pyodideStatus.title = 'Python indisponibil';
        return;
    }
    
    try {
        pyodideStatus.title = 'Se încarcă Python...';
        console.log('Starting Pyodide load...');
        
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
        });
        
        statusDot.classList.remove('loading');
        statusDot.classList.add('ready');
        pyodideStatus.title = 'Python gata!';
        pyodideReady = true;
        
        console.log('Pyodide loaded successfully');
    } catch (error) {
        console.error('Error loading Pyodide:', error);
        statusDot.classList.remove('loading');
        statusDot.style.background = 'var(--accent-danger)';
        pyodideStatus.title = 'Eroare Python: ' + error.message;
    }
}

// ============================================
// Theme Toggle
// ============================================

function initTheme() {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('presentation-theme') || 'dark';
    setTheme(savedTheme);
    
    // Setup toggle button
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
    }
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('presentation-theme', theme);
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// ============================================
// Auto-hide Navigation
// ============================================

let isNavHovered = false;

function initAutoHideNav() {
    const slideNav = document.querySelector('.slide-nav');
    if (!slideNav) return;
    
    // Track when mouse is over the nav
    slideNav.addEventListener('mouseenter', () => {
        isNavHovered = true;
        showNav();
    });
    
    slideNav.addEventListener('mouseleave', () => {
        isNavHovered = false;
        resetHideNavTimer();
    });
    
    // Show nav on mouse move
    document.addEventListener('mousemove', () => {
        showNav();
        resetHideNavTimer();
    });
    
    // Also show on touch for mobile
    document.addEventListener('touchstart', () => {
        showNav();
        resetHideNavTimer();
    });
    
    // Start the initial timer
    resetHideNavTimer();
}

function showNav() {
    const slideNav = document.querySelector('.slide-nav');
    if (slideNav) {
        slideNav.classList.remove('hidden');
    }
}

function hideNav() {
    // Don't hide if mouse is over the nav
    if (isNavHovered) return;
    
    const slideNav = document.querySelector('.slide-nav');
    if (slideNav) {
        slideNav.classList.add('hidden');
    }
}

function resetHideNavTimer() {
    // Clear existing timer
    if (hideNavTimeout) {
        clearTimeout(hideNavTimeout);
    }
    // Set new timer to hide after 3 seconds
    hideNavTimeout = setTimeout(hideNav, 3000);
}

async function runPythonCode(codeId) {
    if (!pyodideReady) {
        alert('Python se încarcă încă. Vă rugăm așteptați câteva secunde.');
        return;
    }
    
    const codeElement = document.getElementById(codeId);
    const outputElement = document.getElementById(`output-${codeId}`);
    
    if (!codeElement || !outputElement) return;
    
    const code = codeElement.textContent;
    outputElement.innerHTML = '<span class="output-placeholder">Se execută...</span>';
    
    try {
        // Capture stdout
        pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
        `);
        
        // Run the user code
        await pyodide.runPythonAsync(code);
        
        // Get the output
        const output = pyodide.runPython(`sys.stdout.getvalue()`);
        outputElement.textContent = output || 'Cod executat cu succes (fără output).';
        
    } catch (error) {
        outputElement.innerHTML = `<span style="color: var(--accent-danger);">Eroare: ${error.message}</span>`;
    }
}

// ============================================
// Bloom Filter Interactive Demo
// ============================================

function initBloomFilter() {
    bloomFilter.bitArray = new Array(bloomFilter.size).fill(0);
    bloomFilter.addedElements = [];
    renderBloomFilter();
}

function simpleHash(str, seed) {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
        hash = hash ^ (hash >>> 16);
    }
    return Math.abs(hash);
}

function getBloomHashes(item) {
    const hashes = [];
    for (let i = 0; i < bloomFilter.numHashes; i++) {
        const h = simpleHash(item, (i + 1) * 31337);
        hashes.push(h % bloomFilter.size);
    }
    return hashes;
}

function addToBloom() {
    const input = document.getElementById('bloomInput');
    const item = input.value.trim();
    
    if (!item) {
        showBloomOutput('Vă rugăm introduceți un cuvânt.', 'warning');
        return;
    }
    
    const hashes = getBloomHashes(item);
    
    hashes.forEach(pos => {
        bloomFilter.bitArray[pos] = 1;
    });
    
    bloomFilter.addedElements.push(item);
    
    renderBloomFilter(hashes);
    showBloomOutput(`✓ "${item}" adăugat. Hash-uri: [${hashes.join(', ')}]`, 'success');
    updateAddedList();
    
    input.value = '';
    input.focus();
}

function checkBloom() {
    const input = document.getElementById('bloomInput');
    const item = input.value.trim();
    
    if (!item) {
        showBloomOutput('Vă rugăm introduceți un cuvânt pentru verificare.', 'warning');
        return;
    }
    
    const hashes = getBloomHashes(item);
    const exists = hashes.every(pos => bloomFilter.bitArray[pos] === 1);
    const actuallyExists = bloomFilter.addedElements.includes(item);
    
    renderBloomFilter(hashes, true);
    
    if (exists) {
        if (actuallyExists) {
            showBloomOutput(`✓ "${item}" PROBABIL există în filter (și chiar a fost adăugat).\nPozițiile verificate: [${hashes.join(', ')}]`, 'success');
        } else {
            showBloomOutput(`⚠ "${item}" PROBABIL există în filter (FALSE POSITIVE! - nu a fost adăugat efectiv).\nPozițiile verificate: [${hashes.join(', ')}]`, 'warning');
        }
    } else {
        showBloomOutput(`✗ "${item}" SIGUR NU există în filter.\nPozițiile verificate: [${hashes.join(', ')}] - cel puțin una e 0.`, 'error');
    }
}

function resetBloom() {
    initBloomFilter();
    showBloomOutput('Bloom Filter resetat.', '');
    updateAddedList();
}

function renderBloomFilter(highlightPositions = [], isCheck = false) {
    const container = document.getElementById('bloomBitArray');
    if (!container) return;
    
    container.innerHTML = '';
    
    bloomFilter.bitArray.forEach((bit, index) => {
        const div = document.createElement('div');
        div.className = 'bit';
        div.textContent = bit;
        
        if (bit === 1) {
            div.classList.add('active');
        }
        
        if (highlightPositions && highlightPositions.includes(index)) {
            div.classList.add('highlight');
            setTimeout(() => div.classList.remove('highlight'), 1000);
        }
        
        container.appendChild(div);
    });
    
    const hashContainer = document.getElementById('hashIndicators');
    if (hashContainer && highlightPositions && highlightPositions.length > 0) {
        hashContainer.innerHTML = highlightPositions.map((pos, i) => 
            `<span class="hash-indicator">h${i+1}() → ${pos}</span>`
        ).join('');
    }
}

function showBloomOutput(message, type) {
    const output = document.getElementById('bloomOutput');
    if (!output) return;
    
    output.innerHTML = `<p>${message}</p>`;
    output.className = 'demo-output';
    if (type) {
        output.classList.add(type);
    }
}

function updateAddedList() {
    const list = document.getElementById('addedList');
    if (!list) return;
    
    if (bloomFilter.addedElements.length === 0) {
        list.textContent = 'Niciun element încă';
    } else {
        list.textContent = bloomFilter.addedElements.join(', ');
    }
}

// ============================================
// HyperLogLog Interactive Demo
// ============================================

function initHLL() {
    const m = Math.pow(2, hllState.p);
    hllState.registers = new Array(m).fill(0);
    hllState.totalAdded = 0;
    hllState.uniqueSet = new Set();
    renderHLL();
}

function hllHash(item) {
    let hash = 0;
    const str = String(item);
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
}

function countLeadingZeros(value, bits) {
    if (value === 0) return bits;
    let count = 0;
    let mask = 1 << (bits - 1);
    while ((value & mask) === 0 && mask > 0) {
        count++;
        mask >>>= 1;
    }
    return count;
}

function hllAdd(item) {
    const hash = hllHash(item);
    const p = hllState.p;
    
    const index = hash >>> (32 - p);
    const remaining = hash & ((1 << (32 - p)) - 1);
    const leadingZeros = countLeadingZeros(remaining, 32 - p) + 1;
    
    hllState.registers[index] = Math.max(hllState.registers[index], leadingZeros);
}

function hllEstimate() {
    const m = hllState.registers.length;
    
    let alpha;
    if (m === 16) alpha = 0.673;
    else if (m === 32) alpha = 0.697;
    else if (m === 64) alpha = 0.709;
    else alpha = 0.7213 / (1 + 1.079 / m);
    
    let Z = 0;
    for (let i = 0; i < m; i++) {
        Z += Math.pow(2, -hllState.registers[i]);
    }
    
    let E = alpha * m * m / Z;
    
    if (E <= 2.5 * m) {
        const V = hllState.registers.filter(r => r === 0).length;
        if (V > 0) {
            E = m * Math.log(m / V);
        }
    }
    
    return Math.round(E);
}

function addRandomElements(count) {
    for (let i = 0; i < count; i++) {
        const id = Math.floor(Math.random() * (hllState.totalAdded + count * 2));
        const element = `element_${id}`;
        
        hllAdd(element);
        hllState.uniqueSet.add(element);
        hllState.totalAdded++;
    }
    
    renderHLL();
}

function resetHLL() {
    initHLL();
}

function renderHLL() {
    const totalEl = document.getElementById('hllTotalAdded');
    const uniqueEl = document.getElementById('hllActualUnique');
    const estimateEl = document.getElementById('hllEstimate');
    const errorEl = document.getElementById('hllError');
    
    if (totalEl) totalEl.textContent = hllState.totalAdded.toLocaleString();
    if (uniqueEl) uniqueEl.textContent = hllState.uniqueSet.size.toLocaleString();
    
    const estimate = hllEstimate();
    if (estimateEl) estimateEl.textContent = estimate.toLocaleString();
    
    const actual = hllState.uniqueSet.size;
    const error = actual === 0 ? 0 : Math.abs(estimate - actual) / actual * 100;
    if (errorEl) errorEl.textContent = error.toFixed(2) + '%';
    
    const container = document.getElementById('hllRegisters');
    if (!container) return;
    
    container.innerHTML = '';
    
    hllState.registers.forEach((value, index) => {
        const div = document.createElement('div');
        div.className = 'register';
        div.innerHTML = `
            <span class="register-index">R[${index}]</span>
            <span class="register-value">${value}</span>
        `;
        
        if (value > 0) {
            const intensity = Math.min(value / 10, 1);
            div.style.background = `rgba(245, 158, 11, ${0.1 + intensity * 0.3})`;
        }
        
        container.appendChild(div);
    });
}

// ============================================
// Initialize
// ============================================

async function initializePresentation() {
    // Initialize theme first
    initTheme();
    
    // Load slides from HTML fragments
    const loaded = await loadSlides();
    
    if (!loaded) {
        console.error('Failed to load slides');
        return;
    }
    
    // Initialize slides navigation
    initSlides();
    
    // Initialize auto-hide navigation
    initAutoHideNav();
    
    // Load Pyodide
    loadPyodideRuntime();
    
    // Initialize interactive demos
    initBloomFilter();
    initHLL();
    
    // Apply syntax highlighting with Prism.js
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
    
    console.log('Presentation Mode Loaded - Use arrow keys or buttons to navigate');
}

document.addEventListener('DOMContentLoaded', initializePresentation);

// Make functions globally available
window.runPythonCode = runPythonCode;
window.addToBloom = addToBloom;
window.checkBloom = checkBloom;
window.resetBloom = resetBloom;
window.addRandomElements = addRandomElements;
window.resetHLL = resetHLL;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.goToSlide = goToSlide;
