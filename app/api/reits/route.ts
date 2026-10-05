import { NextResponse } from "next/server";

export const revalidate = 172800;

const DATA_CACHE_SECONDS = 172800;
const SEC_MAX_CONCURRENT_REQUESTS = 4;
let activeSecRequests = 0;
const pendingSecRequests: Array<() => void> = [];

async function withSecRequestLimit<T>(request: () => Promise<T>) {
  if (activeSecRequests >= SEC_MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => pendingSecRequests.push(resolve));
  } else {
    activeSecRequests += 1;
  }

  try {
    return await request();
  } finally {
    const nextRequest = pendingSecRequests.shift();
    if (nextRequest) nextRequest();
    else activeSecRequests -= 1;
  }
}

const REIT_SYMBOLS = [
  "VICI", "SHO", "RLJ", "GTY", "DEA", "BNL", "UE", "NNN", "CBL", "REXR",
  "O", "DOC", "IRT", "SUI", "KIM", "CSR", "SBRA", "EPR", "ARE", "CTRE",
  "AAT", "KRC", "CUBE", "SPG", "PEB", "ESS", "PLD", "EPRT", "NTST", "STAG",
  "BFS", "AKR", "DRH", "HIW", "ESRT", "ADC", "WPC", "EGP", "VNO", "FCPT",
  "SLG", "VTR", "OHI", "GNL", "DEI", "WELL", "RHP", "NXRT", "APLE", "IIPR",
  "EXR", "INVH", "BXP", "LXP", "UDR", "TRNO", "PSA", "AMT", "IRM", "EQIX",
  "AMH", "NHI", "SBAC", "REG", "MAA", "DLR", "FR", "UMH", "CPT", "CCI",
  "BRX", "ELS", "KRG", "DBRG", "VMRK", "FRT", "SKT", "DHC", "MPT", "SMA",
  "IVT", "LAMR", "CDP", "MAC",
] as const;

const REITS = {
  AAT: { cik: "0001047184", sector: "Office", name: "American Assets Trust" },
  AMT: { cik: "0001053507", sector: "Cell Towers", name: "American Tower" },
  AVB: { cik: "0000915912", sector: "Residential", name: "AvalonBay Communities" },
  BXP: { cik: "0001031303", sector: "Office", name: "Boston Properties" },
  CUBE: { cik: "0001575965", sector: "Self Storage", name: "CubeSmart" },
  EPR: { cik: "0000748814", sector: "Experiential", name: "EPR Properties" },
  EQIX: { cik: "0001101239", sector: "Data Centers", name: "Equinix" },
  ESS: { cik: "0000922867", sector: "Residential", name: "Essex" },
  EXR: { cik: "0001289490", sector: "Self Storage", name: "Extra Space Storage" },
  HST: { cik: "0001070753", sector: "Hotel", name: "Host Hotels & Resorts" },
  KIM: { cik: "0000879101", sector: "Retail", name: "Kimco Realty" },
  MAA: { cik: "0000912598", sector: "Residential", name: "Mid-America Apartment" },
  NNN: { cik: "0000020218", sector: "Retail", name: "NNN Realty" },
  O: { cik: "0000726728", sector: "Diversified", name: "Realty Income" },
  OHI: { cik: "0001577043", sector: "Healthcare", name: "Omega Healthcare" },
  PLD: { cik: "0001093557", sector: "Industrial", name: "Prologis" },
  PSA: { cik: "0001393311", sector: "Self Storage", name: "Public Storage" },
  REG: { cik: "0000864920", sector: "Retail", name: "Regency Centers" },
  SPG: { cik: "0001601898", sector: "Retail", name: "Simon Property Group" },
  UDR: { cik: "0000074201", sector: "Residential", name: "UDR" },
  VNO: { cik: "0001035443", sector: "Office", name: "Vornado Realty Trust" },
  WELL: { cik: "0000766396", sector: "Healthcare", name: "Welltower" },
  WPC: { cik: "0001672043", sector: "Industrial", name: "W. P. Carey" },
  WRT: { cik: "0001775139", sector: "Office", name: "W. P. Carey" },
};

const SEC_HEADERS = {
  "User-Agent": "Patrik America Real Estate Dashboard (patrik9207@gmail.com)",
  Accept: "application/json",
  "Accept-Encoding": "gzip, deflate, br",
};
const UPSTREAM_TIMEOUT_MS = 5000;

