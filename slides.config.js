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
        file: 'bloom-python.html',
        classes: ['bloom-section'],
        title: 'Implementare Python Bloom Filter'
    },
    {
        file: 'bloom-math.html',
        classes: ['bloom-section'],
        title: 'Analiza Matematică'
    },
    {
        file: 'bloom-calcule.html',
        classes: ['bloom-section'],
        title: 'Calcule Practice'
    },
    {
        file: 'bloom-aplicatii.html',
        classes: ['bloom-section'],
        title: 'Aplicații în Lumea Reală'
    },

    // ========== TRANZIȚIE SPRE HYPERLOGLOG ==========
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

    // ========== HYPERLOGLOG ==========
    {
        file: 'hll-intro.html',
        classes: ['hll-section'],
        title: 'Ce este HyperLogLog?'
    },
    {
        file: 'hll-intuitie.html',
        classes: ['hll-section'],
        title: 'Intuiția: Experimentul cu moneda'
    },
    {
        file: 'hll-algoritm.html',
        classes: ['hll-section'],
        title: 'Cum funcționează algoritmul?'
    },
    {
        file: 'hll-demo.html',
        classes: ['hll-section'],
        title: 'Demo Interactiv HyperLogLog'
    },
    {
        file: 'hll-python.html',
        classes: ['hll-section'],
        title: 'Implementare Python HyperLogLog'
    },
    {
        file: 'hll-math.html',
        classes: ['hll-section'],
        title: 'Formule și Trade-off-uri'
    },
    {
        file: 'hll-tradeoff.html',
        classes: ['hll-section'],
        title: 'Precizie vs Memorie'
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
        title: 'Tabel Comparativ Final'
    },
    {
        file: 'concluzii-cand.html',
        classes: ['conclusion-section'],
        title: 'Când să le folosești?'
    },
    {
        file: 'final.html',
        classes: ['final-slide'],
        title: 'Întrebări?'
    }
];
