// ============================================
// STRUCTURI DE DATE PROBABILISTICE
// Interactive JavaScript
// ============================================

// Global state
let pyodide = null;
let pyodideReady = false;
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
// Pyodide Setup
// ============================================

async function loadPyodide() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    try {
        statusText.textContent = 'Se încarcă Python...';
        pyodide = await loadPyodide();
        
        statusDot.classList.remove('loading');
        statusDot.classList.add('ready');
        statusText.textContent = 'Python gata!';
        pyodideReady = true;
        
        console.log('Pyodide loaded successfully');
    } catch (error) {
        console.error('Error loading Pyodide:', error);
        statusDot.classList.remove('loading');
        statusDot.style.background = 'var(--accent-danger)';
        statusText.textContent = 'Eroare la încărcare';
    }
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
// Navigation
// ============================================

function setupNavigation() {
    const nav = document.getElementById('mainNav');
    const cover = document.getElementById('cover');
    
    if (!nav || !cover) return;
    
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    nav.classList.remove('visible');
                } else {
                    nav.classList.add('visible');
                }
            });
        },
        { threshold: 0.1 }
    );
    
    observer.observe(cover);
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
    
    // Animate the bits
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
            // Remove highlight after animation
            setTimeout(() => div.classList.remove('highlight'), 1000);
        }
        
        container.appendChild(div);
    });
    
    // Update hash indicators
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
    // Simple 32-bit hash
    let hash = 0;
    const str = String(item);
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0; // Convert to unsigned
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
    const m = hllState.registers.length;
    
    // First p bits = register index
    const index = hash >>> (32 - p);
    
    // Remaining bits for leading zeros count
    const remaining = hash & ((1 << (32 - p)) - 1);
    const leadingZeros = countLeadingZeros(remaining, 32 - p) + 1;
    
    // Update register with max
    hllState.registers[index] = Math.max(hllState.registers[index], leadingZeros);
}

function hllEstimate() {
    const m = hllState.registers.length;
    
    // Alpha constant
    let alpha;
    if (m === 16) alpha = 0.673;
    else if (m === 32) alpha = 0.697;
    else if (m === 64) alpha = 0.709;
    else alpha = 0.7213 / (1 + 1.079 / m);
    
    // Harmonic mean
    let Z = 0;
    for (let i = 0; i < m; i++) {
        Z += Math.pow(2, -hllState.registers[i]);
    }
    
    let E = alpha * m * m / Z;
    
    // Small range correction
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
        // Generate random element with some duplicates
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
    // Update stats
    document.getElementById('hllTotalAdded').textContent = hllState.totalAdded.toLocaleString();
    document.getElementById('hllActualUnique').textContent = hllState.uniqueSet.size.toLocaleString();
    
    const estimate = hllEstimate();
    document.getElementById('hllEstimate').textContent = estimate.toLocaleString();
    
    const actual = hllState.uniqueSet.size;
    const error = actual === 0 ? 0 : Math.abs(estimate - actual) / actual * 100;
    document.getElementById('hllError').textContent = error.toFixed(2) + '%';
    
    // Update registers visualization
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
        
        // Color based on value
        if (value > 0) {
            const intensity = Math.min(value / 10, 1);
            div.style.background = `rgba(6, 182, 212, ${0.1 + intensity * 0.3})`;
        }
        
        container.appendChild(div);
    });
}

// ============================================
// Smooth Scroll for Anchor Links
// ============================================

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ============================================
// Code Syntax Highlighting (Simple)
// ============================================

function highlightCode() {
    document.querySelectorAll('.code-block code').forEach(block => {
        let html = block.innerHTML;
        
        // Keywords
        const keywords = ['def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'in', 'import', 'from', 'as', 'True', 'False', 'None', 'and', 'or', 'not', 'self', 'print', 'range', 'len', 'int', 'str', 'list', 'dict', 'set', 'sum', 'all', 'any', 'abs', 'round', 'max', 'min'];
        
        keywords.forEach(kw => {
            const regex = new RegExp(`\\b(${kw})\\b`, 'g');
            html = html.replace(regex, `<span style="color: var(--accent-secondary);">$1</span>`);
        });
        
        // Strings
        html = html.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span style="color: var(--accent-success);">$&</span>');
        
        // Comments
        html = html.replace(/(#.*)$/gm, '<span style="color: var(--text-muted);">$1</span>');
        
        // Numbers
        html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color: var(--accent-tertiary);">$1</span>');
        
        // Functions
        html = html.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span style="color: var(--accent-primary);">$1</span>(');
        
        block.innerHTML = html;
    });
}

// ============================================
// Animation on Scroll
// ============================================

function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.section, .theory-block, .interactive-demo, .code-block, .app-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Add animation class
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
});

// ============================================
// Keyboard Shortcuts
// ============================================

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Enter in bloom input
        if (e.target.id === 'bloomInput') {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    checkBloom();
                } else {
                    addToBloom();
                }
            }
        }
    });
}

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load Pyodide
    loadPyodide();
    
    // Setup navigation
    setupNavigation();
    
    // Initialize interactive demos
    initBloomFilter();
    initHLL();
    
    // Setup smooth scroll
    setupSmoothScroll();
    
    // Highlight code
    highlightCode();
    
    // Setup scroll animations
    setupScrollAnimations();
    
    // Setup keyboard shortcuts
    setupKeyboardShortcuts();
    
    console.log('Structuri de Date Probabilistice - Loaded');
});

// Make functions globally available
window.runPythonCode = runPythonCode;
window.addToBloom = addToBloom;
window.checkBloom = checkBloom;
window.resetBloom = resetBloom;
window.addRandomElements = addRandomElements;
window.resetHLL = resetHLL;

