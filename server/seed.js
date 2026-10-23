const db = require('./db');

const isCleanOnly = process.argv.includes('--clean');

function clearDatabase() {
  console.log('🧹 Clearing all existing database tables...');
  db.exec(`
    DELETE FROM reviews;
    DELETE FROM votes;
    DELETE FROM launches;
    DELETE FROM stories;
    DELETE FROM submissions;
    DELETE FROM newsletter_subscribers;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM sqlite_sequence WHERE name IN ('products', 'launches', 'stories', 'reviews', 'votes', 'submissions');
  `);
  console.log('✅ Database cleared.');
}

if (isCleanOnly) {
  clearDatabase();
  process.exit(0);
}

clearDatabase();

console.log('🌱 Seeding fresh curated data...');

// 1. Categories
const categories = [
  { id: 'devtools', name: 'Developer Tools', icon: '⚡', color: '#3B82F6', description: 'Infrastructure, edge clouds, APIs, and CLI workflows built for African engineers.' },
  { id: 'ai', name: 'AI & Machine Learning', icon: '🤖', color: '#BE185D', description: 'African voice synthesis, vernacular LLMs, and computer vision models.' },
  { id: 'fintech', name: 'Fintech & Banking', icon: '💳', color: '#10B981', description: 'Payment rails, neo-banks, currency swaps, and savings protocols.' },
  { id: 'cleanenergy', name: 'Clean Energy & Climate', icon: '☀️', color: '#F59E0B', description: 'Off-grid solar micro-grids, battery swaps, and carbon tracking systems.' },
  { id: 'logistics', name: 'Logistics & Delivery', icon: '📦', color: '#EC4899', description: 'Sub-30 minute food, grocery, and cross-border freight routing.' },
  { id: 'healthtech', name: 'HealthTech & Biotech', icon: '🩺', color: '#06B6D4', description: 'Telemedicine, drug authentication, and diagnostics distribution.' },
  { id: 'agritech', name: 'Agritech & Food', icon: '🌾', color: '#84CC16', description: 'Precision irrigation, crop yield insurance, and farmer marketplaces.' },
  { id: 'edtech', name: 'EdTech & Upskilling', icon: '🎓', color: '#8B5CF6', description: 'Software engineering, design, and product talent development.' },
  { id: 'web3', name: 'Web3 & Crypto', icon: '⛓️', color: '#6366F1', description: 'Stablecoin remittances, non-custodial wallets, and on-chain identity.' },
  { id: 'ecommerce', name: 'E-Commerce & Retail', icon: '🛍️', color: '#F97316', description: 'Social commerce, inventory management, and B2B wholesale.' },
  { id: 'media', name: 'Media & Entertainment', icon: '🎬', color: '#D946EF', description: 'Music distribution, African gaming studios, and creator monetization.' },
  { id: 'saas', name: 'Enterprise SaaS', icon: '💼', color: '#14B8A6', description: 'Payroll, HR, tax compliance, and automated business operations.' }
];

const insertCategory = db.prepare(`
  INSERT INTO categories (id, name, icon, color, description)
  VALUES (?, ?, ?, ?, ?)
`);

for (const c of categories) {
  insertCategory.run(c.id, c.name, c.icon, c.color, c.description);
}

