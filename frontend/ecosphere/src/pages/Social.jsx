import { Plus } from 'lucide-react';
import { FaTree, FaDroplet, FaUmbrellaBeach, FaChalkboardUser } from 'react-icons/fa6';
import SubTabs from '../components/common/SubTabs';
import StatusPill from '../components/common/StatusPill';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import { csrActivities, employeeParticipation, diversityStats } from '../data/mockData';

const TABS = ['CSR Activities', 'Employee Participation', 'Diversity Dashboard'];

const CSR_ICONS = {
  tree: FaTree,
  droplet: FaDroplet,
  beach: FaUmbrellaBeach,
  workshop: FaChalkboardUser,
};

export default function Social() {
  const [tab, setTab] = useTabParam(TABS, 'CSR Activities');
  const contentRef = useFadeInUp([tab]);

  return (
    <div>
      <SubTabs tabs={TABS} active={tab} onChange={setTab} accent="var(--social-teal)" />
      <div ref={contentRef}>
        {tab === 'CSR Activities' && <CSRActivities />}
        {tab === 'Employee Participation' && <EmployeeParticipation />}
        {tab === 'Diversity Dashboard' && <DiversityDashboard />}
      </div>
    </div>
  );
}

function CSRActivities() {
  return (
    <>
      <button className="btn btn--teal" style={{ marginBottom: 18 }}>
        <Plus size={15} /> New Activity
      </button>
      <div className="grid-4">
        {csrActivities.map((a) => {
          const Icon = CSR_ICONS[a.icon];
          return (
          <div key={a.id} className="panel" style={{ '--accent': 'var(--social-teal)' }}>
            <Icon size={22} color="var(--social-teal)" style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 700, marginBottom: 8 }}>{a.name}</div>
            <div className="text-secondary" style={{ fontSize: 12, marginBottom: 4 }}>{a.joined} joined</div>
            <div className="text-secondary" style={{ fontSize: 12, marginBottom: 14 }}>
              {a.evidenceRequired ? 'Evidence Required' : 'Open'}
            </div>
            <button className="btn btn--teal btn--sm">Join</button>
          </div>
          );
        })}
      </div>
    </>
  );
}

function EmployeeParticipation() {
  return (
    <div>
      <div className="panel__title" style={{ marginBottom: 12 }}>Employee Participation: approval queue</div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Activity / Challenge</th>
              <th>Proof</th>
              <th>Points</th>
              <th>Approval</th>
            </tr>
          </thead>
          <tbody>
            {employeeParticipation.map((e) => (
              <tr key={e.id}>
                <td>{e.employee}</td>
                <td>{e.activity}</td>
                <td className="mono text-secondary">{e.proof}</td>
                <td>{e.points}</td>
                <td><StatusPill status={e.approval} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn--teal">Approve</button>
        <button className="btn btn--danger">Reject</button>
      </div>
    </div>
  );
}

function DiversityDashboard() {
  return (
    <div className="grid-4">
      {diversityStats.map((s) => (
        <div key={s.label} className="kpi-card" style={{ '--accent': 'var(--social-teal)' }}>
          <div className="kpi-card__label">{s.label}</div>
          <div className="kpi-card__value" style={{ fontSize: 22 }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}
