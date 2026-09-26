import {
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Filter,
  MapPinned,
  TrendingUp,
} from "lucide-react";

const reitSymbols = [
  "AAT", "ABR", "ADC", "AIV", "AJR", "AMT", "APLE", "APTS", "ARE", "ARI",
  "AVB", "BDN", "BHR", "BIP", "BRE", "BXP", "CPT", "CTRE", "CXW", "DEI",
  "DLR", "DOC", "EPR", "EQIX", "ESS", "EXR", "FRT", "GEO", "GLPI", "GNL",
  "GPC", "HASI", "HCP", "HST", "HTA", "IIPR", "IRM", "KIM", "KRC", "LAMR",
  "LADR", "LTC", "LXP", "MAA", "MFA", "MGP", "MITT", "MPW", "MRT", "NNN",
  "NHI", "O", "OHI", "PEI", "PLD", "PSA", "PVD", "RAI", "RCI", "REG",
  "RHP", "ROIC", "SUI", "TRNO", "TSI", "UMH", "VNO", "VTR", "WELL", "WPC",
  "WRB", "XAN", "XHR", "YELP", "A", "ACC", "ALX", "AMH", "AWH", "BFS",
  "BRX", "BXP", "CBO", "CIM", "CIR", "CUBE", "DKL", "DNO", "DRH", "EFC",
  "ELM", "ESI", "FF", "FOA", "FR", "GATX", "GME", "HPP", "HPT", "HUBB",
  "INTC", "JLL", "KRG", "LII", "LOV", "MHC", "MNR", "NSA", "NWN", "NWS",
  "PK", "PLY", "PNE", "RDF", "RWT", "SBS", "SMG", "SPG", "SRC", "STOR",
  "TCO", "TWO", "UDR", "VICI", "WRI", "WTS", "XL", "Y", "ZBH"
];

const sectorPool = [
  "Residential",
  "Industrial",
  "Retail",
  "Healthcare",
  "Office",
  "Self-storage",
  "Data centers",
  "Diversified",
];

const reitData = reitSymbols.map((symbol, index) => {
  const baseFfo = 2.2 + (index % 10) * 0.45 + (index % 4) * 0.18;

  return {
    symbol,
    sector: sectorPool[index % sectorPool.length],
    price: (28 + ((index * 7) % 120)).toFixed(2),
    dividend: (3 + ((index * 13) % 7) / 10).toFixed(2),
    occupancy: 86 + ((index * 17) % 13),
    change: ((index % 9) - 4) / 2,
    ffoAnnual: [
      (baseFfo - 0.5).toFixed(2),
      (baseFfo - 0.28).toFixed(2),
      (baseFfo - 0.11).toFixed(2),
      (baseFfo + 0.09).toFixed(2),
      (baseFfo + 0.22).toFixed(2),
    ],
  };
});

const stats = [
  { label: "REITs listados", value: `${reitData.length}`, icon: Building2, delta: "+12.4%" },
  { label: "Yield médio", value: "4.6%", icon: TrendingUp, delta: "+0.3%" },
  { label: "Valor do portfólio", value: "$1.48T", icon: CircleDollarSign, delta: "+7.9%" },
  { label: "Ocupação média", value: "94.1%", icon: MapPinned, delta: "+1.2%" },
];

function Page() {
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

          <button className="inline-flex items-center gap-2 rounded-full border border-[rgba(197,243,107,0.38)] bg-[rgba(197,243,107,0.08)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c5f36b]">
            Exportar
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </header>

        <section id="estatisticas" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, delta, icon: Icon }) => (
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
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="eyebrow mb-1">Listagem de REITs</div>
              <h1 className="text-2xl font-semibold text-[#f5f7f2] md:text-3xl">
                Ações do setor imobiliário americano
              </h1>
            </div>

            <div id="filtros" className="flex items-center gap-2 rounded-full border border-[#2b3027] bg-[#121810] px-3 py-2 text-sm text-[#dfe4d9]">
              <Filter className="h-4 w-4 text-[#c5f36b]" />
              Filtro por setor
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left">
              <thead>
                <tr className="text-xs uppercase tracking-[0.14em] text-[#92978f]">
                  <th className="pb-2 pl-3 pr-4 font-medium">Ticker</th>
                  <th className="pb-2 px-4 font-medium">Setor</th>
                  <th className="pb-2 px-4 font-medium">Preço</th>
                  <th className="pb-2 px-4 font-medium">Dividend yield</th>
                  <th className="pb-2 px-4 font-medium">Ocupação</th>
                  <th className="pb-2 px-4 font-medium">FFO / Ação</th>
                  <th className="pb-2 px-4 font-medium">1M</th>
                </tr>
              </thead>
              <tbody>
                {reitData.map((reit) => (
                  <tr key={reit.symbol} className="rounded-2xl border border-[#2b3027] bg-[#121810] text-sm text-[#dfe4d9]">
                    <td className="rounded-l-2xl border-y border-l border-[#2b3027] px-3 py-3 font-semibold text-[#f5f7f2]">
                      {reit.symbol}
                    </td>
                    <td className="border-y border-[#2b3027] px-4 py-3">{reit.sector}</td>
                    <td className="border-y border-[#2b3027] px-4 py-3">${reit.price}</td>
                    <td className="border-y border-[#2b3027] px-4 py-3 text-[#c5f36b]">{reit.dividend}%</td>
                    <td className="border-y border-[#2b3027] px-4 py-3">{reit.occupancy}%</td>
                    <td className="border-y border-[#2b3027] px-4 py-3">
                      <div className="flex flex-col gap-1 text-[11px] text-[#dfe4d9]">
                        {reit.ffoAnnual.map((value, index) => (
                          <span key={`${reit.symbol}-ffo-${index}`} className="flex items-center justify-between gap-2">
                            <span className="text-[#92978f]">{2022 + index}</span>
                            <span className="font-medium text-[#f5f7f2]">${value}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="rounded-r-2xl border-y border-r border-[#2b3027] px-4 py-3">
                      <span
                        className={
                          reit.change >= 0
                            ? "inline-flex items-center gap-1 text-[#9adf69]"
                            : "inline-flex items-center gap-1 text-[#ff8b72]"
                        }
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {reit.change >= 0 ? "+" : ""}
                        {reit.change.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Page;