// 2. Products
const products = [
  {
    slug: 'pxxl',
    name: 'Pxxl',
    tagline: 'High-performance edge image CDN & compression proxy for African bandwidth',
    description: 'Pxxl automatically compresses, resizes, and converts dynamic web imagery to modern AVIF and WebP formats on local African Internet Exchange Points (IXPs), reducing page payloads by up to 82% and delivering sub-30ms load times on slow mobile connections.',
    category_id: 'devtools',
    city: 'Lagos',
    country: 'Nigeria',
    logo_url: 'images/card_pxxl.png',
    banner_class: 'banner-pxxl',
    website_url: 'https://pxxl.app',
    github_url: 'https://github.com/pxxl-app/pxxl',
    twitter_url: 'https://x.com/pxxlapp',
    votes_count: 142,
    is_featured: 1,
    is_trending: 1,
    maker_name: 'Robinson Honour',
    maker_avatar: 'images/founder_robinson.jpg',
    maker_role: 'Founder & Systems Architect',
    pricing_type: 'Freemium ($0 - $19/mo)'
  },
  {
    slug: 'yarngpt',
    name: 'YarnGPT',
    tagline: 'Hyper-realistic text-to-speech models fine-tuned on native African accents',
    description: 'YarnGPT provides studio-grade voice AI trained on thousands of native Nigerian, Kenyan, Ghanaian, and South African speech variations in Yoruba, Igbo, Hausa, Swahili, and Pidgin English.',
    category_id: 'ai',
    city: 'Nairobi',
    country: 'Kenya',
    logo_url: 'images/card_yarngpt.png',
    banner_class: 'banner-yarngpt',
    website_url: 'https://yarngpt.ai',
    github_url: 'https://github.com/yarngpt',
    twitter_url: 'https://x.com/yarngpt',
    votes_count: 128,
    is_featured: 1,
    is_trending: 1,
    maker_name: 'Sulaiman Adewale',
    maker_avatar: 'images/founder_yarngpt.jpg',
    maker_role: 'Lead AI Engineer',
    pricing_type: 'Usage Based ($0.002 / 1k chars)'
  },
  {
    slug: 'powbeam',
    name: 'Powbeam',
    tagline: 'Intelligent solar micro-inverter monitoring and energy telemetry',
    description: 'Hardware and firmware analytics for residential and commercial solar installations across Sub-Saharan Africa, predicting battery lifespan and automating grid fallbacks.',
    category_id: 'cleanenergy',
    city: 'Kigali',
    country: 'Rwanda',
    logo_url: 'images/card_powbeam.png',
    banner_class: 'banner-powbeam',
    website_url: 'https://powbeam.energy',
    github_url: '',
    twitter_url: 'https://x.com/powbeam',
    votes_count: 115,
    is_featured: 1,
    is_trending: 1,
    maker_name: 'David Herbert',
    maker_avatar: 'images/founder_david.jpg',
    maker_role: 'Hardware Engineer & Co-Founder',
    pricing_type: 'Hardware + $5/mo Cloud'
  },
  {
    slug: 'byteship',
    name: 'Byteship',
    tagline: 'Lightweight S3-compatible asset store with automatic offline sync',
    description: 'Built by Akinkunmi to solve upload failures on unstable Lagos mobile data connections with resumable chunking and automatic background synchronization.',
    category_id: 'devtools',
    city: 'Lagos',
    country: 'Nigeria',
    logo_url: 'images/card_byteship.png',
    banner_class: 'banner-byteship',
    website_url: 'https://byteship.dev',
    github_url: 'https://github.com/byteship/core',
    twitter_url: 'https://x.com/byteshipdev',
    votes_count: 98,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'Akinkunmi',
    maker_avatar: 'images/story_akinkunmi.jpg',
    maker_role: 'Solo Founder',
    pricing_type: '100% Free & Open Source'
  },
  {
    slug: 'brimble',
    name: 'Brimble',
    tagline: 'Fast frontend cloud for African web builders with zero config deployments',
    description: 'Deploy static sites, React, Next.js, and Svelte applications directly to fast edge points across Cairo, Lagos, Johannesburg, and Nairobi with automatic SSL and DDoS mitigation.',
    category_id: 'devtools',
    city: 'Lagos',
    country: 'Nigeria',
    logo_url: '',
    banner_class: 'banner-brimble',
    website_url: 'https://brimble.io',
    github_url: 'https://github.com/brimble',
    twitter_url: 'https://x.com/brimbleio',
    votes_count: 94,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'Robinson Honour',
    maker_avatar: 'images/founder_robinson.jpg',
    maker_role: 'Founder & CEO',
    pricing_type: 'Generous Free Tier + $20/mo Pro'
  },
  {
    slug: 'chowdeck',
    name: 'Chowdeck',
    tagline: 'On-demand food delivery logistics infrastructure powering West Africa',
    description: 'Order food from thousands of restaurants in Lagos, Abuja, and Port Harcourt with hyper-optimized dispatch algorithms and 30-minute average delivery guarantees.',
    category_id: 'logistics',
    city: 'Lagos',
    country: 'Nigeria',
    logo_url: '',
    banner_class: 'banner-chowdeck',
    website_url: 'https://chowdeck.com',
    github_url: '',
    twitter_url: 'https://x.com/chowdeck',
    votes_count: 82,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'Femi Aluko',
    maker_avatar: 'images/founder_chowdeck.jpg',
    maker_role: 'Co-Founder & CEO',
    pricing_type: 'Delivery Fee Based'
  },
  {
    slug: 'piggyvest',
    name: 'PiggyVest',
    tagline: 'Automated micro-savings and disciplined investment platform',
    description: 'Empowering over 4.5 million young Africans to cultivate consistent savings habits, lock funds against inflation, and access verified mutual funds.',
    category_id: 'fintech',
    city: 'Lagos',
    country: 'Nigeria',
    logo_url: '',
    banner_class: 'banner-piggyvest',
    website_url: 'https://piggyvest.com',
    github_url: '',
    twitter_url: 'https://x.com/piggybankng',
    votes_count: 110,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'Odun Eweniyi',
    maker_avatar: 'images/story_odun.jpg',
    maker_role: 'Co-Founder & COO',
    pricing_type: 'Free to Save'
  },
  {
    slug: 'okra',
    name: 'Okra',
    tagline: 'Open finance API infrastructure connecting banks, apps, and users',
    description: 'The real-time financial data exchange facilitating secure auth, balance checks, transaction histories, and instant account-to-account debits across Africa.',
    category_id: 'fintech',
    city: 'Lagos',
    country: 'Nigeria',
    logo_url: '',
    banner_class: 'banner-okra',
    website_url: 'https://okra.ng',
    github_url: '',
    twitter_url: 'https://x.com/okra_ng',
    votes_count: 65,
    is_featured: 0,
    is_trending: 0,
    maker_name: 'Fara Ashiru',
    maker_avatar: 'images/founder_okra.jpg',
    maker_role: 'Founder & CEO',
    pricing_type: 'API Pay-per-Call'
  },
  {
    slug: 'moniepoint',
    name: 'Moniepoint',
    tagline: 'All-in-one financial services and business banking platform for African merchants',
    description: 'Moniepoint provides point-of-sale payment terminals, working capital loans, and digital business banking accounts empowering over 2 million offline and online African businesses.',
    category_id: 'fintech',
    city: 'Lagos',
    country: 'Nigeria',
    logo_url: '',
    banner_class: 'banner-fintech',
    website_url: 'https://moniepoint.com',
    github_url: '',
    twitter_url: 'https://x.com/moniepoint',
    votes_count: 135,
    is_featured: 1,
    is_trending: 1,
    maker_name: 'Tosin Eniolorunda',
    maker_avatar: '',
    maker_role: 'Founder & CEO',
    pricing_type: 'Transaction Fee Based'
  },
  {
    slug: 'flutterwave',
    name: 'Flutterwave',
    tagline: 'Global payment infrastructure connecting African commerce to worldwide markets',
    description: 'Seamless cross-border payment APIs, physical cards, and merchant checkout processing across 30+ African currencies and international rails.',
    category_id: 'fintech',
    city: 'Lagos',
    country: 'Nigeria',
    logo_url: '',
    banner_class: 'banner-fintech',
    website_url: 'https://flutterwave.com',
    github_url: 'https://github.com/flutterwave',
    twitter_url: 'https://x.com/theflutterwave',
    votes_count: 140,
    is_featured: 1,
    is_trending: 1,
    maker_name: 'Olugbenga Agboola',
    maker_avatar: '',
    maker_role: 'Founder & CEO',
    pricing_type: 'Percentage per transaction'
  },
  {
    slug: 'twiga-foods',
    name: 'Twiga Foods',
    tagline: 'B2B e-commerce platform streamlining Africa\'s agricultural supply chain',
    description: 'Twiga connects farmers directly with neighborhood vendors and kiosks across Kenya, reducing food waste and lowering retail prices through optimized logistics.',
    category_id: 'agritech',
    city: 'Nairobi',
    country: 'Kenya',
    logo_url: '',
    banner_class: 'banner-agri',
    website_url: 'https://twiga.com',
    github_url: '',
    twitter_url: 'https://x.com/TwigaFoods',
    votes_count: 88,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'Peter Njonjo',
    maker_avatar: '',
    maker_role: 'Co-Founder',
    pricing_type: 'B2B Wholesale'
  },
  {
    slug: 'wasoko',
    name: 'Wasoko',
    tagline: 'Informal retail supply network delivering goods directly to informal shopkeepers',
    description: 'Revolutionizing informal retail across East Africa with on-demand free delivery of inventory and working capital financing for dukas and mom-and-pop stores.',
    category_id: 'ecommerce',
    city: 'Nairobi',
    country: 'Kenya',
    logo_url: '',
    banner_class: 'banner-ecommerce',
    website_url: 'https://wasoko.com',
    github_url: '',
    twitter_url: 'https://x.com/wasoko',
    votes_count: 76,
    is_featured: 0,
    is_trending: 0,
    maker_name: 'Daniel Yu',
    maker_avatar: '',
    maker_role: 'Founder',
    pricing_type: 'Free Delivery with Wholesale Goods'
  },
  {
    slug: 'marketforce',
    name: 'MarketForce',
    tagline: 'Retail distribution software empowering African merchants and FMCG brands',
    description: 'End-to-end distribution automation platform helping consumer brands manage sales reps, track field inventory, and digitize retail orders.',
    category_id: 'saas',
    city: 'Nairobi',
    country: 'Kenya',
    logo_url: '',
    banner_class: 'banner-saas',
    website_url: 'https://marketforce-am.com',
    github_url: '',
    twitter_url: 'https://x.com/MarketForceAM',
    votes_count: 62,
    is_featured: 0,
    is_trending: 0,
    maker_name: 'Tesh Mbaabu',
    maker_avatar: '',
    maker_role: 'Co-Founder & CEO',
    pricing_type: 'SaaS Subscription'
  },
  {
    slug: 'yoco',
    name: 'Yoco',
    tagline: 'Smart card machines and digital payment tools for small and medium businesses',
    description: 'Yoco provides portable, affordable card readers and payment software tailored for South African entrepreneurs, market vendors, and boutiques.',
    category_id: 'fintech',
    city: 'Cape Town',
    country: 'South Africa',
    logo_url: '',
    banner_class: 'banner-fintech',
    website_url: 'https://yoco.com',
    github_url: '',
    twitter_url: 'https://x.com/Yoco_ZA',
    votes_count: 118,
    is_featured: 1,
    is_trending: 1,
    maker_name: 'Katlego Maphai',
    maker_avatar: '',
    maker_role: 'Co-Founder & CEO',
    pricing_type: 'No monthly fees, 2.6% per swipe'
  },
  {
    slug: 'naked-insurance',
    name: 'Naked Insurance',
    tagline: 'Artificial intelligence-driven insurance platform with instant claims approval',
    description: 'A completely digital car, home, and single-item insurance experience in South Africa with automated underwriting and chatbot claim approvals in under 3 minutes.',
    category_id: 'fintech',
    city: 'Johannesburg',
    country: 'South Africa',
    logo_url: '',
    banner_class: 'banner-fintech',
    website_url: 'https://naked.insure',
    github_url: '',
    twitter_url: 'https://x.com/nakedinsure',
    votes_count: 79,
    is_featured: 0,
    is_trending: 0,
    maker_name: 'Alex Thomson',
    maker_avatar: '',
    maker_role: 'Co-Founder',
    pricing_type: 'Custom monthly premiums'
  },
  {
    slug: 'aerobotics',
    name: 'Aerobotics',
    tagline: 'Drone telemetry and satellite imagery analytics for precision farming',
    description: 'Harnesses high-resolution aerial imaging and machine learning to count individual trees, detect crop diseases early, and optimize irrigation schedules.',
    category_id: 'agritech',
    city: 'Cape Town',
    country: 'South Africa',
    logo_url: '',
    banner_class: 'banner-agri',
    website_url: 'https://aerobotics.com',
    github_url: '',
    twitter_url: 'https://x.com/aerobotics',
    votes_count: 85,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'James Paterson',
    maker_avatar: '',
    maker_role: 'Co-Founder & CEO',
    pricing_type: 'Per-hectare annual SaaS'
  },
  {
    slug: 'peach-payments',
    name: 'Peach Payments',
    tagline: 'Enterprise payment gateway enabling seamless checkout across Sub-Saharan Africa',
    description: 'Robust API orchestration layer for large-scale e-commerce, offering one-click checkout, recurring subscription billing, and multi-currency payouts.',
    category_id: 'fintech',
    city: 'Cape Town',
    country: 'South Africa',
    logo_url: '',
    banner_class: 'banner-fintech',
    website_url: 'https://peachpayments.com',
    github_url: '',
    twitter_url: 'https://x.com/peachpayments',
    votes_count: 72,
    is_featured: 0,
    is_trending: 0,
    maker_name: 'Rahul Jain',
    maker_avatar: '',
    maker_role: 'Co-Founder & CEO',
    pricing_type: 'Interchange++ and Volume Pricing'
  },
  {
    slug: 'hubtel',
    name: 'Hubtel',
    tagline: 'Integrated messaging, retail POS, and quick commerce infrastructure in Ghana',
    description: 'Ghana’s leading messaging and payment aggregator, powering SMS notifications, retail POS solutions, and everyday food and utility bills.',
    category_id: 'fintech',
    city: 'Accra',
    country: 'Ghana',
    logo_url: '',
    banner_class: 'banner-fintech',
    website_url: 'https://hubtel.com',
    github_url: '',
    twitter_url: 'https://x.com/Hubtel',
    votes_count: 92,
    is_featured: 1,
    is_trending: 1,
    maker_name: 'Alex Bram',
    maker_avatar: '',
    maker_role: 'CEO',
    pricing_type: 'Usage Based'
  },
  {
    slug: 'zeepay',
    name: 'Zeepay',
    tagline: 'Mobile money remittance hub facilitating instant cross-border transfers',
    description: 'Connects digital remittance senders globally directly to local mobile wallets across Africa, terminating remittances into MTN, Vodafone, and Airtel wallets.',
    category_id: 'fintech',
    city: 'Accra',
    country: 'Ghana',
    logo_url: '',
    banner_class: 'banner-fintech',
    website_url: 'https://myzeepay.com',
    github_url: '',
    twitter_url: 'https://x.com/myzeepay',
    votes_count: 74,
    is_featured: 0,
    is_trending: 0,
    maker_name: 'Andrew Takyi-Appiah',
    maker_avatar: '',
    maker_role: 'Managing Director',
    pricing_type: 'FX spread & Flat fee'
  },
  {
    slug: 'mpharma',
    name: 'mPharma',
    tagline: 'Data-driven pharmaceutical inventory management and patient healthcare network',
    description: 'Manages drug supply chains for community pharmacies and hospitals, ensuring prescription medications are consistently in stock and affordable for patients.',
    category_id: 'healthtech',
    city: 'Accra',
    country: 'Ghana',
    logo_url: '',
    banner_class: 'banner-health',
    website_url: 'https://mpharma.com',
    github_url: '',
    twitter_url: 'https://x.com/mpharmaglobal',
    votes_count: 83,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'Gregory Rockson',
    maker_avatar: '',
    maker_role: 'Co-Founder & CEO',
    pricing_type: 'Healthcare Vendor Consortium'
  },
  {
    slug: 'paymob',
    name: 'Paymob',
    tagline: 'Omnichannel digital payments enabler powering North African merchants',
    description: 'Payment gateway and soft POS technology processing cards, mobile wallets, and instalment payments for online stores and physical retailers in Egypt and the MENA region.',
    category_id: 'fintech',
    city: 'Cairo',
    country: 'Egypt',
    logo_url: '',
    banner_class: 'banner-fintech',
    website_url: 'https://paymob.com',
    github_url: '',
    twitter_url: 'https://x.com/Paymob',
    votes_count: 105,
    is_featured: 1,
    is_trending: 1,
    maker_name: 'Islam Shawky',
    maker_avatar: '',
    maker_role: 'Co-Founder & CEO',
    pricing_type: '2.5% + 3 EGP per transaction'
  },
  {
    slug: 'swvl',
    name: 'Swvl',
    tagline: 'Tech-enabled mass transit and intercity bus booking platform',
    description: 'Transforming public transportation in high-density African cities with scheduled, air-conditioned bus routes and digital seat reservations.',
    category_id: 'logistics',
    city: 'Cairo',
    country: 'Egypt',
    logo_url: '',
    banner_class: 'banner-logistics',
    website_url: 'https://swvl.com',
    github_url: '',
    twitter_url: 'https://x.com/SwvlEgypt',
    votes_count: 91,
    is_featured: 0,
    is_trending: 0,
    maker_name: 'Mostafa Kandil',
    maker_avatar: '',
    maker_role: 'Co-Founder',
    pricing_type: 'Per-ride ticketing'
  },
  {
    slug: 'instabug',
    name: 'Instabug',
    tagline: 'Real-time mobile app bug reporting, crash diagnostics, and session replay',
    description: 'SDK used by top global and African applications to collect in-app bug reports with screen recordings, network logs, and crash stack traces.',
    category_id: 'devtools',
    city: 'Cairo',
    country: 'Egypt',
    logo_url: '',
    banner_class: 'banner-devtools',
    website_url: 'https://instabug.com',
    github_url: 'https://github.com/instabug',
    twitter_url: 'https://x.com/Instabug',
    votes_count: 112,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'Omar Gabr',
    maker_avatar: '',
    maker_role: 'Co-Founder & CEO',
    pricing_type: 'Freemium ($0 - $149/mo)'
  },
  {
    slug: 'irembo',
    name: 'Irembo',
    tagline: 'E-governance portal delivering automated public administrative services',
    description: 'Pioneering African GovTech platform that digitizes over 100 civil registry, land, passport, and business registration services across Rwanda.',
    category_id: 'saas',
    city: 'Kigali',
    country: 'Rwanda',
    logo_url: '',
    banner_class: 'banner-saas',
    website_url: 'https://irembo.gov.rw',
    github_url: '',
    twitter_url: 'https://x.com/IremboGov',
    votes_count: 87,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'Faith Keza',
    maker_avatar: '',
    maker_role: 'CEO',
    pricing_type: 'Standard administrative fees'
  },
  {
    slug: 'ampersand',
    name: 'Ampersand',
    tagline: 'Commercial electric motorcycle fleet and smart battery swapping stations',
    description: 'Replacing petrol moto-taxis in Kigali and Nairobi with reliable electric motorbikes that cost 40% less to operate and produce zero tailpipe emissions.',
    category_id: 'cleanenergy',
    city: 'Kigali',
    country: 'Rwanda',
    logo_url: '',
    banner_class: 'banner-cleanenergy',
    website_url: 'https://ampersand.solar',
    github_url: '',
    twitter_url: 'https://x.com/ampersand_solar',
    votes_count: 99,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'Josh Whale',
    maker_avatar: '',
    maker_role: 'Founder & CEO',
    pricing_type: 'Battery-as-a-Service swap pricing'
  },
  {
    slug: 'wave',
    name: 'Wave',
    tagline: 'Ultra-low-cost mobile money and QR payment infrastructure for Francophone Africa',
    description: 'Unlocking modern financial inclusion across Senegal and Côte d’Ivoire with free bill payments and a flat 1% remittance fee, powered by offline-capable QR cards.',
    category_id: 'fintech',
    city: 'Dakar',
    country: 'Senegal',
    logo_url: '',
    banner_class: 'banner-fintech',
    website_url: 'https://wave.com',
    github_url: '',
    twitter_url: 'https://x.com/wavemobilemoney',
    votes_count: 125,
    is_featured: 1,
    is_trending: 1,
    maker_name: 'Drew Durbin',
    maker_avatar: '',
    maker_role: 'Co-Founder & CEO',
    pricing_type: '1% flat withdrawal fee'
  },
  {
    slug: 'safeboda',
    name: 'SafeBoda',
    tagline: 'On-demand ride hailing and logistics app modernizing motorcycle transport',
    description: 'Safe and transparent motorcycle taxi hailing in Kampala with trained riders, provided helmets, transparent fixed tariffs, and integrated food delivery.',
    category_id: 'logistics',
    city: 'Kampala',
    country: 'Uganda',
    logo_url: '',
    banner_class: 'banner-logistics',
    website_url: 'https://safeboda.com',
    github_url: '',
    twitter_url: 'https://x.com/SafeBoda',
    votes_count: 84,
    is_featured: 0,
    is_trending: 0,
    maker_name: 'Ricky Rapa Thomson',
    maker_avatar: '',
    maker_role: 'Co-Founder',
    pricing_type: 'Metered fare per trip'
  },
  {
    slug: 'nala',
    name: 'Nala',
    tagline: 'Fast, fair remittances from the diaspora to local African bank accounts and wallets',
    description: 'Fintech rails engineered in Tanzania offering low-fee, transparent remittances from the UK, US, and EU directly to M-Pesa, Airtel Money, and bank accounts.',
    category_id: 'fintech',
    city: 'Dar es Salaam',
    country: 'Tanzania',
    logo_url: '',
    banner_class: 'banner-fintech',
    website_url: 'https://nala.com',
    github_url: '',
    twitter_url: 'https://x.com/NALAmoney',
    votes_count: 96,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'Benjamin Fernandes',
    maker_avatar: '',
    maker_role: 'Founder & CEO',
    pricing_type: 'Zero fees on bank-to-bank'
  },
  {
    slug: 'chari',
    name: 'Chari',
    tagline: 'B2B procurement e-commerce app and embedded fintech for traditional retail shops',
    description: 'Connecting neighborhood grocery stores in Morocco with packaged goods manufacturers, offering free next-day delivery and micro-credit financing.',
    category_id: 'ecommerce',
    city: 'Casablanca',
    country: 'Morocco',
    logo_url: '',
    banner_class: 'banner-ecommerce',
    website_url: 'https://chari.co',
    github_url: '',
    twitter_url: 'https://x.com/Chari_Morocco',
    votes_count: 81,
    is_featured: 0,
    is_trending: 0,
    maker_name: 'Ismael Belkhayat',
    maker_avatar: '',
    maker_role: 'Co-Founder & CEO',
    pricing_type: 'B2B wholesale pricing'
  },
  {
    slug: 'djamo',
    name: 'Djamo',
    tagline: 'Mobile-first financial super app providing virtual Visa cards and automated savings',
    description: 'Empowers Francophone West African youth to manage money, receive salary payouts, shop online, and earn returns with an intuitive iOS and Android interface.',
    category_id: 'fintech',
    city: 'Abidjan',
    country: 'Côte d\'Ivoire',
    logo_url: '',
    banner_class: 'banner-fintech',
    website_url: 'https://djamo.com',
    github_url: '',
    twitter_url: 'https://x.com/djamoapp',
    votes_count: 89,
    is_featured: 0,
    is_trending: 1,
    maker_name: 'Hassan Bourgi',
    maker_avatar: '',
    maker_role: 'Co-Founder & CEO',
    pricing_type: 'Free debit card + usage tiers'
  },
  {
    slug: 'healthlane',
    name: 'Healthlane',
    tagline: 'Preventive healthcare services, remote diagnostic appointments, and lab tests',
    description: 'Digital wellness companion booking comprehensive physical checkups, chronic disease monitoring, and laboratory testing for families in Cameroon.',
    category_id: 'healthtech',
    city: 'Douala',
    country: 'Cameroon',
    logo_url: '',
    banner_class: 'banner-health',
    website_url: 'https://healthlane.co',
    github_url: '',
    twitter_url: 'https://x.com/healthlaneco',
    votes_count: 73,
    is_featured: 0,
    is_trending: 0,
    maker_name: 'Alain Nteff',
    maker_avatar: '',
    maker_role: 'Co-Founder & CEO',
    pricing_type: 'Annual wellness membership'
  }
];

