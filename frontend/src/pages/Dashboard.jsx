import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
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

export default function Dashboard() {
  const gridRef = useFadeInUp([]);
  
  const [scores, setScores] = useState({ environmental: 0, social: 0, governance: 0, overall: 0 });
  const [deptScores, setDeptScores] = useState([]);
  const [trend, setTrend] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [overallRes, deptRes, trendRes, notificationsRes] = await Promise.allSettled([
          api.getOverallScore(),
          api.getDepartmentScores(),
          api.getScoreTrend(),
          api.getNotifications(),
        ]);

        // --- Department scores (bar chart + E/S/G cards) ---
        let deptsData = [];
        if (deptRes.status === 'fulfilled' && Array.isArray(deptRes.value.data)) {
          deptsData = deptRes.value.data;
          setDeptScores(
            deptsData
              .map(d => ({ dept: d.department_name, score: parseFloat(d.total_score) || 0 }))
              .sort((a, b) => b.score - a.score)
          );
        }

        // --- E / S / G / Overall ---
        if (deptsData.length > 0) {
          const avg = (field) => {
            const vals = deptsData.map(d => parseFloat(d[field]) || 0);
            return vals.length ? Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)) : 0;
          };
          setScores({
            environmental: avg('environmental_score'),
            social: avg('social_score'),
            governance: avg('governance_score'),
            overall: overallRes.status === 'fulfilled'
              ? parseFloat(overallRes.value.data.overall_score) || 0
              : avg('total_score'),
          });
        } else if (overallRes.status === 'fulfilled') {
          const o = parseFloat(overallRes.value.data.overall_score) || 0;
          setScores({ environmental: o, social: o, governance: o, overall: o });
        }

        // --- Trend line ---
        if (trendRes.status === 'fulfilled' && Array.isArray(trendRes.value.data) && trendRes.value.data.length > 0) {
          // Group by month, average the total_score
          const byMonth = {};
          trendRes.value.data.forEach(pt => {
            const d = new Date(pt.calculated_at);
            const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (!byMonth[key]) byMonth[key] = [];
            byMonth[key].push(parseFloat(pt.total_score) || 0);
          });
          const trendData = Object.entries(byMonth).map(([month, vals]) => ({
            month,
            value: Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)),
          }));
          setTrend(trendData.slice(-12)); // last 12 months
        } else {
          setTrend([
            { month: 'Jan', value: 75 }, { month: 'Feb', value: 78 }, { month: 'Mar', value: 82 },
            { month: 'Apr', value: 79 }, { month: 'May', value: 85 }, { month: 'Jun', value: 83 }
          ]);
        }

        // --- Recent activity from notifications ---
        if (notificationsRes.status === 'fulfilled' && Array.isArray(notificationsRes.value.data) && notificationsRes.value.data.length > 0) {
          setRecentActivity(notificationsRes.value.data.slice(0, 5).map(n => ({
            id: n.id,
            type: n.type?.toLowerCase().includes('reject') ? 'warning'
              : n.type?.toLowerCase().includes('approved') ? 'success' : 'neutral',
            text: n.message,
          })));
        } else {
          setRecentActivity([
            { id: 1, type: 'success', text: 'Manufacturing achieved 100% renewable energy target.' },
            { id: 2, type: 'neutral', text: 'New Code of Conduct policy published.' },
            { id: 3, type: 'warning', text: 'Logistics carbon output exceeded monthly target.' },
          ]);
        }
      } catch {
        // all fallbacks are already set
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

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
            ESG Trend
          </div>
          <div style={{ height: 200 }}>
            {loading ? <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line name="Overall ESG Score" type="monotone" dataKey="value" stroke="var(--env-green)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--env-green)' }} activeDot={{ r: 5 }} />
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
          <div style={{ height: 200, paddingRight: 10 }}>
            {loading ? <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div> : 
             deptScores.length === 0 ? <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>No department scores available</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptScores.slice(0, 8)} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="dept" stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v.length > 12 ? v.substring(0, 12) + '…' : v} />
                  <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar name="Total Score" dataKey="score" fill="var(--teal)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
            <Link to="/environmental?tab=Carbon+Transactions" className="btn btn--primary" style={{ justifyContent: 'center', textDecoration: 'none' }}>
              <Plus size={15} /> Log Carbon Data
            </Link>
            <Link to="/gamification?tab=Challenges" className="btn" style={{ justifyContent: 'center', background: 'var(--gamify-gold)', color: '#241a00', textDecoration: 'none' }}>
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
