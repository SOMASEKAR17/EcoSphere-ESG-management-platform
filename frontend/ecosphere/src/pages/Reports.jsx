import { Leaf, Users, ShieldCheck, LayoutDashboard, Wand2, Play, FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { FaChevronDown } from 'react-icons/fa6';
import SubTabs from '../components/common/SubTabs';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';

const TABS = ['Environmental', 'Social', 'Governance', 'ESG Summary', 'Custom Builder'];

const reportCards = [
  { key: 'Environmental', icon: Leaf, color: 'var(--env-green)', title: 'Environmental Report', desc: 'Emissions, goals, vendor & product breakdown' },
  { key: 'Social', icon: Users, color: 'var(--social-teal)', title: 'Social Report', desc: 'Diversity, CSR participation, training completion' },
  { key: 'Governance', icon: ShieldCheck, color: 'var(--gov-plum)', title: 'Governance Report', desc: 'Policies, audits, compliance & risk summary' },
  { key: 'ESG Summary', icon: LayoutDashboard, color: 'var(--teal)', title: 'ESG Summary', desc: 'Executive overview: all 4 scores + dept comparison' },
];

const filters = ['Date Range', 'Department', 'Module', 'Employee', 'Challenge', 'ESG Category'];

export default function Reports() {
  const [tab, setTab] = useTabParam(TABS, 'ESG Summary');
  const contentRef = useFadeInUp([]);

  return (
    <div>
      <SubTabs tabs={TABS} active={tab} onChange={setTab} accent="var(--teal)" />

      <div ref={contentRef} className="grid-4" style={{ marginBottom: 28 }}>
        {reportCards.map((r) => {
          const Icon = r.icon;
          const isActive = tab === r.key;
          return (
            <div
              key={r.key}
              className="panel"
              style={{
                border: isActive ? `1px solid ${r.color}` : '1px solid var(--border)',
                cursor: 'pointer',
              }}
              onClick={() => setTab(r.key)}
            >
              <Icon size={20} color={r.color} style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{r.title}</div>
              <div className="text-secondary" style={{ fontSize: 12, marginBottom: 16, minHeight: 32 }}>{r.desc}</div>
              <button className="btn btn--ghost btn--sm" style={{ width: '100%', justifyContent: 'center' }}>
                Generate
              </button>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <div className="panel__title">
          <Wand2 size={16} color="var(--teal)" /> Custom Report Builder: Filters
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
          {filters.map((f) => (
            <button key={f} className="btn btn--ghost btn--sm">{f} <FaChevronDown size={10} /></button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button className="btn btn--teal">
            <Play size={14} /> Run Report
          </button>
          <button className="btn btn--ghost">
            <FileDown size={14} /> Export: PDF
          </button>
          <button className="btn btn--ghost">
            <FileSpreadsheet size={14} /> Export: Excel
          </button>
          <button className="btn btn--ghost">
            <FileText size={14} /> Export: CSV
          </button>
        </div>
      </div>
    </div>
  );
}
