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
    p: 4,  // Configurable via slider
    registers: [],
    totalAdded: 0,
    uniqueSet: new Set(),
    insertLog: [],  // Track recent insertions
    sllPercent: 30,  // SuperLogLog: percentage of top registers to exclude
    smallRangeCorrection: true,  // Linear counting for small cardinalities
    largeRangeCorrection: true   // Hash collision correction for large cardinalities
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
    
    // Check which bits were already set
    const alreadySet = hashes.filter(pos => bloomFilter.bitArray[pos] === 1);
    const newlySet = hashes.filter(pos => bloomFilter.bitArray[pos] === 0);
    
    hashes.forEach(pos => {
        bloomFilter.bitArray[pos] = 1;
    });
    
    bloomFilter.addedElements.push(item);
    
    renderBloomFilter(hashes, null);
    renderHashExplanation(item, hashes, false, null);
    
    let msg = `✓ "${item}" adăugat în Bloom Filter.`;
    if (newlySet.length > 0) {
        msg += ` Biți noi setați: [${newlySet.join(', ')}].`;
    }
    if (alreadySet.length > 0) {
        msg += ` Biți deja 1: [${alreadySet.join(', ')}].`;
    }
    showBloomOutput(msg, 'success');
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
    const missingBits = hashes.filter(pos => bloomFilter.bitArray[pos] === 0);
    
    renderBloomFilter(hashes, exists);
    renderHashExplanation(item, hashes, true, exists);
    
    if (exists) {
        if (actuallyExists) {
            showBloomOutput(`✓ "${item}" PROBABIL există (și chiar a fost adăugat). Toți cei ${hashes.length} biți verificați sunt 1.`, 'success');
        } else {
            showBloomOutput(`⚠ FALSE POSITIVE! "${item}" pare să existe, dar NU a fost adăugat. Biții [${hashes.join(', ')}] au fost setați de alte elemente.`, 'warning');
        }
    } else {
        showBloomOutput(`✗ "${item}" SIGUR NU există. Bit${missingBits.length > 1 ? 'ții' : 'ul'} [${missingBits.join(', ')}] ${missingBits.length > 1 ? 'sunt' : 'este'} 0.`, 'error');
    }
}

function resetBloom() {
    initBloomFilter();
    showBloomOutput('Bloom Filter resetat. Adaugă cuvinte pentru a vedea cum funcționează.', '');
    updateAddedList();
    
    // Clear hash explanation
    const hashContainer = document.getElementById('hashIndicators');
    if (hashContainer) hashContainer.innerHTML = '';
}

function renderBloomFilter(highlightPositions = [], checkResult = null) {
    const container = document.getElementById('bloomBitArray');
    const indicesContainer = document.getElementById('bloomBitIndices');
    const bitsSetCount = document.getElementById('bitsSetCount');
    if (!container) return;
    
    container.innerHTML = '';
    if (indicesContainer) indicesContainer.innerHTML = '';
    
    // Count bits set
    const setCount = bloomFilter.bitArray.filter(b => b === 1).length;
    if (bitsSetCount) bitsSetCount.textContent = setCount;
    
    bloomFilter.bitArray.forEach((bit, index) => {
        // Bit cell
        const div = document.createElement('div');
        div.className = 'bit-cell';
        div.textContent = bit;
        
        if (bit === 1) {
            div.classList.add('set');
        }
        
        // Highlight logic
        if (highlightPositions && highlightPositions.includes(index)) {
            if (checkResult !== null) {
                // Check mode: show which bits match/don't match
                if (bit === 1) {
                    div.classList.add('check-hit');
                } else {
                    div.classList.add('check-miss');
                }
            } else {
                // Add mode: highlight new positions
                div.classList.add('adding');
            }
        }
        
        container.appendChild(div);
        
        // Index label
        if (indicesContainer) {
            const idxSpan = document.createElement('span');
            idxSpan.className = 'bit-index';
            idxSpan.textContent = index;
            if (highlightPositions && highlightPositions.includes(index)) {
                idxSpan.classList.add('highlight');
            }
            indicesContainer.appendChild(idxSpan);
        }
    });
}

