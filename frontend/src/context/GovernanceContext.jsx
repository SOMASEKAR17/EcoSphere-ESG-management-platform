import { createContext, useState, useCallback, useMemo } from 'react';
import {
  policies as initialPolicies,
  policyAcknowledgements as initialAcknowledgements,
  audits as initialAudits,
  complianceIssues as initialComplianceIssues,
} from '../data/mockData';
import { bumpVersion, nextAuditStage } from '../utils/governance';

export const GovernanceContext = createContext(null);

const nextToastId = (() => {
  let id = 0;
  return () => ++id;
})();

const nextArrayId = (arr) => arr.reduce((max, item) => Math.max(max, item.id), 0) + 1;
const today = () => new Date().toISOString().slice(0, 10);

export function GovernanceProvider({ children }) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [policyAcknowledgements, setPolicyAcknowledgements] = useState(initialAcknowledgements);
  const [audits, setAudits] = useState(initialAudits);
  const [complianceIssues, setComplianceIssues] = useState(initialComplianceIssues);
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (message, variant = 'success') => {
      const id = nextToastId();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast]
  );

  // ---------- Policies ----------
  const addPolicy = useCallback(
    (policy) => {
      setPolicies((prev) => [
        ...prev,
        {
          ...policy,
          id: nextArrayId(prev),
          version: policy.version?.trim() || 'v1.0',
          updated: today(),
          content: policy.content?.trim() || 'No summary provided yet.',
        },
      ]);
      pushToast(`Policy "${policy.title}" created`, 'success');
    },
    [pushToast]
  );

  const addPolicyVersion = useCallback(
    (id) => {
      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, version: bumpVersion(p.version), updated: today() } : p))
      );
      const policy = policies.find((p) => p.id === id);
      if (policy) pushToast(`"${policy.title}" bumped to ${bumpVersion(policy.version)}`, 'success');
    },
    [policies, pushToast]
  );

  // ---------- Policy Acknowledgements ----------
  const acknowledgeEmployee = useCallback(
    (deptRowId, employeeId) => {
      setPolicyAcknowledgements((prev) =>
        prev.map((row) =>
          row.id !== deptRowId
            ? row
            : {
                ...row,
                employees: row.employees.map((e) =>
                  e.id === employeeId ? { ...e, acknowledged: true } : e
                ),
              }
        )
      );
      pushToast('Acknowledgement recorded', 'success');
    },
    [pushToast]
  );

  const sendReminder = useCallback(
    (deptRowId) => {
      const row = policyAcknowledgements.find((r) => r.id === deptRowId);
      if (!row) return;
      pushToast(`Reminder sent to ${row.department} for "${row.policy}"`, 'success');
    },
    [policyAcknowledgements, pushToast]
  );

  // ---------- Audits ----------
  const addAudit = useCallback(
    (audit) => {
      setAudits((prev) => [
        ...prev,
        { ...audit, id: nextArrayId(prev), findings: 'Not yet started', status: 'Scheduled' },
      ]);
      pushToast(`Audit "${audit.title}" scheduled`, 'success');
    },
    [pushToast]
  );

  const advanceAudit = useCallback(
    (id) => {
      const audit = audits.find((a) => a.id === id);
      if (!audit) return;
      const next = nextAuditStage(audit.status);
      if (!next) return;

      setAudits((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)));
      pushToast(`"${audit.title}" moved to ${next}`, 'success');
    },
    [audits, pushToast]
  );

  // ---------- Compliance Issues ----------
  const raiseIssue = useCallback(
    (auditId, { issue, severity }) => {
      const audit = audits.find((a) => a.id === auditId);
      if (!audit) return;

      setComplianceIssues((prev) => [
        ...prev,
        {
          id: nextArrayId(prev),
          issue: issue.trim(),
          severity: severity || 'Medium',
          department: audit.department,
          status: 'Open',
          auditId,
        },
      ]);
      pushToast(`Compliance issue raised from "${audit.title}"`, 'error');
    },
    [audits, pushToast]
  );

  const resolveIssue = useCallback(
    (id) => {
      setComplianceIssues((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'Resolved' } : c)));
      pushToast('Compliance issue resolved', 'success');
    },
    [pushToast]
  );

  const auditById = useMemo(() => {
    const map = new Map();
    audits.forEach((a) => map.set(a.id, a));
    return map;
  }, [audits]);

  const value = useMemo(
    () => ({
      policies,
      addPolicy,
      addPolicyVersion,
      policyAcknowledgements,
      acknowledgeEmployee,
      sendReminder,
      audits,
      addAudit,
      advanceAudit,
      complianceIssues,
      raiseIssue,
      resolveIssue,
      auditById,
      toasts,
      dismissToast,
    }),
    [
      policies,
      addPolicy,
      addPolicyVersion,
      policyAcknowledgements,
      acknowledgeEmployee,
      sendReminder,
      audits,
      addAudit,
      advanceAudit,
      complianceIssues,
      raiseIssue,
      resolveIssue,
      auditById,
      toasts,
      dismissToast,
    ]
  );

  return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>;
}