type ListedCompany = { cik: string; name: string };
type UniverseItem = { symbol: string; cik: string; sector: string; name: string };

async function fetchListedCompanies() {
  try {
    const response = await fetch("https://www.sec.gov/files/company_tickers_exchange.json", {
      headers: SEC_HEADERS,
      next: { revalidate: DATA_CACHE_SECONDS },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) return new Map<string, ListedCompany>();

    const data = await response.json();
    const rows = Array.isArray(data?.data) ? data.data : [];
    const listed = new Map<string, ListedCompany>();

    for (const row of rows) {
      const [cik, name, ticker, exchange] = row;
      if (!ticker || !cik || !["Nasdaq", "NYSE", "NYSE American", "NYSE Arca"].includes(exchange)) continue;
      listed.set(String(ticker).toUpperCase(), { cik: String(cik).padStart(10, "0"), name: String(name) });
    }

    return listed;
  } catch {
    return new Map<string, ListedCompany>();
  }
}

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const ANNUAL_YEARS = [2022, 2023, 2024, 2025, 2026] as const;
type FfoMetricType = "FFO" | "AFFO" | "ESTIMATED" | "ESTIMATED_PARTIAL";
type AnnualFfoValue = { value: number; source: FfoMetricType; filed: string };
type AnnualFactValue = { value: number; filed: string };

const getNumericSeriesFromFact = (fact: unknown) => {
  if (!fact || typeof fact !== "object") return [];

  const units = (fact as { units?: Record<string, unknown> }).units ?? {};
  const values: number[] = [];

  for (const list of Object.values(units)) {
    if (!Array.isArray(list)) continue;

    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      const value = toNumber(entry.val ?? entry.value ?? entry.amount ?? entry.unitValue);
      if (value === null) continue;

      if (value > 0 && value < 1000000000000) {
        values.push(value);
      }
    }
  }

  return values;
};

const readLatestValues = (facts: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const fact = facts[key];
    if (!fact) continue;

    const values = getNumericSeriesFromFact(fact).slice(-5);
    if (values.length) return values;
  }

  return [];
};

const readAnnualFfoSeries = (namespaces: Record<string, Record<string, unknown>>) => {
  const annualValues = new Map<number, AnnualFfoValue>();

  for (const namespaceFacts of Object.values(namespaces)) {
    if (!namespaceFacts || typeof namespaceFacts !== "object") continue;

    for (const [tag, fact] of Object.entries(namespaceFacts)) {
      if (!fact || typeof fact !== "object") continue;

      const factRecord = fact as Record<string, unknown>;
      const description = `${tag} ${String(factRecord.label ?? "")} ${String(factRecord.description ?? "")}`
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ");
      const compactDescription = description.replace(/[^a-z0-9]/g, "");
      const isPerShare = /per(?:basic|diluted)?share/.test(compactDescription);
      const hasFfo = compactDescription.includes("fundsfromoperations") ||
        compactDescription.includes("ffo") || compactDescription.includes("affo");

      if (!isPerShare || !hasFfo) continue;

      const source: FfoMetricType =
        compactDescription.includes("adjustedfundsfromoperations") || compactDescription.includes("affo")
          ? "AFFO"
          : "FFO";

      for (const unitValues of Object.values(factRecord.units ?? {})) {
        if (!Array.isArray(unitValues)) continue;

        for (const item of unitValues) {
          if (!item || typeof item !== "object") continue;
          const itemRecord = item as Record<string, unknown>;
          const value = toNumber(itemRecord.val);
          const start = Date.parse(String(itemRecord.start ?? ""));
          const end = Date.parse(String(itemRecord.end ?? ""));
          if (value === null || Math.abs(value) > 1000 || !Number.isFinite(start) || !Number.isFinite(end)) continue;

          const durationDays = (end - start) / 86400000 + 1;
          if (durationDays < 300 || durationDays > 400) continue;

          const year = new Date(end).getUTCFullYear();
          if (!ANNUAL_YEARS.includes(year as (typeof ANNUAL_YEARS)[number])) continue;

          const form = String(item?.form ?? "");
          if (!/^(10-K|20-F|40-F)(\/A)?$/.test(form) && item?.fp !== "FY") continue;

          const filed = String(item?.filed ?? "");
          const previous = annualValues.get(year);
          const hasPreferredSource = source === "AFFO" && previous?.source !== "AFFO";
          const sameSourceFiledLater = source === previous?.source && filed > previous.filed;

          if (!previous || hasPreferredSource || sameSourceFiledLater) {
            annualValues.set(year, { value, source, filed });
          }
        }
      }
    }
  }

  return ANNUAL_YEARS.map((year) => annualValues.get(year) ?? null);
};

