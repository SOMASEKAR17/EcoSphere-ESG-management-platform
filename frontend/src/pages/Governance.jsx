import { useState } from 'react';
import { Plus, Download, Eye, RotateCw, TriangleAlert, Check, ChevronRight } from 'lucide-react';
import SubTabs from '../components/common/SubTabs';
import StatusPill from '../components/common/StatusPill';
import ProgressBar from '../components/common/ProgressBar';
import Modal from '../components/common/Modal';
import ToastStack from '../components/common/Toast';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import useGovernance from '../hooks/useGovernance';
import { downloadTextFile } from '../utils/environmental';
import { auditsToCSV, auditsToJSON, ackCounts, nextAuditStage } from '../utils/governance';

const TABS = ['Policies', 'Policy Acknowledgements', 'Audits', 'Compliance Issues'];
const ACCENT = 'var(--gov-plum)';

export default function Governance() {
  const [tab, setTab] = useTabParam(TABS, 'Audits');
  const contentRef = useFadeInUp([tab]);
  const { toasts, dismissToast } = useGovernance();

  return (
    <div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      <div ref={contentRef}>
        {tab === 'Policies' && <PoliciesTable />}
        {tab === 'Policy Acknowledgements' && <AcknowledgementsTable />}
        {tab === 'Audits' && <AuditsView />}
        {tab === 'Compliance Issues' && <ComplianceIssuesTable />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Policies — managed library: New Policy, New Version, View            */
/* ------------------------------------------------------------------ */

const emptyPolicy = { title: '', category: '', version: 'v1.0' };

function PoliciesTable() {
  const { policies, addPolicy, addPolicyVersion } = useGovernance();
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState(emptyPolicy);
  const [viewing, setViewing] = useState(null);

  const openNew = () => {
    setForm(emptyPolicy);
    setNewOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.category.trim()) return;
    addPolicy({ title: form.title.trim(), category: form.category.trim(), version: form.version });
    setNewOpen(false);
  };

  return (
    <>
      <div className="panel-toolbar">
        <button
          className="btn btn--primary"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, var(--plum-light))` }}
          onClick={openNew}
        >
          <Plus size={15} /> New Policy
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Title</th><th>Category</th><th>Version</th><th>Updated</th><th></th></tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.category}</td>
                <td className="mono">{p.version}</td>
                <td className="mono">{p.updated}</td>
                <td>
                  <div className="row-actions">
                    <button className="row-actions__btn" onClick={() => setViewing(p)} aria-label="View policy" title="View">
                      <Eye size={14} />
                    </button>
                    <button
                      className="row-actions__btn"
                      onClick={() => addPolicyVersion(p.id)}
                      aria-label="New version"
                      title="New Version"
                    >
                      <RotateCw size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {newOpen && (
        <Modal title="New Policy" onClose={() => setNewOpen(false)} accent={ACCENT}>
          <div className="form-field">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Whistleblower Policy"
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Governance"
              />
            </div>
            <div className="form-field">
              <label>Version</label>
              <input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="v1.0"
              />
            </div>
          </div>
          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setNewOpen(false)}>Cancel</button>
            <button className="btn btn--primary" style={{ background: ACCENT }} onClick={handleSave}>Create Policy</button>
          </div>
        </Modal>
      )}

      {viewing && (
        <Modal title={viewing.title} onClose={() => setViewing(null)} accent={ACCENT} width={520}>
          <p className="text-secondary" style={{ fontSize: 12, marginBottom: 10 }}>
            {viewing.category} · {viewing.version} · Updated {viewing.updated}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>{viewing.content}</p>
          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setViewing(null)}>Close</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Policy Acknowledgements — department drill-down + reminders          */
/* ------------------------------------------------------------------ */

function AcknowledgementsTable() {
  const { policyAcknowledgements, sendReminder } = useGovernance();
  const [drilledId, setDrilledId] = useState(null);
  const drilled = policyAcknowledgements.find((r) => r.id === drilledId) || null;

  return (
    <>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Department</th><th>Policy</th><th>Acknowledged</th><th></th></tr>
          </thead>
          <tbody>
            {policyAcknowledgements.map((a) => {
              const { acknowledged, total } = ackCounts(a.employees);
              const percent = total ? Math.round((acknowledged / total) * 100) : 0;
              return (
                <tr key={a.id}>
                  <td>{a.department}</td>
                  <td>{a.policy}</td>
                  <td style={{ minWidth: 160 }}>
                    <ProgressBar percent={percent} />
                    <div className="text-secondary" style={{ fontSize: 11 }}>{acknowledged} / {total}</div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="row-actions__btn"
                        onClick={() => setDrilledId(a.id)}
                        aria-label="View employees"
                        title="View employees"
                      >
                        <ChevronRight size={14} />
                      </button>
                      {percent < 100 && (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => sendReminder(a.id)}
                        >
                          Send Reminder
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {drilled && <AcknowledgementDrillDown row={drilled} onClose={() => setDrilledId(null)} />}
    </>
  );
}

function AcknowledgementDrillDown({ row, onClose }) {
  const { acknowledgeEmployee } = useGovernance();
  const { acknowledged, total } = ackCounts(row.employees);

  return (
    <Modal title={`${row.department} — ${row.policy}`} onClose={onClose} accent={ACCENT} width={460}>
      <p className="text-secondary" style={{ fontSize: 12, marginBottom: 12 }}>
        {acknowledged} / {total} employees have acknowledged this policy.
      </p>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Employee</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {row.employees.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td><StatusPill status={e.acknowledged ? 'Approved' : 'Pending'} /></td>
                <td>
                  {!e.acknowledged && (
                    <button className="btn btn--sm" style={{ background: ACCENT, color: '#fff' }} onClick={() => acknowledgeEmployee(row.id, e.id)}>
                      Acknowledge
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="modal__footer">
        <button className="btn btn--ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Audits — lifecycle, export, and raise-issue                          */
/* ------------------------------------------------------------------ */

const emptyAudit = { title: '', department: '', auditor: '', date: '' };
const emptyIssue = { issue: '', severity: 'Medium' };
const STAGE_LABEL = { Scheduled: 'Start', 'In Progress': 'Mark Completed', Completed: 'Send to Review' };

function AuditsView() {
  const { audits, addAudit, advanceAudit, raiseIssue } = useGovernance();
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState(emptyAudit);
  const [raisingFor, setRaisingFor] = useState(null);
  const [issueForm, setIssueForm] = useState(emptyIssue);

  const openNew = () => {
    setForm(emptyAudit);
    setNewOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.department.trim() || !form.auditor.trim() || !form.date) return;
    addAudit({ ...form, title: form.title.trim(), department: form.department.trim(), auditor: form.auditor.trim() });
    setNewOpen(false);
  };

  const handleExportCSV = () => downloadTextFile('audits.csv', auditsToCSV(audits), 'text/csv');
  const handleExportJSON = () => downloadTextFile('audits.json', auditsToJSON(audits), 'application/json');

  const openRaiseIssue = (audit) => {
    setRaisingFor(audit);
    setIssueForm(emptyIssue);
  };

  const handleRaiseIssue = () => {
    if (!issueForm.issue.trim()) return;
    raiseIssue(raisingFor.id, issueForm);
    setRaisingFor(null);
  };

  return (
    <>
      <div className="panel-toolbar">
        <button
          className="btn btn--primary"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, var(--plum-light))` }}
          onClick={openNew}
        >
          <Plus size={15} /> New Audit
        </button>
        <button className="btn btn--ghost" onClick={handleExportCSV}>
          <Download size={15} /> Export CSV
        </button>
        <button className="btn btn--ghost" onClick={handleExportJSON}>
          <Download size={15} /> Export JSON
        </button>
      </div>

      <div className="data-table-wrap" style={{ marginBottom: 24 }}>
        <table className="data-table">
          <thead>
            <tr><th>Title</th><th>Department</th><th>Auditor</th><th>Date</th><th>Findings</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {audits.map((a) => {
              const next = nextAuditStage(a.status);
              return (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>{a.department}</td>
                  <td>{a.auditor}</td>
                  <td className="mono">{a.date}</td>
                  <td className="text-secondary">{a.findings}</td>
                  <td><StatusPill status={a.status} /></td>
                  <td>
                    <div className="row-actions" style={{ flexWrap: 'wrap' }}>
                      {next && (
                        <button className="btn btn--sm" style={{ background: ACCENT, color: '#fff' }} onClick={() => advanceAudit(a.id)}>
                          {STAGE_LABEL[a.status] || `Move to ${next}`}
                        </button>
                      )}
                      <button
                        className="row-actions__btn row-actions__btn--danger"
                        onClick={() => openRaiseIssue(a)}
                        aria-label="Raise issue"
                        title="Raise compliance issue"
                      >
                        <TriangleAlert size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {newOpen && (
        <Modal title="New Audit" onClose={() => setNewOpen(false)} accent={ACCENT}>
          <div className="form-field">
            <label>Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Q3 Emissions Audit" />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Department</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Manufacturing" />
            </div>
            <div className="form-field">
              <label>Auditor</label>
              <input value={form.auditor} onChange={(e) => setForm({ ...form, auditor: e.target.value })} placeholder="e.g. S. Nair" />
            </div>
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setNewOpen(false)}>Cancel</button>
            <button className="btn btn--primary" style={{ background: ACCENT }} onClick={handleSave}>Schedule Audit</button>
          </div>
        </Modal>
      )}

      {raisingFor && (
        <Modal title={`Raise Issue — ${raisingFor.title}`} onClose={() => setRaisingFor(null)} accent={ACCENT} width={420}>
          <div className="form-field">
            <label>Issue</label>
            <textarea
              rows={3}
              value={issueForm.issue}
              onChange={(e) => setIssueForm({ ...issueForm, issue: e.target.value })}
              placeholder="Describe the compliance issue found"
            />
          </div>
          <div className="form-field">
            <label>Severity</label>
            <select value={issueForm.severity} onChange={(e) => setIssueForm({ ...issueForm, severity: e.target.value })}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setRaisingFor(null)}>Cancel</button>
            <button className="btn btn--danger" onClick={handleRaiseIssue}>Raise Issue</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Compliance Issues — closes the loop from Audits                      */
/* ------------------------------------------------------------------ */

function ComplianceIssuesTable() {
  const { complianceIssues, auditById, resolveIssue } = useGovernance();

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr><th>Issue</th><th>Severity</th><th>Department</th><th>Source Audit</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {complianceIssues.map((c) => {
            const audit = auditById.get(c.auditId);
            return (
              <tr key={c.id}>
                <td>{c.issue}</td>
                <td><StatusPill status={c.severity} /></td>
                <td>{c.department}</td>
                <td className="text-secondary">{audit ? `from ${audit.title}` : '—'}</td>
                <td><StatusPill status={c.status} /></td>
                <td>
                  {c.status !== 'Resolved' && (
                    <button className="btn btn--sm" style={{ background: 'var(--success)', color: '#fff' }} onClick={() => resolveIssue(c.id)}>
                      <Check size={13} style={{ marginRight: 4 }} /> Resolve
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
