// ============================================
// SLIDES CONFIGURATION
// Ordinea slide-urilor e definită DOAR aici
// Pentru a reordona: mută elementele în array
// Pentru a adăuga: creează HTML și adaugă aici
// ============================================

const SLIDES_CONFIG = [
    // ========== COVER ==========
    {
        file: 'cover.html',
        classes: ['cover'],
        title: 'Structuri de Date Probabilistice'
    },

    // ========== INTRODUCERE: Problema și context ==========
    {
        file: 'problema.html',
        classes: ['transition-section'],
        title: 'O provocare de securitate'
    },
    {
        file: 'hashset.html',
        classes: ['transition-section'],
        title: 'Ideea: Folosim un HashSet!'
    },
    {
        file: 'murmur-hash.html',
        classes: ['transition-section'],
        title: 'MurmurHash — Hash-ul din spatele Hash Tables'
    },
    {
        file: 'memorie.html',
        classes: ['transition-section'],
        title: 'Cât RAM consumă un HashSet?'
    },
    {
        file: 'tradeoff.html',
        classes: ['transition-section'],
        title: 'Ce am sacrifica pentru eficiență?'
    },
    {
        file: 'analogie.html',
        classes: ['transition-section'],
        title: 'Unde acceptăm aproximări în viața reală?'
    },
    {
        file: 'ce-sunt.html',
        classes: [],
        title: 'Ce sunt Structurile de Date Probabilistice?'
    },
    {
        file: 'comparatie.html',
        classes: [],
        title: 'Comparație: Deterministic vs Probabilistic'
    },

    // ========== BLOOM FILTERS ==========
    {
        file: 'bloom-intro.html',
        classes: ['bloom-section'],
        title: 'Ce este un Bloom Filter?'
    },
    {
        file: 'bloom-functionare.html',
        classes: ['bloom-section'],
        title: 'Cum funcționează?'
    },
    {
        file: 'bloom-demo.html',
        classes: ['bloom-section'],
        title: 'Demo Interactiv Bloom Filter'
    },
    {
        file: 'bloom-math.html',
        classes: ['bloom-section'],
        title: 'Analiza Matematică'
    },
    {
        file: 'bloom-practica.html',
        classes: ['bloom-section'],
        title: 'În Practică: Funcțiile Hash'
    },
    {
        file: 'bloom-scalare.html',
        classes: ['bloom-section'],
        title: 'Ce facem când se umple?'
    },
    {
        file: 'bloom-aplicatii.html',
        classes: ['bloom-section'],
        title: 'Aplicații în Lumea Reală'
    },

    // ========== TRANZIȚIE: De ce avem nevoie de HLL ==========
    {
        file: 'hll-problema.html',
        classes: ['transition-section', 'hll-transition'],
        title: 'O nouă provocare: Câți utilizatori unici?'
    },
    {
        file: 'hll-hashset-fail.html',
        classes: ['transition-section', 'hll-transition'],
        title: 'HashSet pentru utilizatori unici?'
    },
    {
        file: 'hll-bloom-fail.html',
        classes: ['transition-section', 'hll-transition'],
        title: 'Putem folosi Bloom Filter?'
    },
    {
        file: 'hll-bloom-counter.html',
        classes: ['transition-section', 'hll-transition'],
        title: 'Bloom Filter + Contor'
    },

    // ========== INTRODUCERE HYPERLOGLOG ==========
    {
        file: 'hll-solutia-intro.html',
        classes: ['hll-section'],
        title: 'HyperLogLog: Numărare la scară de miliarde'
    },

    // ========== LOGLOG: Fundamente ==========
    {
        file: 'loglog-intuitie.html',
        classes: ['hll-section'],
        title: 'Ideea de bază: Zerouri în hash-uri'
    },
    {
        file: 'loglog-simplu.html',
        classes: ['hll-section'],
        title: 'Algoritmul simplu (un registru)'
    },
    {
        file: 'loglog-problema.html',
        classes: ['hll-section'],
        title: 'Problema: Varianță mare'
    },
    {
        file: 'loglog-registre.html',
        classes: ['hll-section'],
        title: 'LogLog: Mai multe registre'
    },

    // ========== SUPERLOGLOG ==========
    {
        file: 'superloglog.html',
        classes: ['hll-section'],
        title: 'SuperLogLog: Eliminăm outlier-ii'
    },

    // ========== HYPERLOGLOG ==========
    {
        file: 'hyperloglog-intro.html',
        classes: ['hll-section'],
        title: 'HyperLogLog: Media Armonică'
    },
    {
        file: 'hyperloglog-corectii.html',
        classes: ['hll-section'],
        title: 'Corecții pentru cazuri extreme'
    },
    {
        file: 'hll-demo.html',
        classes: ['hll-section'],
        title: 'Demo Interactiv HyperLogLog'
    },
    {
        file: 'hll-aplicatii.html',
        classes: ['hll-section'],
        title: 'Aplicații HyperLogLog'
    },

    // ========== CONCLUZII ==========
    {
        file: 'concluzii-comparatie.html',
        classes: ['conclusion-section'],
        title: 'Concluzii'
    }
];