const getFactDescription = (tag: string, fact: Record<string, unknown>) =>
  `${tag} ${String(fact.label ?? "")} ${String(fact.description ?? "")}`
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

const readAnnualFactValue = (
  fact: Record<string, unknown>,
  year: number,
  isTargetUnit: (unit: string) => boolean,
): AnnualFactValue | null => {
  const units = fact.units;
  if (!units || typeof units !== "object") return null;

  let latest: AnnualFactValue | null = null;
  for (const [unit, rawValues] of Object.entries(units)) {
    if (!isTargetUnit(unit) || !Array.isArray(rawValues)) continue;

    for (const rawItem of rawValues) {
      if (!rawItem || typeof rawItem !== "object") continue;
      const item = rawItem as Record<string, unknown>;
      const value = toNumber(item.val);
      const start = Date.parse(String(item.start ?? ""));
      const end = Date.parse(String(item.end ?? ""));
      if (value === null || !Number.isFinite(start) || !Number.isFinite(end)) continue;

      const durationDays = (end - start) / 86400000 + 1;
      if (durationDays < 300 || durationDays > 400 || new Date(end).getUTCFullYear() !== year) continue;

      const form = String(item.form ?? "");
      if (!/^(10-K|20-F|40-F)(\/A)?$/.test(form) && item.fp !== "FY") continue;

      const filed = String(item.filed ?? "");
      if (!latest || filed > latest.filed) latest = { value, filed };
    }
  }

  return latest;
};

const selectAnnualFactValue = (
  namespaces: Record<string, Record<string, unknown>>,
  year: number,
  isTargetUnit: (unit: string) => boolean,
  scoreFact: (tag: string, description: string) => number,
) => {
  let best: (AnnualFactValue & { score: number }) | null = null;

  for (const namespaceFacts of Object.values(namespaces)) {
    if (!namespaceFacts || typeof namespaceFacts !== "object") continue;

    for (const [tag, rawFact] of Object.entries(namespaceFacts)) {
      if (!rawFact || typeof rawFact !== "object") continue;
      const fact = rawFact as Record<string, unknown>;
      const description = getFactDescription(tag, fact);
      const score = scoreFact(tag.toLowerCase(), description);
      if (score <= 0) continue;

      const annualValue = readAnnualFactValue(fact, year, isTargetUnit);
      if (!annualValue) continue;
      if (!best || score > best.score || (score === best.score && annualValue.filed > best.filed)) {
        best = { ...annualValue, score };
      }
    }
  }

  return best;
};

const incomeFactScore = (tag: string, description: string) => {
  const compact = `${tag} ${description}`.replace(/[^a-z0-9]/g, "");
  if (!/(netincomeloss|profitloss)/.test(compact) ||
    /per(?:basic|diluted)?share|earningspershare|noncontrollinginterest|comprehensiveincome/.test(compact)) {
    return 0;
  }

  if (compact.includes("netincomelossavailabletocommonstockholdersdiluted")) return 130;
  if (compact.includes("netincomelossavailabletocommonstockholdersbasic")) return 120;
  if (compact.includes("netincomelossattributabletoparent")) return 110;
  if (compact.includes("netincomeloss")) return 100;
  if (compact.includes("profitloss")) return 80;
  return 0;
};

const depreciationFactScore = (tag: string, description: string) => {
  const compact = `${tag} ${description}`.replace(/[^a-z0-9]/g, "");
  const hasDepreciationAlias = /depreciat|depletion|amortiz|wearandtear/.test(compact);
  if (!hasDepreciationAlias ||
    /accumulated|disposed|sold|impairment|financingcost|debtissuance|debtdiscount|debtpremium/.test(compact)) {
    return 0;
  }

  const isRealEstateSpecific = /realestate|investmentproperty|rentalproperty/.test(compact);
  const isPropertySpecific = /property|building|leasehold/.test(compact);
  if (isRealEstateSpecific && compact.includes("scheduleiii")) return 150;
  if (isRealEstateSpecific) return 140;
  if (isPropertySpecific) return 110;
  if (/depreciationdepletionandamortization|depreciationandamortization/.test(compact)) return 85;
  return 45;
};