const insertProduct = db.prepare(`
  INSERT INTO products (
    slug, name, tagline, description, category_id, city, country, logo_url,
    banner_class, website_url, github_url, twitter_url, votes_count, is_featured,
    is_trending, maker_name, maker_avatar, maker_role, pricing_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const p of products) {
  insertProduct.run(
    p.slug, p.name, p.tagline, p.description, p.category_id, p.city, p.country,
    p.logo_url, p.banner_class, p.website_url, p.github_url, p.twitter_url,
    p.votes_count, p.is_featured, p.is_trending, p.maker_name, p.maker_avatar,
    p.maker_role, p.pricing_type
  );
}

// 3. Launches (Mapping today and yesterday)
const todayStr = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

const insertLaunch = db.prepare(`
  INSERT INTO launches (product_id, launch_date, day_rank, votes_at_launch)
  VALUES (?, ?, ?, ?)
`);

const getProdId = db.prepare('SELECT id FROM products WHERE slug = ?');
const pxxl = getProdId.get('pxxl');
const yarngpt = getProdId.get('yarngpt');
const powbeam = getProdId.get('powbeam');
const byteship = getProdId.get('byteship');
const brimble = getProdId.get('brimble');
const chowdeck = getProdId.get('chowdeck');

// Today's launches: Pxxl (#1), YarnGPT (#2), Powbeam (#3)
if (pxxl) insertLaunch.run(pxxl.id, todayStr, 1, 142);
if (yarngpt) insertLaunch.run(yarngpt.id, todayStr, 2, 128);
if (powbeam) insertLaunch.run(powbeam.id, todayStr, 3, 115);

// Yesterday's launches: Byteship (#1), Brimble (#2), Chowdeck (#3)
if (byteship) insertLaunch.run(byteship.id, yesterday, 1, 98);
if (brimble) insertLaunch.run(brimble.id, yesterday, 2, 94);
if (chowdeck) insertLaunch.run(chowdeck.id, yesterday, 3, 82);

// 4. Stories
const stories = [
  {
    slug: 'akinkunmi',
    founder_name: 'Akinkunmi',
    founder_role: 'Creator of Byteship, OutRay & Avnac',
    founder_avatar: 'images/story_akinkunmi.jpg',
    company_name: 'Byteship Suite',
    company_slug: 'byteship',
    headline: 'Building resilient African infrastructure with 150k monthly API calls',
    quote: 'We stopped optimizing for Silicon Valley aesthetics and started building resilient software for intermittent power and unstable connectivity.',
    story_body: `Akinkunmi doesn't describe himself as a founder first. He's a builder — someone who notices friction in his own workflow and quietly ships a fix. Over the last two years, that habit has produced three products used by thousands of developers and designers across the continent.\n\nByteship began as an internal script for handling uploads on a side project. Outray followed when he got tired of paying for tunnels to show clients work running on localhost. Avnac, an open design editor in the browser, came from wanting a tool that worked well on the laptops and connections most of his friends actually had.\n\nAll three products are open source. For Akinkunmi, it's less a business model than a way of paying it forward: every repo is a chance for another developer to learn how production software is actually built.`,
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    video_duration: '24:18',
    location: 'Lagos, Nigeria',
    category_id: 'devtools',
    type: 'video',
    transcript_json: JSON.stringify([
      { time: '03:21', speaker: 'Discova', text: 'Where did Byteship actually start?' },
      { time: '03:35', speaker: 'Akinkunmi', text: 'Honestly, as a script. I had a side project and kept rewriting the same upload logic. So I put it into its own container on a server. Other people started asking for it.' },
      { time: '04:12', speaker: 'Akinkunmi', text: 'If a tool is slow on a Lagos connection, it\'s broken for most of my users. That\'s my benchmark.' },
      { time: '08:45', speaker: 'Discova', text: 'How do you handle electricity and connectivity spikes during deployments?' },
      { time: '09:02', speaker: 'Akinkunmi', text: 'I designed our background worker queue to pause and recover automatically. When power drops, the client resumes the exact byte without restarting.' }
    ]),
    is_featured: 1
  },
  {
    slug: 'robinson-honour',
    founder_name: 'Robinson Honour',
    founder_role: 'Founder, Brimble',
    founder_avatar: 'images/founder_robinson.jpg',
    company_name: 'Brimble',
    company_slug: 'brimble',
    headline: 'Edge hosting infrastructure engineered for African developers',
    quote: 'Serving static web assets from Europe to West Africa adds 180ms of pointless latency. We fixed that with native African edge servers.',
    story_body: 'Robinson Honour shared how Brimble was born out of frustration with deployment platforms that treat the African continent as an afterthought with high latency.',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    video_duration: '18:40',
    location: 'Lagos, Nigeria',
    category_id: 'devtools',
    type: 'video',
    transcript_json: JSON.stringify([
      { time: '01:15', speaker: 'Discova', text: 'Why did you start Brimble?' },
      { time: '01:30', speaker: 'Robinson', text: 'We wanted edge caching right where the users live, in Lagos, Nairobi, and Johannesburg.' }
    ]),
    is_featured: 0
  },
  {
    slug: 'odun-eweniyi',
    founder_name: 'Odun Eweniyi',
    founder_role: 'Co-Founder & COO, PiggyVest',
    founder_avatar: 'images/story_odun.jpg',
    company_name: 'PiggyVest',
    company_slug: 'piggyvest',
    headline: 'Cultivating savings discipline for millions of youth amid inflation',
    quote: 'Discipline in personal finance is not about willpower; it is about building automated guardrails that protect people from their worst impulses.',
    story_body: 'How PiggyVest helped millions of young Nigerians cultivate savings discipline amid record inflation and currency shifts.',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    video_duration: '28:15',
    location: 'Lagos, Nigeria',
    category_id: 'fintech',
    type: 'podcast',
    transcript_json: JSON.stringify([
      { time: '02:10', speaker: 'Discova', text: 'What is the biggest lesson from scaling PiggyVest?' },
      { time: '02:35', speaker: 'Odun', text: 'Trust is currency. Once people trust you with their savings, you cannot compromise on reliability.' }
    ]),
    is_featured: 0
  },
  {
    slug: 'fara-ashiru',
    founder_name: 'Fara Ashiru',
    founder_role: 'Founder & CEO, Okra',
    founder_avatar: 'images/founder_okra.jpg',
    company_name: 'Okra',
    company_slug: 'okra',
    headline: 'Unlocking open finance API infrastructure for the continent',
    quote: 'Open finance is the highway upon which every single African fintech product will travel in the next decade.',
    story_body: 'Building the fundamental open finance API infrastructure that connects hundreds of commercial banks and fintech lenders.',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    video_duration: '21:05',
    location: 'Lagos, Nigeria',
    category_id: 'fintech',
    type: 'video',
    transcript_json: '[]',
    is_featured: 0
  },
  {
    slug: 'sulaiman-adewale',
    founder_name: 'Sulaiman Adewale',
    founder_role: 'Lead AI Engineer, YarnGPT',
    founder_avatar: 'images/founder_yarngpt.jpg',
    company_name: 'YarnGPT',
    company_slug: 'yarngpt',
    headline: 'Fine-tuning voice AI on native dialects and accent nuances',
    quote: 'Mainstream voice models sound completely robotic when pronouncing African names and vernacular terms. We fixed that.',
    story_body: 'How YarnGPT captured the subtleties of Yoruba, Pidgin, and Swahili cadence to make voice interfaces human.',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    video_duration: '25:30',
    location: 'Nairobi, Kenya',
    category_id: 'ai',
    type: 'podcast',
    transcript_json: '[]',
    is_featured: 0
  }
];

