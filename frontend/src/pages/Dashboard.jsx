import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useOverview, usePriceDist, useTopMakes, useSavings } from "../hooks/useStats";
import { StatCard, Card, Section, Spinner, Empty, Badge } from "../components/UI";

const fmtUSD = n => n != null ? `$${Math.round(n).toLocaleString()}` : "—";
const fmtKES = n => n != null ? `KES ${Math.round(n).toLocaleString()}` : "—";
const fmtN   = n => n != null ? Number(n).toLocaleString() : "—";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{payload[0].payload.band}</strong>
      <span>{payload[0].value.toLocaleString()} listings</span>
    </div>
  );
};

export default function Dashboard() {
  const { data: ov } = useOverview();
  const { data: dist, isLoading: l2 } = usePriceDist();
  const { data: makes, isLoading: l3 } = useTopMakes();
  const { data: sav, isLoading: l4 } = useSavings();

  const CHART_COLORS = ["#15616d","#1a7a89","#0e4850","#ff7d00","#ff9633","#78290f","#ffecd1"];

  return (
    <div className="dashboard">
      <h2 className="sr-only">Japan to Kenya car import dashboard overview</h2>

      <div className="stat-grid">
        <StatCard label="Import listings"     value={fmtN(ov?.bf_count)}      sub="stats · cleaned"   accent="teal"   icon="ti-car" />
        <StatCard label="Avg Japan price"     value={fmtUSD(ov?.bf_avg_usd)}  sub=""       accent="orange" icon="ti-coin" />
        <StatCard label="Avg local price"     value={fmtKES(ov?.local_avg_kes)} sub="Kenya market"         accent="navy"   icon="ti-building-store" />
        <StatCard label="Makes available"     value={fmtN(ov?.unique_makes)}  sub={`${fmtN(ov?.unique_models)} models`} accent="teal" icon="ti-components" />
      </div>

      <div className="charts-row">
        <Section title="Price distribution" sub="Import listings by price band (USD)">
          <Card className="chart-card">
            {l2 ? <Spinner /> : !dist?.length ? <Empty message="No price data yet" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dist} barCategoryGap="25%">
                  <XAxis dataKey="band" tick={{ fontSize: 11, fill: "#7a8f99" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#7a8f99" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(21,97,109,0.06)" }} />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                    {dist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Section>

        <Section title="Top makes" sub="By listing volume">
          <Card style={{ padding: "16px 20px" }}>
            {l3 ? <Spinner /> : !makes?.length ? <Empty message="No data" /> : (
              <div className="makes-list">
                {makes.slice(0, 8).map((m, i) => {
                  const maxN = makes[0].count;
                  const pct  = Math.round((m.count / maxN) * 100);
                  return (
                    <div key={m.make} className="make-row">
                      <span className="make-rank">{i + 1}</span>
                      <div className="make-info">
                        <div className="make-top">
                          <span className="make-name">{m.make}</span>
                          <span className="make-price">avg {fmtUSD(m.avg_price_usd)}</span>
                        </div>
                        <div className="make-bar-wrap">
                          <div className="make-bar" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="make-count">{m.count.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Section>
      </div>

      <Section title="Import savings vs local market" sub="Median import landed cost compared to Peach Cars local price">
        {l4 ? <Spinner /> : !sav?.length ? (
          <Empty
            icon="ti-arrows-diff"
            message="No overlap data yet"
            sub="Need matching make/model/year in both BE FORWARD and Peach Cars"
          />
        ) : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table className="savings-table">
              <thead>
                <tr>
                  {["Make","Model","Year","Landed KES","Local KES","Saving","Verdict"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sav.slice(0, 12).map((r, i) => (
                  <tr key={i}>
                    <td><strong>{r.make}</strong></td>
                    <td>{r.model}</td>
                    <td>{r.year}</td>
                    <td>{fmtKES(r.total_landed_kes)}</td>
                    <td>{fmtKES(r.median_local_kes)}</td>
                    <td className={r.saving_kes > 0 ? "saving-pos" : "saving-neg"}>
                      {r.saving_kes > 0 ? "+" : ""}{fmtKES(r.saving_kes)}
                      <span className="saving-pct"> ({r.saving_pct}%)</span>
                    </td>
                    <td>
                      <Badge variant={r.verdict === "import" ? "teal" : "rust"}>
                        {r.verdict === "import" ? "Import" : "Buy local"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Section>
    </div>
  );
}
