// Stripe Config - Publishable key (safe for public repos)

export const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SicWpAbfnWorjnyMtW553chKp85slEzScGIAN8uD7dUHBMjWhVtjV4PVkGihgZiIoWIG14CYaiLgCXtvtsnlxgq00CiygjUNf';

// ===========================================
// Global-First, Credit-Based Business Model
// ===========================================
// Core Idea: "Subscriptions give access. Credits control AI cost."
// 
// CREDIT SYSTEM:
// - 1 Credit = $0.03 AI cost budget
// - 1 Credit ≈ 75,000 tokens = HOURS of continuous learning
// - Chat uses credits, but VERY efficiently (students learn for hours with few credits)
// 
// TRULY FREE (0 Credits):
// - 🔊 Voice (Edge TTS) - Always FREE
// - 🎭 3D Avatar (Three.js client-side) - Always FREE
// 
// CREDIT-CHARGED:
// - 💬 Chat Mode (Gemini Flash) - Ultra-efficient, 1 credit = hours
// - 🖼️ AI Images - 1.3 credits each
// - 🔍 Deep Research - 40 credits each

// Currency detection helper
export function getUserCurrency(countryCode = null) {
    if (!countryCode) return 'USD';

    // Normalize to lowercase for comparison
    const country = countryCode.toLowerCase().trim();

    // Bangladesh detection (multiple formats)
    if (country === 'bd' ||
        country === 'bangladesh' ||
        country === 'বাংলাদেশ' ||
        country.includes('bangladesh')) {
        return 'BDT';
    }
    return 'USD'; // Default for international
}

// ===========================================
// Subscription Plans (Same Credits Globally)
// Global = Primary Revenue (70-80% margin)
// Bangladesh = Mission Pricing (positive margin)
// ===========================================

export const SUBSCRIPTION_PLANS = {
    free: {
        id: 'free',
        name: 'Free Plan',
        price: {
            BDT: 0,
            USD: 0
        },
        priceId: null, // No Stripe price for free
        interval: 'day',
        features: [
            '1 credit daily (= hours of learning)',
            'Voice (Edge TTS) - Always FREE',
            '3D Avatar Teacher - Always FREE',
            'All 6 Learning Modes',
            '118+ Languages',
            'Ads between sessions'
        ],
        limits: {
            dailyMinutes: -1, // Unlimited learning time
            dailyConversations: 0, // 0 = controlled by credits (not unlimited)
            dailyQuizzes: 0,       // 0 = controlled by credits
            dailyFileUploads: 1,
            maxFileSize: 5, // MB
            voiceMinutes: -1 // Unlimited (Edge TTS FREE)
        },
        credits: {
            daily: 1, // 1 credit per day = hours of learning
            monthly: 0, // Daily reset, not monthly
            bonus: 0
        },
        popular: false
    },
    starter: {
        id: 'starter',
        name: 'Starter Plan',
        price: {
            BDT: 299,
            USD: 9.99
        },
        priceId: {
            BDT: 'price_starter_bdt_monthly',
            USD: 'price_starter_usd_monthly'
        },
        interval: 'month',
        features: [
            '60 credits per month (= many hours of learning)',
            'Voice (Edge TTS) - Always FREE',
            '3D Avatar Teacher - Always FREE',
            'All 6 Learning Modes',
            '118+ Languages',
            'No ads',
            'Progress analytics',
            'AI Image: 1.3 credits each',
            '🔍 Deep Research: 15-40 credits'
        ],
        limits: {
            dailyMinutes: -1, // Unlimited
            dailyConversations: 0, // Controlled by monthly credits
            dailyQuizzes: 0,       // Controlled by monthly credits
            dailyFileUploads: 10,
            maxFileSize: 25, // MB
            voiceMinutes: -1 // Unlimited (Edge TTS FREE)
        },
        credits: {
            daily: 0,      // No daily reset for paid plans
            monthly: 60,   // 60 credits per month
            bonus: 0
        },
        popular: false
    },
    pro: {
        id: 'pro',
        name: 'Pro Plan',
        price: {
            BDT: 999,
            USD: 19.99
        },
        priceId: {
            BDT: 'price_pro_bdt_monthly',
            USD: 'price_pro_usd_monthly'
        },
        interval: 'month',
        features: [
            '200 credits per month (= extensive learning)',
            'Voice (Edge TTS) - Always FREE',
            '3D Avatar Teacher - Always FREE',
            'All 6 Learning Modes',
            '118+ Languages',
            'No ads',
            'Priority support',
            'Detailed analytics & reports',
            'AI Image: 1.3 credits each',
            '🔍 Deep Research: 15-40 credits',
            'Early access to features'
        ],
        limits: {
            dailyMinutes: -1, // Unlimited
            dailyConversations: 0, // Controlled by monthly credits
            dailyQuizzes: 0,       // Controlled by monthly credits
            dailyFileUploads: -1, // Unlimited
            maxFileSize: 100, // MB
            voiceMinutes: -1 // Unlimited (Edge TTS FREE)
        },
        credits: {
            daily: 0,      // No daily reset for paid plans
            monthly: 200,  // 200 credits per month
            bonus: 0
        },
        popular: true
    }
};

