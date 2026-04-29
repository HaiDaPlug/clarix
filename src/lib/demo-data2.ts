// Mock data for (app2) — Chris's design system pages.
// No real API wiring needed — purely for visual comparison.

export function formatNumber(n: number) {
  return n.toLocaleString("sv-SE");
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
}

export const kpis = {
  sessions:    { value: 184_320, delta: 14.2, spark: [80, 95, 88, 105, 112, 98, 120, 115, 130, 122, 140, 155] },
  users:       { value: 142_810, delta: 11.7, spark: [70, 82, 78, 92, 98, 88, 105, 102, 118, 110, 125, 138] },
  conversions: { value: 2_184,   delta: 9.3,  spark: [40, 48, 44, 55, 58, 50, 62, 60, 70, 65, 75, 82] },
  revenue:     { value: 1_852_400, delta: 18.6, spark: [120, 145, 132, 160, 175, 155, 188, 182, 210, 198, 225, 248] },
  adSpend:     { value: 423_800,  delta: -4.2, spark: [55, 60, 58, 62, 65, 60, 63, 61, 65, 62, 67, 64] },
  roas:        { value: 4.37,     delta: 23.8, spark: [2.8, 3.1, 2.9, 3.4, 3.6, 3.2, 3.8, 3.7, 4.1, 3.9, 4.2, 4.4] },
};

export const trafficTrend = [
  { date: "v1",  sessions: 12400, users: 9800  },
  { date: "v2",  sessions: 13200, users: 10400 },
  { date: "v3",  sessions: 12800, users: 10100 },
  { date: "v4",  sessions: 14100, users: 11200 },
  { date: "v5",  sessions: 15300, users: 12100 },
  { date: "v6",  sessions: 14600, users: 11500 },
  { date: "v7",  sessions: 16200, users: 12800 },
  { date: "v8",  sessions: 15800, users: 12500 },
  { date: "v9",  sessions: 17400, users: 13800 },
  { date: "v10", sessions: 16900, users: 13400 },
  { date: "v11", sessions: 18200, users: 14400 },
  { date: "v12", sessions: 19800, users: 15700 },
];

export const channelBreakdown = [
  { name: "Organisk",  value: 38, color: "var(--chart-1)" },
  { name: "Betald",    value: 27, color: "var(--chart-2)" },
  { name: "Direkt",    value: 18, color: "var(--chart-3)" },
  { name: "Social",    value: 12, color: "var(--chart-4)" },
  { name: "Övrigt",   value: 5,  color: "var(--chart-5)" },
];

export const topPages = [
  { path: "/produkter/aurora-pro",    views: 24800 },
  { path: "/",                        views: 21200 },
  { path: "/om-oss",                  views: 14600 },
  { path: "/blogg/seo-guide-2026",    views: 11900 },
  { path: "/kontakt",                 views: 8400  },
];

export const insights = [
  { type: "win",         title: "ROAS på rekordnivå",              body: "4,37× — bästa månaden sedan Q3 2024. Aurora Pro-kampanjen levererar." },
  { type: "opportunity", title: "Mobil checkout tappar konverterat", body: "18 % drop-off i steg 2 på iOS. Fixa formulärvalideringen." },
  { type: "warning",     title: "Annonskostnad ökar snabbare än konvertering", body: "Spendökning +8 % men CPA steg +3,4 %. Justera budsstrategin." },
  { type: "info",        title: "Blogg driver organisk tillväxt",  body: "3 nya inlägg stod för 14 % av organisk trafik denna månad." },
];

export const integrations = [
  {
    id: "ga4", name: "Google Analytics 4", provider: "Google", category: "WEBBTRAFIK",
    purpose: "Mät sessioner, användare, sidvisningar och konverteringar i realtid.",
    color: "#F9AB00", connected: true, account: "alex@aurora.studio",
    scopes: ["Läsa analysdata", "Visa kontoinformation"],
  },
  {
    id: "gsc", name: "Search Console", provider: "Google", category: "SEO",
    purpose: "Spåra klick, visningar, CTR och sökpositioner från Google Sök.",
    color: "#4285F4", connected: true, account: "alex@aurora.studio",
    scopes: ["Läsa sökresultatdata", "Visa webbplatslistor"],
  },
  {
    id: "gads", name: "Google Ads", provider: "Google", category: "ANNONSER",
    purpose: "Importera kampanjkostnader, klick och konverteringar direkt.",
    color: "#FBBC04", connected: false, account: "",
    scopes: ["Läsa kampanjdata", "Visa kontoutgifter"],
  },
  {
    id: "meta", name: "Meta Ads", provider: "Meta", category: "ANNONSER",
    purpose: "Hämta in Facebook- och Instagram-annonsdata med ROAS och räckvidd.",
    color: "#0081FB", connected: false, account: "",
    scopes: ["ads_read", "business_management"],
  },
  {
    id: "linkedin", name: "LinkedIn Ads", provider: "LinkedIn", category: "ANNONSER",
    purpose: "B2B-kampanjdata, leadformulär och engagemang.",
    color: "#0A66C2", connected: false, account: "",
    scopes: ["r_ads_reporting"],
  },
  {
    id: "tiktok", name: "TikTok Ads", provider: "TikTok", category: "ANNONSER",
    purpose: "Annonsvisningar, videogenomföranden och konverteringsspårning.",
    color: "#FF0050", connected: false, account: "",
    scopes: ["Läsa annonskampanjer"],
  },
  {
    id: "shopify", name: "Shopify", provider: "Shopify", category: "E-HANDEL",
    purpose: "Ordrar, intäkter, produktprestanda och kunddata.",
    color: "#95BF47", connected: false, account: "",
    scopes: ["read_orders", "read_products", "read_analytics"],
  },
  {
    id: "youtube", name: "YouTube", provider: "Google", category: "VIDEO",
    purpose: "Visningar, visningstid, prenumeranter och annonsintäkter.",
    color: "#FF0000", connected: false, account: "",
    scopes: ["Läsa YouTube Analytics"],
  },
];

export const clients = [
  { id: "aurora",   name: "Aurora Studios",      domain: "aurora.studio",       reports: 24, status: "Aktiv",   color: "from-violet-400 to-fuchsia-500" },
  { id: "nordic",   name: "Nordic Retail AB",    domain: "nordicretail.se",     reports: 18, status: "Aktiv",   color: "from-sky-400 to-blue-500" },
  { id: "halo",     name: "Halo Commerce",        domain: "halocommerce.io",     reports: 31, status: "Aktiv",   color: "from-emerald-400 to-teal-500" },
  { id: "sprout",   name: "Sprout Agency",        domain: "sproutagency.se",     reports: 9,  status: "Aktiv",   color: "from-amber-400 to-orange-500" },
  { id: "lumina",   name: "Lumina Media",         domain: "luminamedia.se",      reports: 14, status: "Inaktiv", color: "from-rose-400 to-pink-500" },
  { id: "vertex",   name: "Vertex Digital",       domain: "vertexdigital.se",    reports: 7,  status: "Aktiv",   color: "from-indigo-400 to-purple-500" },
];
