/**
 * Build Standalone Presentation
 * 
 * This script bundles the entire presentation into a single HTML file
 * and copies everything needed into a "presentation" folder.
 * Works 100% offline - no internet required to view.
 * 
 * Usage: node build-standalone.js
 * Output: presentation/index.html (can be opened directly without a server)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const OUTPUT_DIR = path.join(ROOT, 'presentation');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'index.html');

// CSS files to inline (in order)
const CSS_FILES = [
    'styles/variables.css',
    'styles/base.css',
    'styles/layout.css',
    'styles/cover.css',
    'styles/components.css',
    'styles/bloom.css',
    'styles/hyperloglog.css',
    'styles/transitions.css',
    'styles/responsive.css'
];

// External resources to download and inline
const EXTERNAL_RESOURCES = {
    prismCSS: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css',
    prismJS: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js'
};

// Read file helper
function readFile(filePath) {
    const fullPath = path.join(ROOT, filePath);
    try {
        return fs.readFileSync(fullPath, 'utf8');
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e.message);
        return '';
    }
}

// Download a URL and return its content
function downloadFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                downloadFile(response.headers.location).then(resolve).catch(reject);
                return;
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => resolve(data));
            response.on('error', reject);
        }).on('error', reject);
    });
}

// Download all external resources
async function downloadExternalResources() {
    const resources = {};
    
    console.log('Downloading external resources...');
    
    for (const [name, url] of Object.entries(EXTERNAL_RESOURCES)) {
        try {
            resources[name] = await downloadFile(url);
            console.log(`  ✓ Downloaded ${name}`);
        } catch (e) {
            console.warn(`  ⚠ Failed to download ${name}: ${e.message}`);
            resources[name] = '';
        }
    }
    
    return resources;
}

// Load slides config
function loadSlidesConfig() {
    const configContent = readFile('slides.config.js');
    // Extract the SLIDES_CONFIG array
    const match = configContent.match(/const SLIDES_CONFIG = (\[[\s\S]*?\]);/);
    if (match) {
        try {
            // Use eval to parse the config (safe here since we control the file)
            return eval(match[1]);
        } catch (e) {
            console.error('Error parsing slides config:', e.message);
        }
    }
    return [];
}

// Load all slide HTML fragments
function loadSlideFragments(slidesConfig) {
    const fragments = [];
    
    slidesConfig.forEach((slide, index) => {
        const content = readFile(`slides/${slide.file}`);
        const classes = ['slide', ...(slide.classes || [])].join(' ');
        
        fragments.push(`
    <!-- Slide ${index + 1}: ${slide.title} -->
    <div class="${classes}" data-slide="${index}" data-title="${slide.title}" data-file="${slide.file}">
        ${content}
    </div>`);
    });
    
    return fragments.join('\n');
}

// Inline all CSS with offline font fallbacks
function inlineCSS(externalResources) {
    let css = '';
    
    // Add Prism CSS first
    if (externalResources.prismCSS) {
        css += '/* === Prism.js Theme (inlined) === */\n';
        css += externalResources.prismCSS;
        css += '\n\n';
    }
    
    // Add offline font fallbacks
    css += `/* === Offline Font Fallbacks === */
/* When offline, use system fonts that look similar */
@font-face {
    font-family: 'Space Grotesk';
    font-style: normal;
    font-weight: 300 700;
    src: local('Segoe UI'), local('Roboto'), local('Helvetica Neue'), local('Arial');
}
@font-face {
    font-family: 'JetBrains Mono';
    font-style: normal;
    font-weight: 400 700;
    src: local('Cascadia Code'), local('Fira Code'), local('Consolas'), local('Monaco'), local('monospace');
}

`;
    
    // Add our CSS files
    CSS_FILES.forEach(file => {
        css += `/* === ${file} === */\n`;
        css += readFile(file);
        css += '\n\n';
    });
    
    return css;
}