// ===========================================
// Credit Costs for Different Actions
// 1 Credit = $0.03 AI cost = ~75,000 tokens = HOURS of learning
// ===========================================
export const CREDIT_COSTS = {
    // TRULY FREE (0 Credits - No AI cost)
    voiceMinute: 0,         // FREE - Edge TTS (118+ languages, $0 cost)
    avatar3D: 0,            // FREE - Client-side Three.js (no server)
    curriculumAccess: 0,    // FREE - Static data

    // ULTRA-EFFICIENT (Uses credits, but 1 credit = hours)
    aiConversation: 0.013,  // ~0.013 credits/message = 1 credit supports ~75 messages
    quizAttempt: 0.02,      // ~0.02 credits per quiz (AI-generated)
    fileUpload: 0.05,       // ~0.05 credits for file analysis

    // CREDIT-CHARGED (High-Cost AI Actions)
    imageGeneration: 1.3,   // 1.3 credits per image (Gemini Image API)
    researchQuery: 15,      // 15-40 credits per deep research task (varies by complexity)

    // Note: With 1 daily credit, free users can:
    // - Chat for HOURS (1 credit ≈ 75,000 tokens)
    // - Voice is always free (Edge TTS)
    // - Avatar is always free (client-side)
    progressReport: 0       // FREE - Basic analytics included
};

// ===========================================
// Extra Credit Packages (Pay-As-You-Go)
// Power users buy more credits - no usage blocking
// Bangladesh receives regional discounted price
// Credit quantity stays identical
// ===========================================
export const CREDIT_PACKAGES = {
    small: {
        id: 'credits_small',
        name: '55 Credits (50 + 5 Bonus)',
        credits: 50,
        bonus: 5, // 10% bonus
        totalCredits: 55,
        price: {
            BDT: 149,
            USD: 2.99
        },
        priceId: {
            BDT: 'price_credits_small_bdt',
            USD: 'price_credits_small_usd'
        }
    },
    medium: {
        id: 'credits_medium',
        name: '175 Credits (150 + 25 Bonus)',
        credits: 150,
        bonus: 25, // ~17% bonus
        totalCredits: 175,
        price: {
            BDT: 399,
            USD: 7.99
        },
        priceId: {
            BDT: 'price_credits_medium_bdt',
            USD: 'price_credits_medium_usd'
        }
    },
    large: {
        id: 'credits_large',
        name: '480 Credits (400 + 80 Bonus)',
        credits: 400,
        bonus: 80, // 20% bonus
        totalCredits: 480,
        price: {
            BDT: 999,
            USD: 19.99
        },
        priceId: {
            BDT: 'price_credits_large_bdt',
            USD: 'price_credits_large_usd'
        }
    }
};

// ===========================================
// Business Model Summary
// ===========================================
// Global Revenue First • Credit-Based AI • 70–80% Gross Margin
//
// Market Focus:
// - Primary Revenue: Global (USA, EU, Middle East) → 70-80% margin
// - Secondary Impact: Bangladesh → same credits, lower price
//
// Why Always Profitable:
// - Learning time ≠ AI cost (unlimited time, metered compute)
// - Voice is FREE (Edge TTS)
// - 3D Avatar runs client-side (Three.js)
// - Images & research are credit-metered
// - Max cost per user = Credits × $0.03
// - Extra usage = extra revenue
//
// Revenue Projections (2027): $8M - $12M ARR, 70-80% margin

console.log("✅ Stripe configuration loaded - Global-First Credit-Based Model");
