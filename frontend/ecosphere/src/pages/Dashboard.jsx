import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { BarChart3, CheckCircle2, AlertTriangle, FileText, Zap, Plus, PlayCircle, FileBarChart } from 'lucide-react';
import KpiCard from '../components/common/KpiCard';
import useFadeInUp from '../hooks/useFadeInUp';
import { scores, emissionsTrend, deptRanking, recentActivity } from '../data/mockData';
import '../components/layout/layout.css';

const activityIcon = {
  success: <CheckCircle2 size={15} color="var(--success)" />,
  warning: <AlertTriangle size={15} color="var(--warning)" />,
  neutral: <FileText size={15} color="var(--text-secondary)" />,
  plum: <FileText size={15} color="var(--plum-light)" />,
};

export default function Dashboard() {
  const gridRef = useFadeInUp([]);
  const maxDept = Math.max(...deptRanking.map((d) => d.score));

  return (
    <div>
      <div ref={gridRef} className="grid-4" style={{ marginBottom: 20 }}>
        <KpiCard label="Environmental Score" value={scores.environmental} accent="var(--env-green)" />
        <KpiCard label="Social Score" value={scores.social} accent="var(--social-teal)" />
        <KpiCard label="Governance Score" value={scores.governance} accent="var(--gov-plum)" />
        <KpiCard label="Overall ESG Score" value={scores.overall} accent="var(--teal)" />
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="panel">
          <div className="panel__title">
            <BarChart3 size={16} color="var(--env-green)" />
            Emissions Trend (12 mo)
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={emissionsTrend} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  stroke="var(--text-tertiary)"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--env-green)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--env-green)' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">
            <BarChart3 size={16} color="var(--teal)" />
            Department ESG Ranking
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 200, padding: '0 8px' }}>
            {deptRanking.map((d) => (
              <div key={d.dept} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    height: `${(d.score / maxDept) * 150}px`,
                    background: 'linear-gradient(180deg, var(--teal), #024f52)',
                    borderRadius: '6px 6px 3px 3px',
                    marginBottom: 8,
                  }}
                />
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.dept}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel__title">
            <FileText size={16} color="var(--plum-light)" />
            Recent Activity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentActivity.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                {activityIcon[a.type]}
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">
            <Zap size={16} color="var(--gamify-gold)" />
            Quick Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn--primary" style={{ justifyContent: 'center' }}>
              <Plus size={15} /> Log Carbon Data
            </button>
            <button className="btn" style={{ justifyContent: 'center', background: 'var(--gamify-gold)', color: '#241a00' }}>
              <PlayCircle size={15} /> Start Challenge
            </button>
            <button className="btn btn--ghost" style={{ justifyContent: 'center' }}>
              <FileBarChart size={15} /> View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
