import { Translations } from "./sv";

const en: Translations = {
  nav: {
    brand: "Digital Rapport",
    tagline: "Visibility",
    sections: {
      overview: "Overview",
      data: "Data",
    },
    items: {
      dashboard: "Dashboard",
      report: "Report",
      integrations: "Integrations",
    },
    user: {
      account: "Your account",
      plan: "Free plan",
    },
  },

  viewer: {
    exit: "Exit",
    goToSlide: (n: number) => `Go to slide ${n}`,
    prevSlide: "Previous slide",
    nextSlide: "Next slide",
  },

  cover: {
    eyebrow: "AI Visibility Report",
    intro: (agencyName: string) =>
      `A performance report prepared by ${agencyName}. Designed to help you understand what happened, why it matters, and what to do next.`,
    cadenceReport: (cadence: string) => `${cadence} report`,
    generated: (date: string) => `Generated ${date}`,
  },

  executiveSummary: {
    eyebrow: "Executive Summary",
    aiEyebrow: "AI Analysis",
    whatHappened: "What happened",
    whyItMatters: "Why it matters",
    nextStep: "Next step",
    keySignals: "Key signals",
  },

  kpiSnapshot: {
    eyebrow: "KPI Snapshot",
    headline: "The numbers that matter most.",
    vsPrior: "vs prior",
  },

  trafficOverview: {
    eyebrow: "Traffic Overview",
    headline: "How people are finding you.",
    byChannel: "By channel",
    channelShare: "Channel share",
    vsPrior: "vs prior period",
  },

  seoOverview: {
    eyebrow: "Search Visibility",
    headline: "Where you show up in search.",
    clicksOverTime: "Clicks over time",
    topQueries: "Top queries",
    clicks: (n: number) => `${n} clicks`,
    pos: (p: string) => `pos ${p}`,
    ctr: (v: string) => `${v}% CTR`,
  },

  topPages: {
    eyebrow: "Page Performance",
    headline: "Your most important pages.",
    subheadline: "Ranked by traffic and search visibility.",
    colPage: "Page",
    colSessions: "Sessions",
    colClicks: "Clicks",
    colPosition: "Position",
    colTrend: "Trend",
  },

  paidOverview: {
    eyebrow: "Paid Search",
    headline: "Your ad investment at a glance.",
    conversions: "Conversions",
    roas: "ROAS",
    efficiency: "Efficiency",
  },

  conversion: {
    eyebrow: "Conversion & Lead Efficiency",
    headline: "Turning visits into results.",
    vsPrior: "vs prior period",
    goalCompletions: "Goal completions",
  },

  issues: {
    eyebrow: "Issues & Watchouts",
    headlineCritical: (n: number) =>
      `${n} critical issue${n > 1 ? "s" : ""} need attention.`,
    headlineItems: (n: number) => `${n} item${n > 1 ? "s" : ""} to address.`,
    subheadline: "Ordered by severity and potential impact.",
    pagesAffected: (n: number) => `${n} ${n === 1 ? "page" : "pages"} affected`,
    severity: {
      critical: "Critical",
      warning: "Warning",
      info: "Info",
    },
  },

  recommendations: {
    eyebrow: "Recommendations",
    headline: "What to do next.",
    subheadline: (n: number) => `${n} prioritised actions for the coming period.`,
    effort: "Effort",
    impact: "Impact",
    levels: {
      low: "Low",
      medium: "Medium",
      high: "High",
    },
    disclaimer: (agencyName: string) =>
      `This report was prepared by ${agencyName}. Recommendations are based on available data and are intended to inform — not replace — your team's judgment.`,
  },

  dashboard: {
    eyebrow: (period: string) => period,
    heading: "Overview",
    periods: {
      thisMonth: "This month",
      lastMonth: "Last month",
      custom: "Custom",
    },
    sampleBanner: {
      text: "You're seeing sample data.",
      cta: "Connect GA4 or Search Console",
      suffix: "to unlock your real performance.",
      link: "Connect sources →",
    },
    hero: {
      subtitle: (period: string) => `AI Summary — ${period}`,
      readReport: "Read full report",
    },
    kpi: {
      engagement: "Engagement",
      paidEfficiency: "Paid efficiency",
      conversions: "Conversions",
      vsPrior: "vs prior",
    },
    sessions: {
      eyebrow: "Visits over time",
      eyebrowTooltip: "Shows the daily number of visits to the website across the period. Each point is one day — the peak is the busiest day.",
      allSessions: "All visits",
      totalSessions: (n: string) => `${n} total visits`,
    },
    channels: {
      eyebrow: "Traffic channels",
      organicSearch: "Organic search",
      paidSearch: "Paid search",
      direct: "Direct",
      referral: "Referral",
    },
    search: {
      eyebrow: "Search visibility",
    },
    paid: {
      eyebrow: "Paid performance",
    },
    nudge: {
      ga4: "Connect Google Analytics to see how many people visit your site and where they come from.",
      gsc: "Connect Google Search Console to see how people find you organically.",
      google_ads: "Connect Google Ads to see how your paid budget is performing.",
      link: "Connect sources →",
    },
  },

  scenarios: {
    seoTraffic: {
      label: "SEO + Traffic",
      description: "GA4 + GSC only",
    },
    full: {
      label: "Full Report",
      description: "GA4 + GSC + Ads",
    },
    partial: {
      label: "Partial Data",
      description: "Manual + GSC",
    },
  },

  integrations: {
    eyebrow: "Data sources",
    heading: "Integrations",
    intro: {
      headline: "Connect your sources.\nUnlock your full picture.",
      body: "Each source you connect adds a new layer of insight to your dashboard and report. Your data is fetched securely — we only read, never write.",
    },
    badges: {
      connected: "Connected",
      comingSoon: "Coming soon",
    },
    actions: {
      connect: "Connect",
      disconnect: "Disconnect",
    },
    trust: "🔒 We use read-only OAuth scopes. We never store raw data beyond your session. You can disconnect any source at any time.",
    sources: {
      ga4: {
        name: "Google Analytics 4",
        tagline: "See where your traffic comes from — and what it does.",
        description: "Sessions, users, channel mix, bounce rate, engagement, and time-on-site. The foundation of every report.",
        unlocks: ["Traffic overview", "Channel breakdown", "Engagement metrics", "Conversion tracking"],
      },
      gsc: {
        name: "Google Search Console",
        tagline: "Understand your search visibility, not just your rankings.",
        description: "Clicks, impressions, CTR, and average position across all your queries. Know exactly how Google sees you.",
        unlocks: ["Search clicks & impressions", "Keyword performance", "CTR analysis", "Position tracking"],
      },
      google_ads: {
        name: "Google Ads",
        tagline: "Connect spend to outcomes — not just clicks.",
        description: "Ad spend, CPC, ROAS, and conversion data alongside your organic performance for a complete picture.",
        unlocks: ["Paid performance", "Cost per lead", "ROAS tracking", "Paid vs organic split"],
      },
    },
  },

  login: {
    eyebrow: "Digital Rapport",
    headline: "Your business,\nclearly reported.",
    description: "Connect your Google account to see your traffic, search visibility, and growth — in one clean report.",
    cta: "Continue with Google",
  },

  registry: {
    traffic: {
      headlineDown: "Traffic softened this month",
      headlineUp: "More users reached the site",
      insightPaid: "Paid activity carried a meaningful share of the month.",
      insightOrganic: "Acquisition is giving more people a way into the site.",
    },
    organic: {
      headlineDown: "Organic softened slightly",
      headlineUp: "Organic is growing",
      insight: "No structural SEO issues detected.",
    },
    searchClicks: {
      headlineDown: "Search demand is steady",
      headlineUp: "Search demand is up",
      insight: "Impressions up - CTR has room to improve.",
    },
    engagement: {
      headlineDown: "Engagement improved",
      headlineUp: "Bounce rate needs attention",
      insightDown: "Users are spending more time on site.",
      insightUp: "Visitors are leaving faster than last month.",
    },
    conversions: {
      headlineDown: "Conversion volume needs attention",
      headlineUp: "Traffic is turning into action",
      insight: "This is the clearest signal that digital activity is creating business value.",
    },
    paidEfficiency: {
      headline: "Paid efficiency is visible",
      insight: "Use this to decide whether budget should scale or tighten.",
    },
    sessionsChart: {
      narrative: "Traffic held strong, with a dip in the final week",
      totalSessions: "total sessions",
    },
    channelBreakdown: {
      narrative: "Paid is the biggest driver this month",
    },
    searchVisibility: {
      narrative: "Impressions held - clicks need lift",
    },
    paidPerformance: {
      narrative: "Paid has enough signal to guide budget decisions",
    },
  },
};

export default en;
