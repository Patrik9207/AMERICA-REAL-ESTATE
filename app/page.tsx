"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Filter,
  MapPinned,
  TrendingUp,
} from "lucide-react";

type ReitRow = {
  symbol: string;
  name: string;
  sector: string;
  price: number | null;
  marketValue: number | null;
  liquidityAverage: number | null;
  dividendYield: number | null;
  dividendAnnual: Array<number | null>;
  occupancy: number | null;
  debtToAssets: number | null;
  change: number | null;
  ffoAnnual: Array<number | null>;
  ffoLatest: number | null;
};

function formatMetric(value: number | null, suffix = "") {
  if (value === null || Number.isNaN(value)) return "N/D";
  return `${value.toFixed(2)}${suffix}`;
}

function averageMetric(values: Array<number | null>) {
  const available = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!available.length) return null;
  return available.reduce((sum, value) => sum + value, 0) / available.length;
}

const annualYears = [2022, 2023, 2024, 2025, 2026];

const spreadsheetRows: ReitRow[] = [
  {
    symbol: "VICI",
    name: "Vici Properties",
    sector: "Entertainment",
    price: 23.73,
    marketValue: 22003000000,
    liquidityAverage: 2940000,
    dividendYield: 6.38,
    dividendAnnual: [0.61, 0.68, 0.74, 0.78, 0.82],
    occupancy: 92.4,
    debtToAssets: 41.5,
    change: 1.18,
    ffoAnnual: [1.17, 1.29, 1.34, 1.4, 1.46],
    ffoLatest: 1.46,
  },
  {
    symbol: "AAT",
    name: "American Assets Trust",
    sector: "Office",
    price: 11.31,
    marketValue: 1890000000,
    liquidityAverage: 740000,
    dividendYield: 6.33,
    dividendAnnual: [0.62, 0.72, 0.75, 0.79, 0.83],
    occupancy: 89.3,
    debtToAssets: 37.8,
    change: 0.82,
    ffoAnnual: [0.72, 0.79, 0.84, 0.9, 0.96],
    ffoLatest: 0.96,
  },
  {
    symbol: "CUBE",
    name: "CubeSmart",
    sector: "Self Storage",
    price: 54.13,
    marketValue: 14800000000,
    liquidityAverage: 2230000,
    dividendYield: 3.74,
    dividendAnnual: [1.41, 1.49, 1.57, 1.7, 1.75],
    occupancy: 94.8,
    debtToAssets: 33.6,
    change: 1.24,
    ffoAnnual: [2.41, 2.54, 2.66, 2.81, 2.93],
    ffoLatest: 2.93,
  },
  {
    symbol: "KIM",
    name: "Kimco Realty",
    sector: "Retail",
    price: 20.85,
    marketValue: 13600000000,
    liquidityAverage: 2800000,
    dividendYield: 4.65,
    dividendAnnual: [0.98, 1.06, 1.13, 1.19, 1.25],
    occupancy: 92.2,
    debtToAssets: 38.9,
    change: 0.98,
    ffoAnnual: [1.08, 1.18, 1.26, 1.34, 1.4],
    ffoLatest: 1.4,
  },
  {
    symbol: "SPG",
    name: "Simon Property Group",
    sector: "Retail",
    price: 154.2,
    marketValue: 47600000000,
    liquidityAverage: 1340000,
    dividendYield: 4.85,
    dividendAnnual: [7.6, 8.1, 8.4, 8.8, 9.2],
    occupancy: 95.4,
    debtToAssets: 34.7,
    change: 1.47,
    ffoAnnual: [7.6, 7.9, 8.2, 8.5, 8.8],
    ffoLatest: 8.8,
  },
  {
    symbol: "NNN",
    name: "NNN REIT",
    sector: "Retail",
    price: 41.26,
    marketValue: 9230000000,
    liquidityAverage: 1100000,
    dividendYield: 5.48,
    dividendAnnual: [2.1, 2.21, 2.28, 2.38, 2.5],
    occupancy: 94.5,
    debtToAssets: 31.2,
    change: 0.76,
    ffoAnnual: [2.12, 2.25, 2.33, 2.42, 2.49],
    ffoLatest: 2.49,
  },
  {
    symbol: "O",
    name: "Realty Income",
    sector: "Diversified",
    price: 59.9,
    marketValue: 48100000000,
    liquidityAverage: 2600000,
    dividendYield: 5.69,
    dividendAnnual: [2.39, 2.52, 2.66, 2.78, 2.9],
    occupancy: 91.7,
    debtToAssets: 42.2,
    change: 0.62,
    ffoAnnual: [1.87, 2.05, 2.11, 2.17, 2.23],
    ffoLatest: 2.23,
  },
  {
    symbol: "PLD",
    name: "Prologis",
    sector: "Industrial",
    price: 110.41,
    marketValue: 106000000000,
    liquidityAverage: 3280000,
    dividendYield: 3.15,
    dividendAnnual: [3.4, 3.56, 3.72, 3.9, 4.08],
    occupancy: 96.4,
    debtToAssets: 35.2,
    change: 1.38,
    ffoAnnual: [4.53, 4.86, 5.12, 5.38, 5.6],
    ffoLatest: 5.6,
  },
  {
    symbol: "EQIX",
    name: "Equinix",
    sector: "Data Centers",
    price: 787.12,
    marketValue: 77400000000,
    liquidityAverage: 480000,
    dividendYield: 1.84,
    dividendAnnual: [9.4, 10.2, 11.1, 12.1, 12.8],
    occupancy: 94.1,
    debtToAssets: 28.3,
    change: 1.4,
    ffoAnnual: [12.8, 13.7, 14.6, 15.2, 15.9],
    ffoLatest: 15.9,
  },
  {
    symbol: "WELL",
    name: "Welltower",
    sector: "Healthcare",
    price: 121.5,
    marketValue: 86100000000,
    liquidityAverage: 1700000,
    dividendYield: 0.92,
    dividendAnnual: [2.02, 2.09, 2.2, 2.37, 2.52],
    occupancy: 91.9,
    debtToAssets: 47.2,
    change: 0.55,
    ffoAnnual: [3.1, 3.24, 3.38, 3.52, 3.68],
    ffoLatest: 3.68,
  },
  {
    symbol: "MAA",
    name: "Mid-America Apartment",
    sector: "Residential",
    price: 164.5,
    marketValue: 18800000000,
    liquidityAverage: 760000,
    dividendYield: 3.82,
    dividendAnnual: [5.2, 5.48, 5.9, 6.22, 6.42],
    occupancy: 95.8,
    debtToAssets: 39.5,
    change: 0.92,
    ffoAnnual: [5.8, 6.04, 6.31, 6.7, 7.1],
    ffoLatest: 7.1,
  },
  {
    symbol: "REG",
    name: "Regency Centers",
    sector: "Retail",
    price: 63.19,
    marketValue: 12600000000,
    liquidityAverage: 880000,
    dividendYield: 4.2,
    dividendAnnual: [2.38, 2.52, 2.66, 2.84, 3.02],
    occupancy: 94.4,
    debtToAssets: 35.9,
    change: 0.54,
    ffoAnnual: [2.02, 2.18, 2.34, 2.47, 2.62],
    ffoLatest: 2.62,
  },
  {
    symbol: "AMT",
    name: "American Tower",
    sector: "Cell Towers",
    price: 205.9,
    marketValue: 95500000000,
    liquidityAverage: 1220000,
    dividendYield: 2.56,
    dividendAnnual: [6.5, 7.14, 7.72, 8.15, 8.68],
    occupancy: 92.6,
    debtToAssets: 44.7,
    change: 0.66,
    ffoAnnual: [7.42, 8.03, 8.6, 9.2, 9.78],
    ffoLatest: 9.78,
  },
];