const insertStory = db.prepare(`
  INSERT INTO stories (
    slug, founder_name, founder_role, founder_avatar, company_name, company_slug,
    headline, quote, story_body, video_url, video_duration, location, category_id,
    type, transcript_json, is_featured
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const s of stories) {
  insertStory.run(
    s.slug, s.founder_name, s.founder_role, s.founder_avatar, s.company_name,
    s.company_slug, s.headline, s.quote, s.story_body, s.video_url, s.video_duration,
    s.location, s.category_id, s.type, s.transcript_json, s.is_featured
  );
}

// 5. Initial Reviews for Pxxl
const insertReview = db.prepare(`
  INSERT INTO reviews (product_id, author_name, author_role, author_avatar, rating, content)
  VALUES (?, ?, ?, ?, ?, ?)
`);

if (pxxl) {
  insertReview.run(
    pxxl.id,
    'Kelechi Okafor',
    'Frontend Lead, Eden Life',
    'images/team_kelechi.jpg',
    5,
    'Swapped Cloudinary for Pxxl on our landing page and our Google Lighthouse speed index jumped from 48 to 94. The edge caching in Lagos makes a massive real-world difference.'
  );

  insertReview.run(
    pxxl.id,
    'Amina Diallo',
    'Founder, Sahel Pay',
    'images/team_amina.jpg',
    5,
    'Essential infrastructure for any web startup targeting users outside major metro fiber hubs. Sub-30ms TTFB is real.'
  );
}

// 6. Initial Submissions Queue
const insertSubmission = db.prepare(`
  INSERT INTO submissions (
    product_name, tagline, description, category, pricing_type, website_url,
    github_url, logo_url, maker_name, maker_email, maker_role, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertSubmission.run(
  'AltCode',
  'Collaborative code notebook with embedded African currency converters',
  'An interactive Jupyter-like code editor designed for data science teams and university research labs across Africa.',
  'devtools',
  'Free & Open Source',
  'https://altcode.dev',
  'https://github.com/altcode/app',
  '',
  'Tunde Oladipo',
  'tunde@altcode.dev',
  'Creator',
  'pending'
);

console.log('🎉 Seed complete! Database ready at discova.db');
