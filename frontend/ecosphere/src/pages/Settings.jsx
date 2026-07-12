import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import SubTabs from '../components/common/SubTabs';
import StatusPill from '../components/common/StatusPill';
import Toggle from '../components/common/Toggle';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import { departments, esgConfigToggles } from '../data/mockData';

const TABS = ['Departments', 'Categories', 'ESG Configuration', 'Notification Settings'];

export default function Settings() {
  const [tab, setTab] = useTabParam(TABS, 'Departments');
  const [toggles, setToggles] = useState(esgConfigToggles);
  const contentRef = useFadeInUp([tab]);

  const toggleOne = (id) =>
    setToggles((prev) => prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)));

  return (
    <div>
      <SubTabs tabs={TABS} active={tab} onChange={setTab} accent="var(--text-secondary)" />

      <div ref={contentRef}>
        {tab === 'Departments' && (
          <>
            <div className="panel-toolbar">
              <button className="btn btn--ghost"><Plus size={15} /> New Department</button>
              <button className="btn" style={{ background: '#8a5a10', color: '#fff' }}>
                <Pencil size={15} /> Edit
              </button>
              <button className="btn btn--danger"><Trash2 size={15} /> Delete</button>
            </div>

            <div className="data-table-wrap" style={{ marginBottom: 28 }}>
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Code</th><th>Head</th><th>Parent Dept</th><th>Employees</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.id}>
                      <td>{d.name}</td>
                      <td className="mono">{d.code}</td>
                      <td>{d.head}</td>
                      <td className="text-secondary">{d.parent}</td>
                      <td>{d.employees}</td>
                      <td><StatusPill status={d.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'Categories' && (
          <div className="panel empty-state">Category taxonomy for goals, activities, and audit types.</div>
        )}

        {tab === 'ESG Configuration' && (
          <ConfigToggles toggles={toggles} onToggle={toggleOne} title="ESG Configuration" />
        )}

        {tab === 'Notification Settings' && (
          <ConfigToggles toggles={toggles} onToggle={toggleOne} title="Notification Settings" />
        )}

        {tab === 'Departments' && (
          <ConfigToggles toggles={toggles} onToggle={toggleOne} title="ESG Configuration & Notifications" />
        )}
      </div>
    </div>
  );
}

function ConfigToggles({ toggles, onToggle, title }) {
  return (
    <div className="panel">
      <div className="panel__title">{title}</div>
      {toggles.map((t) => (
        <Toggle key={t.id} label={t.label} checked={t.enabled} onChange={() => onToggle(t.id)} />
      ))}
    </div>
  );
}
