const sv = {
  // Navigation & Sidebar
  nav: {
    brand: "Digital Rapport",
    tagline: "Synlighet",
    sections: {
      overview: "Översikt",
      data: "Data",
    },
    items: {
      dashboard: "Översikt",
      report: "Rapport",
      integrations: "Integrationer",
    },
    user: {
      account: "Ditt konto",
      plan: "Kostnadsfri plan",
    },
  },

  // Report viewer
  viewer: {
    exit: "Stäng",
    goToSlide: (n: number) => `Gå till bild ${n}`,
    prevSlide: "Föregående bild",
    nextSlide: "Nästa bild",
  },

  // Cover slide
  cover: {
    eyebrow: "AI-driven resultatrapport",
    intro: (agencyName: string) =>
      `En resultatrapport framtagen av ${agencyName}. Byggd för att visa vad som hänt, varför det spelar roll och vilka beslut som bör tas härnäst.`,
    cadenceReport: (cadence: string) => `${cadence}-rapport`,
    generated: (date: string) => `Genererad ${date}`,
  },

  // Executive summary slide
  executiveSummary: {
    eyebrow: "Sammanfattning",
    aiEyebrow: "AI-analys",
    whatHappened: "Vad hände",
    whyItMatters: "Varför det är viktigt",
    nextStep: "Nästa steg",
    keySignals: "Viktigaste signalerna",
  },

  // KPI snapshot slide
  kpiSnapshot: {
    eyebrow: "KPI-översikt",
    headline: "Nyckeltalen som styr besluten.",
    vsPrior: "mot föreg.",
  },

  // Traffic overview slide
  trafficOverview: {
    eyebrow: "Trafiköversikt",
    headline: "Så hittar besökarna till er.",
    byChannel: "Per kanal",
    channelShare: "Kanalfördelning",
    vsPrior: "mot föregående period",
  },

  // SEO overview slide
  seoOverview: {
    eyebrow: "Söksynlighet",
    headline: "Så syns ni i sökresultaten.",
    clicksOverTime: "Klick över tid",
    topQueries: "Viktigaste sökfrågorna",
    clicks: (n: number) => `${n} klick`,
    pos: (p: string) => `pos. ${p}`,
    ctr: (v: string) => `${v}% CTR`,
  },

  // Top pages slide
  topPages: {
    eyebrow: "Sidprestanda",
    headline: "De viktigaste sidorna.",
    subheadline: "Rangordnade efter trafik och söksynlighet.",
    colPage: "Sida",
    colSessions: "Sessioner",
    colClicks: "Klick",
    colPosition: "Position",
    colTrend: "Trend",
  },

  // Paid overview slide
  paidOverview: {
    eyebrow: "Betald sökning",
    headline: "Annonsinvesteringen i korthet.",
    conversions: "Konverteringar",
    roas: "ROAS",
    efficiency: "Effektivitet",
  },

  // Conversion slide
  conversion: {
    eyebrow: "Konvertering och leadeffektivitet",
    headline: "Besök som blir affärsvärde.",
    vsPrior: "mot föregående period",
    goalCompletions: "Måluppfyllelse",
  },

  // Issues slide
  issues: {
    eyebrow: "Risker och åtgärdspunkter",
    headlineCritical: (n: number) =>
      `${n} kritisk${n > 1 ? "a" : "t"} problem kräver åtgärd.`,
    headlineItems: (n: number) => `${n} åtgärdspunkt${n > 1 ? "er" : ""}.`,
    subheadline: "Prioriterade efter allvarlighetsgrad och påverkan.",
    pagesAffected: (n: number) => `${n} ${n === 1 ? "sida" : "sidor"} berörda`,
    severity: {
      critical: "Kritisk",
      warning: "Varning",
      info: "Info",
    },
  },

  // Recommendations slide
  recommendations: {
    eyebrow: "Rekommendationer",
    headline: "Prioriterade beslut framåt.",
    subheadline: (n: number) => `${n} prioriterade åtgärder för nästa period.`,
    effort: "Insats",
    impact: "Effekt",
    levels: {
      low: "Låg",
      medium: "Medel",
      high: "Hög",
    },
    disclaimer: (agencyName: string) =>
      `Rapporten är framtagen av ${agencyName}. Rekommendationerna baseras på tillgänglig data och ska stödja, inte ersätta, teamets bedömning.`,
  },

  // Dashboard page
  dashboard: {
    eyebrow: (period: string) => period,
    heading: "Översikt",
    periods: {
      thisMonth: "Denna månad",
      lastMonth: "Föregående månad",
      custom: "Anpassat",
    },
    sampleBanner: {
      text: "Du ser exempeldata.",
      cta: "Anslut GA4 eller Search Console",
      suffix: "för att se faktisk prestanda.",
      link: "Anslut källor →",
    },
    hero: {
      subtitle: (period: string) => `AI-sammanfattning — ${period}`,
      readReport: "Läs hela rapporten",
    },
    kpi: {
      engagement: "Engagemang",
      paidEfficiency: "Betald effektivitet",
      conversions: "Konverteringar",
      vsPrior: "mot föreg.",
    },
    sessions: {
      eyebrow: "Sessioner över tid",
      eyebrowTooltip: "Visar det dagliga antalet besök på webbplatsen under perioden. Varje punkt är en dag — toppen är den mest trafikerade dagen.",
      allSessions: "Alla sessioner",
      totalSessions: (n: string) => `${n} sessioner totalt`,
    },
    channels: {
      eyebrow: "Trafikkanaler",
      organicSearch: "Organisk sökning",
      paidSearch: "Betald sökning",
      direct: "Direkt",
      referral: "Hänvisningar",
    },
    search: {
      eyebrow: "Söksynlighet",
    },
    paid: {
      eyebrow: "Betald prestanda",
    },
    nudge: {
      link: "Anslut källor →",
      ga4: "Anslut Google Analytics för att se hur många som besöker sajten och var trafiken kommer från.",
      gsc: "Anslut Google Search Console för att se hur ni hittas organiskt.",
      google_ads: "Anslut Google Ads för att se hur den betalda budgeten presterar.",
    },
  },

  // Shared scenario selector
  scenarios: {
    seoTraffic: {
      label: "SEO + trafik",
      description: "Endast GA4 + GSC",
    },
    full: {
      label: "Full rapport",
      description: "GA4 + GSC + Ads",
    },
    partial: {
      label: "Partiell data",
      description: "Manuell data + GSC",
    },
  },

  // Integrations page
  integrations: {
    eyebrow: "Datakällor",
    heading: "Integrationer",
    intro: {
      headline: "Anslut era källor.\nFå hela bilden.",
      body: "Varje ansluten källa tillför ett nytt lager av insikt i dashboard och rapport. Datan hämtas säkert. Vi läser, men skriver aldrig.",
    },
    badges: {
      connected: "Ansluten",
      comingSoon: "Kommer snart",
    },
    actions: {
      connect: "Anslut",
      disconnect: "Koppla från",
    },
    trust: "🔒 Vi använder skrivskyddade OAuth-behörigheter. Vi lagrar aldrig rådata utöver sessionen. Du kan koppla från en källa när som helst.",
    sources: {
      ga4: {
        name: "Google Analytics 4",
        tagline: "Se var trafiken kommer från och vad besökarna gör.",
        description: "Sessioner, användare, kanalmix, avvisningsfrekvens, engagemang och tid på sida. Basen för varje rapport.",
        unlocks: ["Trafiköversikt", "Kanalfördelning", "Engagemangsmått", "Konverteringsspårning"],
      },
      gsc: {
        name: "Google Search Console",
        tagline: "Förstå er söksynlighet, inte bara era positioner.",
        description: "Klick, visningar, CTR och genomsnittlig position för era söktermer. Se hur Google läser er närvaro.",
        unlocks: ["Sökklick och visningar", "Sökordsresultat", "CTR-analys", "Positionsspårning"],
      },
      google_ads: {
        name: "Google Ads",
        tagline: "Koppla annonskostnad till resultat, inte bara klick.",
        description: "Annonskostnad, CPC, ROAS och konverteringar tillsammans med organisk prestanda för en komplett bild.",
        unlocks: ["Betald prestanda", "Kostnad per lead", "ROAS-spårning", "Betald kontra organisk trafik"],
      },
    },
  },

  // Login page
  login: {
    eyebrow: "Digital Rapport",
    headline: "Er digitala utveckling,\ntydligt rapporterad.",
    description: "Anslut Google-kontot för att se trafik, söksynlighet och tillväxt i en tydlig rapport.",
    cta: "Fortsätt med Google",
  },

  // Dashboard registry text (KPI card narratives)
  registry: {
    traffic: {
      headlineDown: "Trafiken minskade under perioden",
      headlineUp: "Fler besökare nådde sajten",
      insightPaid: "Betald trafik stod för en tydlig del av volymen.",
      insightOrganic: "Förvärvet ger fler besökare en väg in till sajten.",
    },
    organic: {
      headlineDown: "Organisk trafik tappade något",
      headlineUp: "Organisk trafik växer",
      insight: "Inga strukturella SEO-problem har identifierats.",
    },
    searchClicks: {
      headlineDown: "Sökefterfrågan är stabil",
      headlineUp: "Sökefterfrågan ökar",
      insight: "Visningarna ökar. CTR har fortsatt förbättringspotential.",
    },
    engagement: {
      headlineDown: "Engagemanget förbättrades",
      headlineUp: "Avvisningsfrekvensen kräver uppföljning",
      insightDown: "Besökarna stannar längre på sajten.",
      insightUp: "Besökarna lämnar sajten snabbare än föregående period.",
    },
    conversions: {
      headlineDown: "Konverteringsvolymen behöver följas upp",
      headlineUp: "Trafiken omsätts i handling",
      insight: "Detta är den tydligaste signalen på att det digitala arbetet skapar affärsvärde.",
    },
    paidEfficiency: {
      headline: "Betald effektivitet går att bedöma",
      insight: "Använd signalen för att avgöra om budgeten bör skalas upp eller stramas åt.",
    },
    sessionsChart: {
      narrative: "Trafiken var stabil med en svacka i slutet av perioden",
      totalSessions: "sessioner totalt",
    },
    channelBreakdown: {
      narrative: "Betald trafik är den största drivaren denna månad",
    },
    searchVisibility: {
      narrative: "Visningarna håller nivå. Klick behöver lyfta.",
    },
    paidPerformance: {
      narrative: "Betald annonsering ger tillräcklig signal för budgetbeslut",
    },
  },
};

export type Translations = typeof sv;
export default sv;
