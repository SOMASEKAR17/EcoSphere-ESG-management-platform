import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import SubTabs from '../components/common/SubTabs';
import StatusPill from '../components/common/StatusPill';
import Toggle from '../components/common/Toggle';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import useSettings from '../hooks/useSettings';
import * as api from '../api/endpoints';

const TABS = ['Departments', 'Categories', 'ESG Configuration', 'Notification Settings'];

export default function Settings() {
  const [tab, setTab] = useTabParam(TABS, 'Departments');
  const { config, preferences, updateConfig, updatePreferences } = useSettings();
  const contentRef = useFadeInUp([tab]);
  
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  useEffect(() => {
    const fetchMasterData = async () => {
      setLoadingDepts(true);
      try {
        const [deptRes, catRes] = await Promise.allSettled([
          api.getDepartments(),
          api.getCategories()
        ]);
        
        if (deptRes.status === 'fulfilled') {
          setDepartments(deptRes.value.data.map(d => ({
            id: d.id,
            name: d.name,
            code: d.code,
            head: `Employee ${d.head_employee_id || 'N/A'}`,
            parent: d.parent_department_id ? `Dept ${d.parent_department_id}` : 'None',
            employees: d.employee_count || 0,
            status: d.status
          })));
        }
        
        if (catRes.status === 'fulfilled') {
          setCategories(catRes.value.data);
        }
      } catch {
        // Fallback or empty state
      } finally {
        setLoadingDepts(false);
      }
    };
    if (tab === 'Departments' || tab === 'Categories') {
      fetchMasterData();
    }
  }, [tab]);

  // Convert API config/preferences into the UI toggle array expected
  const configToggles = config ? [
    { id: 'evidence_required_default', label: 'Require evidence for CSR activities by default', enabled: config.evidence_required_default }
  ] : [];

  const handleConfigToggle = (id) => {
    updateConfig({ [id]: !config[id] });
  };

  const prefToggles = preferences ? [
    { id: 'csr_notifications', label: 'CSR Activity Notifications', enabled: preferences.csr_notifications },
    { id: 'challenge_notifications', label: 'Challenge Updates', enabled: preferences.challenge_notifications },
    { id: 'policy_reminders', label: 'Policy Reminders', enabled: preferences.policy_reminders },
    { id: 'compliance_alerts', label: 'Compliance Alerts', enabled: preferences.compliance_alerts },
    { id: 'badge_notifications', label: 'Badge Unlocks', enabled: preferences.badge_notifications }
  ] : [];

  const handlePrefToggle = (id) => {
    updatePreferences({ [id]: !preferences[id] });
  };

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
                  {loadingDepts ? <tr><td colSpan="6" className="text-secondary text-center py-4">Loading departments...</td></tr> : 
                   departments.length === 0 ? <tr><td colSpan="6" className="text-secondary text-center py-4">No departments found.</td></tr> :
                   departments.map((d) => (
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
          <div className="panel empty-state">Category taxonomy for goals, activities, and audit types. ({categories.length} categories found)</div>
        )}

        {tab === 'ESG Configuration' && (
          <ConfigToggles toggles={configToggles} onToggle={handleConfigToggle} title="ESG Configuration" />
        )}

        {tab === 'Notification Settings' && (
          <ConfigToggles toggles={prefToggles} onToggle={handlePrefToggle} title="Notification Settings" />
        )}
      </div>
    </div>
  );
}

function ConfigToggles({ toggles, onToggle, title }) {
  if (toggles.length === 0) return <div className="panel empty-state">Loading settings...</div>;
  
  return (
    <div className="panel">
      <div className="panel__title">{title}</div>
      {toggles.map((t) => (
        <Toggle key={t.id} label={t.label} checked={t.enabled} onChange={() => onToggle(t.id)} />
      ))}
    </div>
  );
}