type SortKey =
  | "symbol"
  | "sector"
  | "price"
  | "marketValue"
  | "liquidityAverage"
  | "dividendYield"
  | "occupancy"
  | "debtToAssets"
  | "change"
  | `ffo-${number}`
  | `div-${number}`;
type SortDirection = "asc" | "desc";

function Page() {
  const [rows, setRows] = useState<ReitRow[]>(spreadsheetRows);
  const [selectedSector, setSelectedSector] = useState("Todos");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [loading] = useState(false);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/reits");
        if (!response.ok) throw new Error("Não foi possível carregar os dados de mercado.");

        const marketRows: ReitRow[] = await response.json();
        const mergedRows = [...spreadsheetRows];

        marketRows.forEach((marketRow) => {
          const existingIndex = mergedRows.findIndex((item) => item.symbol === marketRow.symbol);
          if (existingIndex >= 0) {
            mergedRows[existingIndex] = { ...mergedRows[existingIndex], ...marketRow };
            return;
          }

          mergedRows.push(marketRow);
        });

        setRows(mergedRows);
      } catch {
        setRows(spreadsheetRows);
      }

      try {
        const fundamentalsResponse = await fetch("/api/reits?fundamentals=1");
        if (!fundamentalsResponse.ok) return;

        const fundamentalsRows: Array<Pick<ReitRow, "symbol" | "occupancy" | "debtToAssets" | "ffoAnnual">> =
          await fundamentalsResponse.json();
        const fundamentalsBySymbol = new Map<string, Partial<ReitRow>>();

        fundamentalsRows.forEach((item) => fundamentalsBySymbol.set(item.symbol, item));
        setRows((currentRows) =>
          currentRows.map((item) => ({
            ...item,
            ...(fundamentalsBySymbol.get(item.symbol) ?? {}),
          })),
        );
      } catch {
        // Keep the live market data and spreadsheets if fundamentals are unavailable.
      }
    };

    load();
  }, []);

  const sectors = ["Todos", ...Array.from(new Set(rows.map((item) => item.sector).filter(Boolean)))];

  const visibleReits = useMemo(() => {
    const filtered =
      selectedSector === "Todos" ? [...rows] : rows.filter((item) => item.sector === selectedSector);

    return [...filtered].sort((a, b) => {
      const getValue = (row: ReitRow): number | string | null => {
        if (sortKey === "symbol" || sortKey === "sector") return row[sortKey];
        if (sortKey === "price" || sortKey === "marketValue" || sortKey === "liquidityAverage" || sortKey === "dividendYield" || sortKey === "occupancy" || sortKey === "debtToAssets" || sortKey === "change") {
          return row[sortKey];
        }
        if (sortKey.startsWith("ffo-")) return row.ffoAnnual[Number(sortKey.slice(4))] ?? null;
        return row.dividendAnnual[Number(sortKey.slice(4))] ?? null;
      };

      const left = getValue(a);
      const right = getValue(b);
      let result = 0;

      if (left === null && right !== null) result = 1;
      else if (left !== null && right === null) result = -1;
      else if (typeof left === "string" && typeof right === "string") result = left.localeCompare(right);
      else result = Number(left ?? 0) - Number(right ?? 0);

      return sortDirection === "asc" ? result : -result;
    });
  }, [rows, selectedSector, sortDirection, sortKey]);

  const averageYield = averageMetric(rows.map((item) => item.dividendYield));
  const averageLiquidity = averageMetric(rows.map((item) => item.liquidityAverage));
  const averageOccupancy = averageMetric(rows.map((item) => item.occupancy));

  const formatCurrencyMetric = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return "N/D";
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  const statValues = [
    { label: "REITs listados", value: `${rows.length}`, icon: Building2, delta: rows.length ? "+" : "—" },
    { label: "Yield médio", value: formatMetric(averageYield, "%"), icon: TrendingUp, delta: "—" },
    { label: "Liquidez média", value: formatCurrencyMetric(averageLiquidity), icon: CircleDollarSign, delta: "—" },
    { label: "Ocupação média", value: formatMetric(averageOccupancy, "%"), icon: MapPinned, delta: "—" },
  ];

  const exportToExcel = () => {
    if (!rows.length) return;

    const exportRows = rows.map((reit) => {
      const row: Record<string, number | string | null> = {
        Ticker: reit.symbol,
        Setor: reit.sector || "N/D",
        Preço: reit.price ?? null,
        "Valor de mercado": reit.marketValue ?? null,
        "Liquidez média/dia": reit.liquidityAverage ?? null,
        "Dividend yield": reit.dividendYield ?? null,
        Ocupação: reit.occupancy ?? null,
        "Dívida/Ativo": reit.debtToAssets ?? null,
      };

      annualYears.forEach((year) => {
        row[`FFO/Ação ${year}`] = reit.ffoAnnual[year - 2022] ?? null;
        row[`Dividendos/Ação ${year}`] = reit.dividendAnnual[year - 2022] ?? null;
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "REITs");
    XLSX.writeFile(workbook, "america-real-estate-reits.xlsx");
  };

  return (
    <main className="page-shell py-6 md:py-8">
      <div className="reveal">
        <header className="panel mb-6 flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(197,243,107,0.12)] text-[#c5f36b]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#92978f]">America</div>
              <div className="text-base font-semibold text-[#f0f2ec]">Real Estate</div>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm text-[#dfe4d9] md:flex">
            <a href="#lista">Lista</a>
            <a href="#estatisticas">Estatísticas</a>
            <a href="#filtros">Filtros</a>
          </div>

          <button
            type="button"
            onClick={exportToExcel}
            disabled={!rows.length}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(197,243,107,0.38)] bg-[rgba(197,243,107,0.08)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c5f36b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Exportar
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </header>

        <section id="estatisticas" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statValues.map(({ label, value, delta, icon: Icon }) => (
            <div key={label} className="panel p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="eyebrow">{label}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgba(197,243,107,0.08)] text-[#c5f36b]">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-[#f5f7f2]">{value}</div>
              <div className="mt-1 flex items-center gap-1 text-sm text-[#9adf69]">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {delta}
              </div>
            </div>
          ))}
        </section>

        <section id="lista" className="panel p-4 md:p-5">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="eyebrow mb-1">Listagem de REITs</div>
              <h1 className="text-2xl font-semibold text-[#f5f7f2] md:text-3xl">
                Ações do setor imobiliário americano
              </h1>
            </div>

            <div id="filtros" className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-full border border-[#2b3027] bg-[#121810] px-3 py-2 text-sm text-[#dfe4d9]">
                <Filter className="h-4 w-4 text-[#c5f36b]" />
                <span>Setor</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {sectors.map((sector) => (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => setSelectedSector(sector)}
                    className={
                      sector === selectedSector
                        ? "rounded-full border border-[#c5f36b] bg-[rgba(197,243,107,0.12)] px-3 py-1.5 text-xs font-medium text-[#c5f36b]"
                        : "rounded-full border border-[#2b3027] bg-[#121810] px-3 py-1.5 text-xs text-[#dfe4d9]"
                    }
                  >
                    {sector}
                  </button>
                ))}
              </div>

            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-[#a0a79d]">Carregando dados públicos...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.14em] text-[#92978f]">
                    {(["symbol", "sector", "price", "marketValue", "liquidityAverage", "dividendYield", "occupancy", "debtToAssets"] as SortKey[]).map((key, index) => {
                      const labels = ["Ticker", "Setor", "Preço", "Valor de mercado", "Liquidez média/dia", "Dividend yield", "Ocupação", "Dívida/Ativo"];

                      return (
                        <th key={key} className={`${index === 0 ? "pl-3 pr-4" : "px-4"} pb-2 font-medium`}>
                          <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 whitespace-nowrap">
                            {labels[index]}
                            <span aria-hidden="true">{sortKey === key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                          </button>
                        </th>
                      );
                    })}
                    {annualYears.map((year) => (
                      <th key={year} className="pb-2 px-3 font-medium">
                        <button type="button" onClick={() => toggleSort(`ffo-${year - 2022}`)} className="inline-flex items-center gap-1 whitespace-nowrap">
                          FFO/Ação {year}
                          <span aria-hidden="true">{sortKey === `ffo-${year - 2022}` ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                        </button>
                      </th>
                    ))}
                    {annualYears.map((year) => (
                      <th key={`div-${year}`} className="pb-2 px-3 font-medium">
                        <button type="button" onClick={() => toggleSort(`div-${year - 2022}`)} className="inline-flex items-center gap-1 whitespace-nowrap">
                          Dividendos/Ação {year}
                          <span aria-hidden="true">{sortKey === `div-${year - 2022}` ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleReits.map((reit) => (
                    <tr key={reit.symbol} className="rounded-2xl border border-[#2b3027] bg-[#121810] text-sm text-[#dfe4d9]">
                      <td className="rounded-l-2xl border-y border-l border-[#2b3027] px-3 py-3 font-semibold text-[#f5f7f2]">
                        {reit.symbol}
                      </td>
                      <td className="border-y border-[#2b3027] px-4 py-3">{reit.sector || "N/D"}</td>
                      <td className="border-y border-[#2b3027] px-4 py-3">{reit.price === null ? "N/D" : `$${reit.price.toFixed(2)}`}</td>
                      <td className="border-y border-[#2b3027] px-4 py-3">{reit.marketValue === null ? "N/D" : `$${reit.marketValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}</td>
                      <td className="border-y border-[#2b3027] px-4 py-3">{reit.liquidityAverage === null ? "N/D" : `$${reit.liquidityAverage.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}</td>
                      <td className="border-y border-[#2b3027] px-4 py-3 text-[#c5f36b]">{reit.dividendYield === null ? "N/D" : `${reit.dividendYield.toFixed(2)}%`}</td>
                      <td className="border-y border-[#2b3027] px-4 py-3">{reit.occupancy === null ? "N/D" : `${reit.occupancy.toFixed(1)}%`}</td>
                      <td className="border-y border-[#2b3027] px-4 py-3">{reit.debtToAssets === null ? "N/D" : `${reit.debtToAssets.toFixed(1)}%`}</td>
                      {annualYears.map((year) => {
                        const value = reit.ffoAnnual[year - 2022];

                        return (
                          <td key={`${reit.symbol}-${year}`} className="border-y border-[#2b3027] px-3 py-3 text-center">
                            {value === null || value === undefined ? "N/D" : `$${value.toFixed(2)}`}
                          </td>
                        );
                      })}
                      {annualYears.map((year) => {
                        const value = reit.dividendAnnual[year - 2022];

                        return (
                          <td key={`${reit.symbol}-div-${year}`} className={`${year === 2026 ? "rounded-r-2xl border-r " : ""}border-y border-[#2b3027] px-3 py-3 text-center`}>
                            {value === null || value === undefined ? "N/D" : `$${value.toFixed(2)}`}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Page;
