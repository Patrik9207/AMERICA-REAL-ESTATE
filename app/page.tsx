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
  ffoTypeAnnual?: Array<string | null>;
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

function ffoSourceLabel(source: string | null | undefined) {
  if (source === "ESTIMATED") return "Estimativa SEC com D&A imobiliário e ajuste por ganhos de venda identificados";
  if (source === "ESTIMATED_PARTIAL") return "Estimativa SEC parcial: D&A agregado ou ganhos de venda não identificados";
  if (source === "AFFO") return "AFFO reportado pela empresa (usado como fallback)";
  if (source === "FFO") return "FFO reportado pela empresa (usado como fallback)";
  return "Estimativa não disponível";
}

const annualYears = [2022, 2023, 2024, 2025, 2026];

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
  const [rows, setRows] = useState<ReitRow[]>([]);
  const [selectedSector, setSelectedSector] = useState("Todos");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        setRows(marketRows);
        setLoadError(null);
      } catch {
        setRows([]);
        setLoadError("Não foi possível carregar os dados de mercado. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }

      try {
        const fundamentalsResponse = await fetch("/api/reits?fundamentals=1");
        if (!fundamentalsResponse.ok) return;

        const fundamentalsRows: Array<Pick<ReitRow, "symbol" | "occupancy" | "debtToAssets" | "ffoAnnual" | "ffoTypeAnnual">> =
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
        row[`FFO/Ação est. ${year}`] = reit.ffoAnnual[year - 2022] ?? null;
        row[`Fonte FFO/Ação ${year}`] = ffoSourceLabel(reit.ffoTypeAnnual?.[year - 2022]);
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
          ) : loadError ? (
            <div className="py-10 text-center text-sm text-[#f0a39b]" role="alert">{loadError}</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#a0a79d]">Nenhum REIT disponível no momento.</div>
          ) : (
            <>
              <p className="mb-3 text-xs leading-relaxed text-[#92978f]">
                FFO/Ação estimado com dados SEC: lucro líquido + depreciação/amortização − ganhos identificados na venda de imóveis, dividido pela média anual de ações diluídas. Quando a SEC não fornece depreciação imobiliária específica ou ganho de venda identificável, o valor é marcado como estimativa parcial. FFO/AFFO reportado pela empresa é usado somente se faltarem componentes para o cálculo.
              </p>
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
                          FFO/Ação est. {year}
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
                            <span title={ffoSourceLabel(reit.ffoTypeAnnual?.[year - 2022])}>
                              {value === null || value === undefined ? "N/D" : `$${value.toFixed(2)}`}
                            </span>
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
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default Page;