const propertySaleGainFactScore = (tag: string, description: string) => {
  const compact = `${tag} ${description}`.replace(/[^a-z0-9]/g, "");
  if (!/(gain|loss)/.test(compact) || !/(sale|disposition)/.test(compact) ||
    !/(realestate|investmentproperty|properties|property)/.test(compact) ||
    /securities|derivative|foreigncurrency|debtinstrument/.test(compact)) {
    return 0;
  }

  if (compact.includes("realestate") || compact.includes("investmentproperty")) return 120;
  if (compact.includes("saleofproperties")) return 110;
  if (compact.includes("propertyplantandequipment")) return 50;
  return 80;
};

const estimateAnnualFfoSeries = (namespaces: Record<string, Record<string, unknown>>) =>
  ANNUAL_YEARS.map((year): AnnualFfoValue | null => {
    const netIncome = selectAnnualFactValue(namespaces, year, (unit) => unit === "USD", incomeFactScore);
    const depreciation = selectAnnualFactValue(namespaces, year, (unit) => unit === "USD", depreciationFactScore);
    const dilutedShares = selectAnnualFactValue(
      namespaces,
      year,
      (unit) => unit.toLowerCase() === "shares",
      (tag) => {
        const compactTag = tag.replace(/[^a-z0-9]/g, "");
        if (!compactTag.includes("weightedaverage") || !compactTag.includes("sharesoutstanding") ||
          !compactTag.includes("diluted") || compactTag.includes("pershare")) {
          return 0;
        }
        return 100;
      },
    );

    if (!netIncome || !depreciation || !dilutedShares || dilutedShares.value <= 0) return null;
    if (depreciation.score < 100 && Math.abs(depreciation.value) < Math.abs(netIncome.value) * 0.1) {
      return null;
    }

    const propertySaleGain = selectAnnualFactValue(
      namespaces,
      year,
      (unit) => unit === "USD",
      propertySaleGainFactScore,
    );
    const estimatedFfoPerShare =
      (netIncome.value + depreciation.value - (propertySaleGain?.value ?? 0)) / dilutedShares.value;
    if (!Number.isFinite(estimatedFfoPerShare)) return null;

    return {
      value: Number(estimatedFfoPerShare.toFixed(2)),
      source: propertySaleGain && depreciation.score >= 110 ? "ESTIMATED" : "ESTIMATED_PARTIAL",
      filed: [netIncome.filed, depreciation.filed, dilutedShares.filed, propertySaleGain?.filed ?? ""].sort().pop() ?? "",
    };
  });

const readLatestValue = (facts: Record<string, unknown>, keys: string[]) => {
  const values = readLatestValues(facts, keys);
  return values.length ? values[values.length - 1] : null;
};

const readLatestOccupancy = (namespaces: Record<string, Record<string, unknown>>) => {
  let latest: { value: number; date: string } | null = null;

  for (const namespaceFacts of Object.values(namespaces)) {
    if (!namespaceFacts || typeof namespaceFacts !== "object") continue;

    for (const [tag, fact] of Object.entries(namespaceFacts)) {
      if (!fact || typeof fact !== "object") continue;

      const factRecord = fact as Record<string, unknown>;
      const description = `${tag} ${String(factRecord.label ?? "")} ${String(factRecord.description ?? "")}`
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .toLowerCase();
      const isOccupancy = /(occupancy|average.*occupancy|occupied|physical.*occupancy|economic.*occupancy|space.*utilization|utilization.*space|percent(?:age)?.*leased|leased.*percent(?:age)?)/.test(description);
      const isVacancy = /(vacancy|vacant|percent(?:age)?.*(?:vacant|unleased)|(?:vacant|unleased).*percent(?:age)?)/.test(description);
      if (!isOccupancy && !isVacancy) continue;

      for (const [unit, values] of Object.entries(factRecord.units ?? {})) {
        if (!Array.isArray(values)) continue;
        if (unit !== "pure" && !unit.includes("%")) continue;

        for (const item of values) {
          if (!item || typeof item !== "object") continue;
          const itemRecord = item as Record<string, unknown>;
          const rawValue = toNumber(itemRecord.val);
          if (rawValue === null || rawValue < 0 || rawValue > 100) continue;

          const percentage = rawValue <= 1 ? rawValue * 100 : rawValue;
          const value = isVacancy ? 100 - percentage : percentage;
          const date = String(itemRecord.filed ?? itemRecord.end ?? "");
          if (!latest || date > latest.date) latest = { value: Number(value.toFixed(1)), date };
        }
      }
    }
  }

  return latest?.value ?? null;
};