// Modify script.js to work without fetch
function modifyScript() {
    let script = readFile('script.js');
    
    // Remove the loadSlides function and replace with a simpler version
    // that just initializes from already-loaded slides
    const loadSlidesReplacement = `
async function loadSlides() {
    const container = document.getElementById('slidesContainer');
    const loadingEl = document.getElementById('slidesLoading');
    
    if (!container) {
        console.error('Slides container not found');
        return false;
    }
    
    // Slides are already embedded in HTML, just initialize
    slides = container.querySelectorAll('.slide');
    totalSlides = slides.length;
    
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
    
    console.log(\`Loaded \${totalSlides} slides (standalone mode)\`);
    return true;
}`;

    // Replace the loadSlides function
    script = script.replace(
        /async function loadSlides\(\) \{[\s\S]*?^}/m,
        loadSlidesReplacement
    );
    
    return script;
}

// Ensure output directory exists
function ensureOutputDir() {
    if (fs.existsSync(OUTPUT_DIR)) {
        // Clean existing directory
        fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Build the standalone HTML
async function build() {
    console.log('Building standalone presentation...\n');
    
    // Download external resources first
    const externalResources = await downloadExternalResources();
    
    // Create output directory
    ensureOutputDir();
    console.log(`✓ Created ${path.basename(OUTPUT_DIR)}/ directory`);
    
    // Load index.html as template
    let html = readFile('index.html');
    
    // Load slides config
    const slidesConfig = loadSlidesConfig();
    console.log(`Found ${slidesConfig.length} slides`);
    
    // 1. Remove Google Fonts link (we use local fallbacks)
    html = html.replace(
        /<link[^>]*fonts\.googleapis\.com[^>]*>/g,
        '<!-- Google Fonts removed for offline use -->'
    );
    console.log('✓ Configured offline fonts');
    
    // 2. Remove external Prism CSS link
    html = html.replace(
        /<link[^>]*prism-tomorrow\.min\.css[^>]*>/g,
        '<!-- Prism CSS inlined below -->'
    );
    
    // 3. Remove external CSS links and inline all CSS (including Prism)
    const cssContent = inlineCSS(externalResources);
    html = html.replace(
        /<!-- Modular CSS -->[\s\S]*?<\/head>/,
        `<!-- All CSS Inlined for Offline Use -->
    <style>
${cssContent}
    </style>
</head>`
    );
    console.log('✓ Inlined CSS (including Prism theme)');
    
    // 4. Remove external Prism JS and inline it
    html = html.replace(
        /<script[^>]*prism\.min\.js[^>]*><\/script>/g,
        ''
    );
    
    // 5. Remove slides.config.js and script.js external references
    // and inline them along with Prism
    const scriptContent = modifyScript();
    
    html = html.replace(
        /<script src="slides\.config\.js"><\/script>\s*<script src="script\.js"><\/script>/,
        `<script>
// Prism.js (inlined for offline use)
${externalResources.prismJS || '// Prism.js download failed'}
    </script>
    <script>
// Slides config (inlined)
const SLIDES_CONFIG = ${JSON.stringify(slidesConfig, null, 2)};

// Main script (inlined)
${scriptContent}
    </script>`
    );
    console.log('✓ Inlined JavaScript (including Prism.js)');
    
    // 6. Replace the slides container with pre-loaded slides
    const slideFragments = loadSlideFragments(slidesConfig);
    html = html.replace(
        /<!-- Slides Container - populated dynamically -->[\s\S]*?<div class="slides-loading"[\s\S]*?<\/div>\s*<\/div>/,
        `<!-- Slides Container - pre-populated for standalone -->
    <div class="slides-container" id="slidesContainer">
${slideFragments}
    </div>`
    );
    console.log('✓ Embedded slide fragments');
    
    // 7. Add standalone marker
    html = html.replace(
        '<html lang="ro"',
        '<html lang="ro" data-standalone="true"'
    );
    
    // Write output
    fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
    
    const stats = fs.statSync(OUTPUT_FILE);
    const sizeKB = (stats.size / 1024).toFixed(1);
    
    console.log(`\n✅ Build complete!`);
    console.log(`   Output folder: presentation/`);
    console.log(`   Main file: presentation/index.html`);
    console.log(`   Size: ${sizeKB} KB`);
    console.log(`   Offline: ✓ Yes (no internet required)`);
    console.log(`\nYou can now:`);
    console.log(`   1. Open presentation/index.html directly in a browser`);
    console.log(`   2. Copy the "presentation" folder to any device`);
    console.log(`   3. Works completely offline!`);
}

// Run
build().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
