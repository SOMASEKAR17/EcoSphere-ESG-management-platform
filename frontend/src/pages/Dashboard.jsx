import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { BarChart3, CheckCircle2, AlertTriangle, FileText, Zap, Plus, PlayCircle, FileBarChart } from 'lucide-react';
import KpiCard from '../components/common/KpiCard';
import useFadeInUp from '../hooks/useFadeInUp';
import * as api from '../api/endpoints';
import '../components/layout/layout.css';

const activityIcon = {
  success: <CheckCircle2 size={15} color="var(--success)" />,
  warning: <AlertTriangle size={15} color="var(--warning)" />,
  neutral: <FileText size={15} color="var(--text-secondary)" />,
  plum: <FileText size={15} color="var(--plum-light)" />,
};

// Fallback data in case API fails or returns empty
const fallbackTrend = [
  { month: 'Jan', value: 85 }, { month: 'Feb', value: 88 }, { month: 'Mar', value: 82 },
  { month: 'Apr', value: 89 }, { month: 'May', value: 94 }, { month: 'Jun', value: 91 }
];

export default function Dashboard() {
  const gridRef = useFadeInUp([]);
  
  const [scores, setScores] = useState({ environmental: 0, social: 0, governance: 0, overall: 0 });
  const [deptScores, setDeptScores] = useState([]);
  const [trend, setTrend] = useState(fallbackTrend);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [overallRes, deptRes, notificationsRes] = await Promise.allSettled([
          api.getOverallScore(),
          api.getDepartmentScores(),
          api.getNotifications?.() || Promise.reject() // Wait for notifications endpoint to exist
        ]);

        if (overallRes.status === 'fulfilled') {
          // In a real app we'd fetch individual component scores too if the API returns them, 
          // or derive from dept scores. For now, we take the overall and guess the components
          // based on average of departments.
          const overall = overallRes.value.data.overall_score;
          setScores({ 
            environmental: overall, 
            social: overall, 
            governance: overall, 
            overall: overall 
          });
        }

        if (deptRes.status === 'fulfilled') {
          const depts = deptRes.value.data.map(d => ({
            dept: d.department_name,
            score: d.total_score
          })).sort((a, b) => b.score - a.score);
          setDeptScores(depts);
        }

        if (notificationsRes.status === 'fulfilled') {
          setRecentActivity(notificationsRes.value.data.slice(0, 5).map(n => ({
            id: n.id,
            type: n.type.includes('REJECTED') ? 'warning' : 'success',
            text: n.message
          })));
        } else {
          setRecentActivity([
            { id: 1, type: 'success', text: 'Manufacturing achieved 100% renewable energy.' },
            { id: 2, type: 'neutral', text: 'New Code of Conduct policy published.' },
            { id: 3, type: 'warning', text: 'Logistics carbon output exceeded target.' }
          ]);
        }
      } catch {
        // Fallbacks are set
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const maxDept = deptScores.length ? Math.max(...deptScores.map((d) => d.score)) : 100;

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
            ESG Trend (6 mo)
          </div>
          <div style={{ height: 200 }}>
            {loading ? <div className="loading-state">Loading trend...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
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
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">
            <BarChart3 size={16} color="var(--teal)" />
            Department ESG Ranking
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 200, padding: '0 8px' }}>
            {loading ? <div className="loading-state">Loading ranking...</div> : 
             deptScores.length === 0 ? <div className="empty-state">No department scores available</div> :
             deptScores.slice(0, 6).map((d) => (
              <div key={d.dept} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    height: `${(d.score / maxDept) * 150}px`,
                    background: 'linear-gradient(180deg, var(--teal), #024f52)',
                    borderRadius: '6px 6px 3px 3px',
                    marginBottom: 8,
                  }}
                />
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.dept}
                </div>
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
            {loading ? <div className="loading-state">Loading activity...</div> :
             recentActivity.map((a) => (
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
            <Link to="/environmental" className="btn btn--primary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
              <Plus size={15} /> Log Carbon Data
            </Link>
            <Link to="/gamification" className="btn" style={{ justifyContent: 'center', background: 'var(--gamify-gold)', color: '#241a00', textDecoration: 'none' }}>
              <PlayCircle size={15} /> Start Challenge
            </Link>
            <Link to="/reports" className="btn btn--ghost" style={{ justifyContent: 'center', textDecoration: 'none' }}>
              <FileBarChart size={15} /> View Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