const readLatestRatio = (facts: Record<string, unknown>, numeratorKeys: string[], denominatorKeys: string[]) => {
  const numeratorSeries = readLatestValues(facts, numeratorKeys);
  const denominatorSeries = readLatestValues(facts, denominatorKeys);

  if (!numeratorSeries.length || !denominatorSeries.length) return null;

  const numerator = numeratorSeries[numeratorSeries.length - 1];
  const denominator = denominatorSeries[denominatorSeries.length - 1];

  if (!denominator || denominator === 0) return null;

  const ratio = (numerator / denominator) * 100;

  if (ratio < 0 || ratio > 200) return null;

  return Number(ratio.toFixed(1));
};

async function fetchSecFacts(cik: string) {
  return withSecRequestLimit(async () => {
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik.padStart(10, "0")}.json`;

    try {
      const response = await fetch(url, {
        headers: SEC_HEADERS,
        next: { revalidate: DATA_CACHE_SECONDS },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!response.ok) return null;

      const data = await response.json();
      const facts = data?.facts?.["us-gaap"] ?? {};
      const deiFacts = data?.facts?.dei ?? {};

      const reportedFfoSeries = readAnnualFfoSeries(data?.facts ?? {});
      const estimatedFfoSeries = estimateAnnualFfoSeries(data?.facts ?? {});
      const ffoSeries = estimatedFfoSeries.map((estimate, index) => estimate ?? reportedFfoSeries[index]);

      const occupancy = readLatestOccupancy(data?.facts ?? {});

      const yieldSeries = readLatestValues(facts, [
        "DividendYield",
        "AnnualDividendRate",
      ]);

      const dividendAnnualSeries = readLatestValues(facts, [
        "CommonStockDividendsPerShareDeclared",
        "CashDividendsDeclaredPerShare",
        "DividendsPerShare",
      ]);

      const debtToAssets = readLatestRatio(
        facts,
        ["DebtToAssetsRatio", "TotalLiabilities", "LiabilitiesCurrent", "LongTermDebt", "Debt"],
        ["TotalAssets", "AssetsCurrent", "Assets", "TotalAssetsCurrent"],
      );

      const latestYield = yieldSeries.length ? yieldSeries[yieldSeries.length - 1] : null;

      return {
        ffoAnnual: ffoSeries.map((item) => item ? Number(item.value.toFixed(2)) : null),
        ffoTypeAnnual: ffoSeries.map((item) => item?.source ?? null),
        dividendYield: latestYield !== null && latestYield >= 0 && latestYield <= 100 ? Number(latestYield.toFixed(2)) : null,
        dividendAnnual: dividendAnnualSeries.length ? dividendAnnualSeries.slice(-5).map((value) => Number(value.toFixed(2))) : Array(5).fill(null),
        occupancy,
        debtToAssets,
        sharesOutstanding: readLatestValue(deiFacts, ["EntityCommonStockSharesOutstanding"]),
      };
    } catch {
      return null;
    }
  });
}

async function fetchYahooMarket(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5y&interval=1d&events=div`;

  try {
    const response = await fetch(url, {
      next: { revalidate: DATA_CACHE_SECONDS },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const quote = result?.indicators?.quote?.[0];
    const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
    const closePrices = Array.isArray(quote?.close) ? quote.close : [];
    const volumes = Array.isArray(quote?.volume) ? quote.volume : [];
    const recentCutoff = Date.now() / 1000 - 30 * 86400;
    const dailyDollarVolumes = volumes
      .map((volume: unknown, index: number) => {
        const close = toNumber(closePrices[index]);
        const shares = toNumber(volume);
        const timestamp = toNumber(timestamps[index]);
        return close !== null && shares !== null && timestamp !== null && timestamp >= recentCutoff
          ? close * shares
          : null;
      })
      .filter((value: number | null): value is number => value !== null && value >= 0);
    const price = toNumber(meta?.regularMarketPrice);
    const previousClose = toNumber(meta?.chartPreviousClose);
    const dividendEvents = Object.values(result?.events?.dividends ?? {}) as Array<{ amount?: unknown; date?: unknown }>;
    const validDividends = dividendEvents
      .map((event) => ({ amount: toNumber(event.amount), date: toNumber(event.date) }))
      .filter((event): event is { amount: number; date: number } => event.amount !== null && event.date !== null && event.amount > 0);
    const dividendAnnual = ANNUAL_YEARS.map((year) => {
      const annualTotal = validDividends
        .filter((event) => new Date(event.date * 1000).getUTCFullYear() === year)
        .reduce((sum, event) => sum + event.amount, 0);
      return annualTotal > 0 ? Number(annualTotal.toFixed(2)) : null;
    });
    const trailingCutoff = Date.now() / 1000 - 365 * 86400;
    const trailingDividends = validDividends
      .filter((event) => event.date >= trailingCutoff)
      .reduce((sum, event) => sum + event.amount, 0);
    const dividendYield = price !== null && price > 0 && trailingDividends > 0
      ? Number(((trailingDividends / price) * 100).toFixed(2))
      : null;
    const change = price !== null && previousClose !== null ? Number((((price - previousClose) / previousClose) * 100).toFixed(2)) : null;
    const liquidityAverage = dailyDollarVolumes.length
      ? Number((dailyDollarVolumes.reduce((sum: number, value: number) => sum + value, 0) / dailyDollarVolumes.length).toFixed(0))
      : null;

    return { price, change, liquidityAverage, dividendYield, dividendAnnual };
  } catch {
    return null;
  }
}

async function fetchNasdaqMarketCap(symbol: string) {
  const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/summary?assetclass=stocks`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 AmericaRealEstateDashboard",
        Accept: "application/json, text/plain, */*",
        Origin: "https://www.nasdaq.com",
        Referer: "https://www.nasdaq.com/",
      },
      next: { revalidate: DATA_CACHE_SECONDS },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const rawMarketCap = data?.data?.summaryData?.MarketCap?.value;
    const marketCap = toNumber(typeof rawMarketCap === "string" ? rawMarketCap.replace(/[,$]/g, "") : rawMarketCap);

    return marketCap !== null && marketCap > 0 ? marketCap : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const listedCompanies = await fetchListedCompanies();
  const universe = REIT_SYMBOLS.map((symbol): UniverseItem => {
    const configured = REITS[symbol as keyof typeof REITS];
    const listed = listedCompanies.get(symbol);

    return {
      symbol,
      cik: listed?.cik ?? configured?.cik ?? "",
      sector: configured?.sector ?? "N/D",
      name: configured?.name ?? listed?.name ?? symbol,
    };
  });

  if (new URL(request.url).searchParams.get("fundamentals") === "1") {
    const fundamentals = await Promise.all(
      universe.map(async ({ symbol, cik }) => {
        const secFacts = cik ? await fetchSecFacts(cik) : null;

        return {
          symbol,
          occupancy: secFacts?.occupancy ?? null,
          debtToAssets: secFacts?.debtToAssets ?? null,
          ffoAnnual: secFacts?.ffoAnnual ?? Array(5).fill(null),
          ffoTypeAnnual: secFacts?.ffoTypeAnnual ?? Array(5).fill(null),
        };
      }),
    );

    return NextResponse.json(fundamentals);
  }

  const rows = await Promise.all(
    universe.map(async ({ symbol, sector, name }) => {
      const [market, nasdaqMarketCap] = await Promise.all([
        fetchYahooMarket(symbol),
        fetchNasdaqMarketCap(symbol),
      ]);

      return {
        symbol,
        name,
        sector,
        price: market?.price ?? null,
        marketValue: nasdaqMarketCap,
        liquidityAverage: market?.liquidityAverage ?? null,
        dividendYield: market?.dividendYield ?? null,
        dividendAnnual: market?.dividendAnnual ?? Array(5).fill(null),
        occupancy: null,
        debtToAssets: null,
        change: market?.change ?? null,
        ffoAnnual: Array(5).fill(null),
        ffoTypeAnnual: Array(5).fill(null),
        ffoLatest: null,
      };
    }),
  );

  return NextResponse.json(rows);
}