function renderHashExplanation(item, hashes, isCheck = false, checkResult = null) {
    const hashContainer = document.getElementById('hashIndicators');
    if (!hashContainer) return;
    
    if (!hashes || hashes.length === 0) {
        hashContainer.innerHTML = '';
        return;
    }
    
    let html = `<div class="hash-explanation">`;
    html += `<div class="hash-title">${isCheck ? 'Verificare' : 'Inserare'}: "<strong>${item}</strong>"</div>`;
    html += `<div class="hash-steps">`;
    
    hashes.forEach((pos, i) => {
        const bitValue = bloomFilter.bitArray[pos];
        const statusClass = isCheck ? (bitValue === 1 ? 'hit' : 'miss') : 'add';
        const statusIcon = isCheck ? (bitValue === 1 ? '✓' : '✗') : '→';
        html += `
            <div class="hash-step ${statusClass}">
                <span class="hash-func">h<sub>${i+1}</sub>("${item}")</span>
                <span class="hash-arrow">=</span>
                <span class="hash-pos">${pos}</span>
                <span class="hash-status">${statusIcon} bit[${pos}] = ${bitValue}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    // Conclusion
    if (isCheck) {
        const allSet = hashes.every(pos => bloomFilter.bitArray[pos] === 1);
        if (allSet) {
            html += `<div class="hash-conclusion hit">Toți biții sunt 1 → PROBABIL există</div>`;
        } else {
            const missingBits = hashes.filter(pos => bloomFilter.bitArray[pos] === 0);
            html += `<div class="hash-conclusion miss">Bit${missingBits.length > 1 ? 'ții' : 'ul'} [${missingBits.join(', ')}] ${missingBits.length > 1 ? 'sunt' : 'este'} 0 → SIGUR NU există</div>`;
        }
    }
    
    html += `</div>`;
    hashContainer.innerHTML = html;
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
    const countEl = document.getElementById('addedCount');
    if (!list) return;
    
    if (countEl) countEl.textContent = bloomFilter.addedElements.length;
    
    if (bloomFilter.addedElements.length === 0) {
        list.innerHTML = '<span class="empty-hint" style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Niciun element încă</span>';
    } else {
        list.innerHTML = bloomFilter.addedElements.map(el => 
            `<span class="element-tag" style="
                display: inline-block;
                padding: 2px 8px;
                background: var(--bg-tertiary);
                border: 1px solid var(--accent-primary);
                border-radius: 12px;
                font-family: var(--font-mono);
                font-size: 0.75rem;
                color: var(--accent-primary);
            ">${el}</span>`
        ).join('');
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
    hllState.insertLog = [];
    renderHLL();
    updateHLLConfigDisplay();
}

function updateHLLConfig() {
    const slider = document.getElementById('hllPSlider');
    if (slider) {
        hllState.p = parseInt(slider.value);
    }
    initHLL();
}

function updateHLLConfigDisplay() {
    const pDisplay = document.getElementById('pValueDisplay');
    const regCountDisplay = document.getElementById('registerCountDisplay');
    const theoreticalError = document.getElementById('hllTheoreticalError');
    const mValueFormula = document.getElementById('mValueFormula');
    
    const m = Math.pow(2, hllState.p);
    
    if (pDisplay) pDisplay.textContent = hllState.p;
    if (regCountDisplay) regCountDisplay.textContent = `= ${m.toLocaleString()} registre`;
    if (theoreticalError) {
        const stdError = (1.04 / Math.sqrt(m) * 100).toFixed(1);
        theoreticalError.textContent = `~${stdError}%`;
    }
    if (mValueFormula) mValueFormula.textContent = m.toLocaleString();
}

function hllHash(item) {
    // MurmurHash3-like mixing for better distribution
    const str = String(item);
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    
    return (h1 ^ h2) >>> 0;
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
    
    const oldValue = hllState.registers[index];
    const updated = leadingZeros > oldValue;
    hllState.registers[index] = Math.max(oldValue, leadingZeros);
    
    // Return insertion details
    return {
        item: item,
        hash: hash,
        index: index,
        zeros: leadingZeros,
        oldValue: oldValue,
        newValue: hllState.registers[index],
        updated: updated
    };
}

function getAlpha(m) {
    if (m === 16) return 0.673;
    if (m === 32) return 0.697;
    if (m === 64) return 0.709;
    return 0.7213 / (1 + 1.079 / m);
}

// LogLog: uses arithmetic mean
function loglogEstimate() {
    const m = hllState.registers.length;
    const alpha = getAlpha(m);
    
    // Arithmetic mean of registers
    const sum = hllState.registers.reduce((a, b) => a + b, 0);
    const avgR = sum / m;
    
    const E = alpha * m * Math.pow(2, avgR);
    return Math.round(E);
}

// SuperLogLog: excludes top X% of registers (outliers)
function superloglogEstimate() {
    const m = hllState.registers.length;
    const alpha = getAlpha(m);
    const excludePercent = hllState.sllPercent / 100;
    
    // Sort registers and exclude top X%
    const sorted = [...hllState.registers].sort((a, b) => a - b);
    const keepCount = Math.floor(m * (1 - excludePercent));
    const truncated = sorted.slice(0, Math.max(1, keepCount));
    
    // Arithmetic mean of truncated registers
    const sum = truncated.reduce((a, b) => a + b, 0);
    const avgR = sum / truncated.length;
    
    // Use original m for estimation (not truncated length)
    const E = alpha * m * Math.pow(2, avgR);
    return Math.round(E);
}

// HyperLogLog: uses harmonic mean
function hllEstimate() {
    const m = hllState.registers.length;
    const alpha = getAlpha(m);
    
    // Harmonic mean via sum of 2^(-R)
    let Z = 0;
    for (let i = 0; i < m; i++) {
        Z += Math.pow(2, -hllState.registers[i]);
    }
    
    let E = alpha * m * m / Z;
    let correctionApplied = null;
    const rawE = E;
    
    // Small range correction (Linear Counting)
    if (hllState.smallRangeCorrection && E <= 2.5 * m) {
        const V = hllState.registers.filter(r => r === 0).length;
        if (V > 0) {
            E = m * Math.log(m / V);
            correctionApplied = 'small';
        }
    }
    
    // Large range correction (hash collision adjustment)
    const twoTo32 = Math.pow(2, 32);
    if (hllState.largeRangeCorrection && E > twoTo32 / 30) {
        E = -twoTo32 * Math.log(1 - E / twoTo32);
        correctionApplied = 'large';
    }
    
    // Store correction info for display
    hllState.lastCorrection = correctionApplied;
    hllState.rawEstimate = Math.round(rawE);
    
    return Math.round(E);
}

function toggleSmallCorrection() {
    hllState.smallRangeCorrection = !hllState.smallRangeCorrection;
    renderHLL();
}

function toggleLargeCorrection() {
    hllState.largeRangeCorrection = !hllState.largeRangeCorrection;
    renderHLL();
}

function updateSLLPercent() {
    const slider = document.getElementById('sllPercentSlider');
    const display = document.getElementById('sllPercentDisplay');
    if (slider) {
        hllState.sllPercent = parseInt(slider.value);
        if (display) display.textContent = hllState.sllPercent;
        renderHLL();
    }
}

function addRandomElements(count) {
    hllState.insertLog = []; // Clear log for batch
    
    for (let i = 0; i < count; i++) {
        const id = Math.floor(Math.random() * (hllState.totalAdded + count * 2));
        const element = `user_${id}`;
        
        const result = hllAdd(element);
        hllState.uniqueSet.add(element);
        hllState.totalAdded++;
        
        // Keep only last 10 insertions in log
        if (hllState.insertLog.length < 10) {
            hllState.insertLog.push(result);
        }
    }
    
    renderHLL();
}

function addRandomElementsCustom() {
    const countInput = document.getElementById('hllElementCount');
    const count = countInput ? parseInt(countInput.value) || 10 : 10;
    addRandomElements(Math.min(count, 10000));
}

function resetHLL() {
    initHLL();
}

function renderHLL() {
    const totalEl = document.getElementById('hllTotalAdded');
    const uniqueEl = document.getElementById('hllActualUnique');
    
    if (totalEl) totalEl.textContent = hllState.totalAdded.toLocaleString();
    if (uniqueEl) uniqueEl.textContent = hllState.uniqueSet.size.toLocaleString();
    
    const actual = hllState.uniqueSet.size;
    
    // Calculate all three estimates
    const llEst = loglogEstimate();
    const sllEst = superloglogEstimate();
    const hllEst = hllEstimate();
    
    // Helper to calculate and display error
    function displayEstimate(estEl, errEl, estimate) {
        if (estEl) estEl.textContent = estimate.toLocaleString();
        if (errEl) {
            const error = actual === 0 ? 0 : Math.abs(estimate - actual) / actual * 100;
            errEl.textContent = error.toFixed(1) + '%';
            // Color code the error
            if (error < 10) errEl.style.color = 'var(--accent-success)';
            else if (error < 25) errEl.style.color = 'var(--accent-tertiary)';
            else errEl.style.color = 'var(--accent-danger)';
        }
    }
    
    // LogLog
    displayEstimate(
        document.getElementById('loglogEstimate'),
        document.getElementById('loglogError'),
        llEst
    );
    
    // SuperLogLog
    displayEstimate(
        document.getElementById('superloglogEstimate'),
        document.getElementById('superloglogError'),
        sllEst
    );
    
    // HyperLogLog
    displayEstimate(
        document.getElementById('hllEstimate'),
        document.getElementById('hllError'),
        hllEst
    );
    
    // Show correction info
    const correctionInfo = document.getElementById('hllCorrectionInfo');
    if (correctionInfo) {
        if (hllState.lastCorrection === 'small') {
            const V = hllState.registers.filter(r => r === 0).length;
            correctionInfo.innerHTML = `📉 Linear Counting activ (V=${V} registre=0)`;
            correctionInfo.style.color = 'var(--accent-primary)';
        } else if (hllState.lastCorrection === 'large') {
            correctionInfo.innerHTML = `📈 Corecție coliziuni hash activă`;
            correctionInfo.style.color = 'var(--accent-tertiary)';
        } else {
            correctionInfo.innerHTML = `<span style="color: var(--text-muted);">Fără corecții (interval normal)</span>`;
        }
    }
    
    // Sync checkboxes and show applicability
    const smallToggle = document.getElementById('smallCorrectionToggle');
    const largeToggle = document.getElementById('largeCorrectionToggle');
    const smallLabel = document.getElementById('smallCorrectionLabel');
    const largeLabel = document.getElementById('largeCorrectionLabel');
    
    if (smallToggle) smallToggle.checked = hllState.smallRangeCorrection;
    if (largeToggle) largeToggle.checked = hllState.largeRangeCorrection;
    
    // Check if corrections would apply
    const m = hllState.registers.length;
    const rawE = hllState.rawEstimate || 0;
    const twoTo32 = Math.pow(2, 32);
    const V = hllState.registers.filter(r => r === 0).length;
    
    const smallApplicable = rawE <= 2.5 * m && V > 0;
    const largeApplicable = rawE > twoTo32 / 30;
    
    if (smallLabel) {
        if (smallApplicable) {
            smallLabel.style.opacity = '1';
            smallLabel.title = `Aplicabil: E=${rawE} ≤ ${Math.round(2.5*m)}, V=${V}`;
        } else {
            smallLabel.style.opacity = '0.5';
            smallLabel.title = `Nu se aplică: E=${rawE} > ${Math.round(2.5*m)} sau V=0`;
        }
    }
    if (largeLabel) {
        if (largeApplicable) {
            largeLabel.style.opacity = '1';
            largeLabel.title = `Aplicabil: E > ${Math.round(twoTo32/30).toLocaleString()}`;
        } else {
            largeLabel.style.opacity = '0.5';
            largeLabel.title = `Nu se aplică: E prea mic`;
        }
    }
    
    // Render insertion log
    const logEl = document.getElementById('hllInsertLog');
    if (logEl && hllState.insertLog.length > 0) {
        logEl.innerHTML = hllState.insertLog.map(r => {
            const updateIcon = r.updated ? '↑' : '=';
            const updateColor = r.updated ? 'var(--accent-success)' : 'var(--text-muted)';
            return `<span style="color: ${updateColor}">"${r.item}" → R[${r.index}] ${updateIcon} ${r.newValue} (zeros=${r.zeros})</span>`;
        }).join('<br>');
    } else if (logEl && hllState.totalAdded === 0) {
        logEl.innerHTML = '<em style="color: var(--text-muted);">Adaugă elemente pentru a vedea detaliile...</em>';
    }
    
    // Render registers
    const container = document.getElementById('hllRegisters');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Find recently updated registers for highlighting
    const recentIndices = new Set(hllState.insertLog.filter(r => r.updated).map(r => r.index));
    
    hllState.registers.forEach((value, index) => {
        const div = document.createElement('div');
        div.className = 'register';
        
        // Tooltip with details
        const hashBits = hllState.p;
        div.title = `Registru ${index}\nmax_zeros + 1 = ${value}\nEstimează ~2^${value} = ${Math.pow(2, value)} elemente în acest bucket`;
        
        div.innerHTML = `
            <span class="register-index">${index}</span>
            <span class="register-value">${value}</span>
        `;
        
        if (value > 0) {
            const intensity = Math.min(value / 10, 1);
            div.style.background = `rgba(245, 158, 11, ${0.1 + intensity * 0.4})`;
        }
        
        // Highlight recently updated
        if (recentIndices.has(index)) {
            div.style.boxShadow = '0 0 8px var(--accent-success)';
            div.style.borderColor = 'var(--accent-success)';
        }
        
        container.appendChild(div);
    });
    
    updateHLLConfigDisplay();
}

// ============================================
// Bloom Filter Math Calculator
// ============================================

function initBloomMathCalc() {
    const mSlider = document.getElementById('mSlider');
    const kSlider = document.getElementById('kSlider');
    const nSlider = document.getElementById('nSlider');
    
    if (!mSlider || !kSlider || !nSlider) return;
    
    // Add event listeners
    mSlider.addEventListener('input', updateBloomMathCalc);
    kSlider.addEventListener('input', updateBloomMathCalc);
    nSlider.addEventListener('input', updateBloomMathCalc);
    
    // Initial calculation
    updateBloomMathCalc();
}

function updateBloomMathCalc() {
    const mSlider = document.getElementById('mSlider');
    const kSlider = document.getElementById('kSlider');
    const nSlider = document.getElementById('nSlider');
    
    if (!mSlider || !kSlider || !nSlider) return;
    
    const m = parseInt(mSlider.value);
    const k = parseInt(kSlider.value);
    const n = parseInt(nSlider.value);
    
    // Update displayed values
    const mValueEl = document.getElementById('mValue');
    const kValueEl = document.getElementById('kValue');
    const nValueEl = document.getElementById('nValue');
    
    if (mValueEl) mValueEl.textContent = m.toLocaleString();
    if (kValueEl) kValueEl.textContent = k;
    if (nValueEl) nValueEl.textContent = n;
    
    // Calculate FP rate: (1 - e^(-kn/m))^k
    const fp = Math.pow(1 - Math.exp(-k * n / m), k);
    const fpPercent = (fp * 100).toFixed(2);
    
    // Calculate fill ratio: 1 - e^(-kn/m)
    const fillRatio = (1 - Math.exp(-k * n / m)) * 100;
    
    // Calculate optimal k
    const kOpt = (m / n) * Math.LN2;
    
    // Update stats
    const fpEl = document.getElementById('fpRate');
    if (fpEl) {
        fpEl.textContent = fpPercent + '%';
        fpEl.style.color = fp > 0.1 ? 'var(--accent-danger)' : fp > 0.05 ? 'var(--accent-tertiary)' : 'var(--accent-success)';
    }
    
    const fillEl = document.getElementById('fillRatio');
    if (fillEl) fillEl.textContent = fillRatio.toFixed(1) + '%';
    
    const kOptEl = document.getElementById('kOptimal');
    if (kOptEl) kOptEl.textContent = kOpt.toFixed(1);
    
    // Generate chart - show FP rate as n grows from 0 to max slider value
    const chart = document.getElementById('fpChart');
    if (!chart) return;
    
    const maxN = parseInt(nSlider.max);
    const bars = 30;
    let html = '';
    
    for (let i = 0; i <= bars; i++) {
        const ni = Math.round((i / bars) * maxN);
        const fpi = Math.pow(1 - Math.exp(-k * ni / m), k);
        const height = Math.min(fpi * 100, 100);
        const isCurrentN = Math.abs(ni - n) < maxN / bars;
        const color = isCurrentN ? 'var(--accent-primary)' : 
                     fpi > 0.1 ? 'var(--accent-danger)' : 
                     fpi > 0.05 ? 'var(--accent-tertiary)' : 'var(--accent-success)';
        html += `<div style="flex: 1; background: ${color}; height: ${height}%; min-height: 2px; border-radius: 2px 2px 0 0; opacity: ${isCurrentN ? 1 : 0.6};"></div>`;
    }
    
    chart.innerHTML = html;
    
    const chartMaxEl = document.getElementById('chartMaxN');
    if (chartMaxEl) chartMaxEl.textContent = maxN.toLocaleString();
    
    const chartCurrentEl = document.getElementById('chartCurrentN');
    if (chartCurrentEl) chartCurrentEl.textContent = n;
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
    initBloomMathCalc();
    
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
window.addRandomElementsCustom = addRandomElementsCustom;
window.updateHLLConfig = updateHLLConfig;
window.updateSLLPercent = updateSLLPercent;
window.toggleSmallCorrection = toggleSmallCorrection;
window.toggleLargeCorrection = toggleLargeCorrection;
window.resetHLL = resetHLL;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.goToSlide = goToSlide;
window.updateBloomMathCalc = updateBloomMathCalc;

