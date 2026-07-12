import { Plus, Download } from 'lucide-react';
import SubTabs from '../components/common/SubTabs';
import StatusPill from '../components/common/StatusPill';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import { policies, policyAcknowledgements, audits, complianceIssues } from '../data/mockData';

const TABS = ['Policies', 'Policy Acknowledgements', 'Audits', 'Compliance Issues'];

export default function Governance() {
  const [tab, setTab] = useTabParam(TABS, 'Audits');
  const contentRef = useFadeInUp([tab]);

  return (
    <div>
      <SubTabs tabs={TABS} active={tab} onChange={setTab} accent="var(--gov-plum)" />
      <div ref={contentRef}>
        {tab === 'Policies' && <PoliciesTable />}
        {tab === 'Policy Acknowledgements' && <AcknowledgementsTable />}
        {tab === 'Audits' && <AuditsView />}
        {tab === 'Compliance Issues' && <ComplianceIssuesTable />}
      </div>
    </div>
  );
}

function PoliciesTable() {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr><th>Title</th><th>Category</th><th>Version</th><th>Updated</th></tr>
        </thead>
        <tbody>
          {policies.map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td>{p.category}</td>
              <td className="mono">{p.version}</td>
              <td className="mono">{p.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AcknowledgementsTable() {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr><th>Department</th><th>Policy</th><th>Acknowledged</th></tr>
        </thead>
        <tbody>
          {policyAcknowledgements.map((a) => (
            <tr key={a.id}>
              <td>{a.department}</td>
              <td>{a.policy}</td>
              <td>{a.acknowledged} / {a.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditsView() {
  return (
    <>
      <div className="panel-toolbar">
        <button className="btn btn--primary" style={{ background: 'linear-gradient(135deg, var(--gov-plum), var(--plum-light))' }}>
          <Plus size={15} /> New Audit
        </button>
        <button className="btn btn--ghost">
          <Download size={15} /> Export
        </button>
      </div>

      <div className="data-table-wrap" style={{ marginBottom: 24 }}>
        <table className="data-table">
          <thead>
            <tr><th>Title</th><th>Department</th><th>Auditor</th><th>Date</th><th>Findings</th><th>Status</th></tr>
          </thead>
          <tbody>
            {audits.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.department}</td>
                <td>{a.auditor}</td>
                <td className="mono">{a.date}</td>
                <td className="text-secondary">{a.findings}</td>
                <td><StatusPill status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel__title">Compliance Issues raised from Audits — severity-tagged, resolution tracked</div>
      <ComplianceIssuesTable />
    </>
  );
}

function ComplianceIssuesTable() {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr><th>Issue</th><th>Severity</th><th>Department</th><th>Status</th></tr>
        </thead>
        <tbody>
          {complianceIssues.map((c) => (
            <tr key={c.id}>
              <td>{c.issue}</td>
              <td><StatusPill status={c.severity} /></td>
              <td>{c.department}</td>
              <td><StatusPill status={c.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
