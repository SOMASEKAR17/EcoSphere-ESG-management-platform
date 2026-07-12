import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import SubTabs from '../components/common/SubTabs';
import StatusPill from '../components/common/StatusPill';
import Toggle from '../components/common/Toggle';
import Modal from '../components/common/Modal';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import useSettings from '../hooks/useSettings';
import * as api from '../api/endpoints';

const TABS = ['Departments', 'Categories', 'ESG Configuration', 'Notification Settings'];

export default function Settings() {
  const [tab, setTab] = useTabParam(TABS, 'Departments');
  const { config, preferences, updateConfig, updatePreferences, pushToast } = useSettings();
  const contentRef = useFadeInUp([tab]);
  
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', type: 'CSR Activity' });

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

  useEffect(() => {
    if (tab === 'Departments' || tab === 'Categories') {
      fetchMasterData();
    }
  }, [tab]);

  const handleCreateDept = async () => {
    if (!deptForm.name.trim() || !deptForm.code.trim()) return;
    try {
      await api.createDepartment({ name: deptForm.name, code: deptForm.code });
      setDeptModalOpen(false);
      setDeptForm({ name: '', code: '' });
      pushToast('Department created successfully', 'success');
      fetchMasterData();
    } catch (err) {
      pushToast(err.response?.data?.detail || 'Failed to create department', 'error');
    }
  };

  const handleCreateCategory = async () => {
    if (!catForm.name.trim()) return;
    try {
      await api.createCategory({ name: catForm.name, type: catForm.type });
      setCatModalOpen(false);
      setCatForm({ name: '', type: 'CSR Activity' });
      pushToast('Category created successfully', 'success');
      fetchMasterData();
    } catch (err) {
      pushToast(err.response?.data?.detail || 'Failed to create category', 'error');
    }
  };

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
              <button className="btn btn--primary" onClick={() => setDeptModalOpen(true)}>
                <Plus size={15} /> New Department
              </button>
              <button className="btn" style={{ background: '#8a5a10', color: '#fff' }} disabled>
                <Pencil size={15} /> Edit
              </button>
              <button className="btn btn--danger" disabled><Trash2 size={15} /> Delete</button>
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

            {deptModalOpen && (
              <Modal title="New Department" onClose={() => setDeptModalOpen(false)} accent="var(--text-secondary)">
                <div className="form-field">
                  <label>Name</label>
                  <input
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    placeholder="e.g. Finance"
                  />
                </div>
                <div className="form-field">
                  <label>Code</label>
                  <input
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    placeholder="e.g. FIN"
                  />
                </div>
                <button className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleCreateDept}>
                  Create Department
                </button>
              </Modal>
            )}
          </>
        )}

        {tab === 'Categories' && (
          <>
            <div className="panel-toolbar">
              <button className="btn btn--primary" onClick={() => setCatModalOpen(true)}>
                <Plus size={15} /> New Category
              </button>
            </div>
            <div className="data-table-wrap" style={{ marginBottom: 28 }}>
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Type</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr><td colSpan="3" className="text-secondary text-center py-4">No categories found.</td></tr>
                  ) : (
                    categories.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td className="text-secondary">{c.type}</td>
                        <td><StatusPill status={c.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {catModalOpen && (
              <Modal title="New Category" onClose={() => setCatModalOpen(false)} accent="var(--text-secondary)">
                <div className="form-field">
                  <label>Name</label>
                  <input
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    placeholder="e.g. Health & Safety"
                  />
                </div>
                <div className="form-field">
                  <label>Type</label>
                  <select
                    value={catForm.type}
                    onChange={(e) => setCatForm({ ...catForm, type: e.target.value })}
                  >
                    <option value="CSR Activity">CSR Activity</option>
                    <option value="Challenge">Challenge</option>
                    <option value="Audit Type">Audit Type</option>
                  </select>
                </div>
                <button className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleCreateCategory}>
                  Create Category
                </button>
              </Modal>
            )}
          </>
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
