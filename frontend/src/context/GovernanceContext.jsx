import { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import * as api from '../api/endpoints';
import {
  policies as fallbackPolicies,
  policyAcknowledgements as fallbackAcknowledgements,
  audits as fallbackAudits,
  complianceIssues as fallbackIssues,
} from '../data/mockData';
import { bumpVersion, nextAuditStage } from '../utils/governance';

export const GovernanceContext = createContext(null);

const nextToastId = (() => {
  let id = 0;
  return () => ++id;
})();

const today = () => new Date().toISOString().slice(0, 10);

export function GovernanceProvider({ children }) {
  const [policies, setPolicies] = useState([]);
  const [policyAcknowledgements, setPolicyAcknowledgements] = useState(fallbackAcknowledgements);
  const [audits, setAudits] = useState([]);
  const [complianceIssues, setComplianceIssues] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // ---------- Fetch from API ----------
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [policiesRes, auditsRes, issuesRes] = await Promise.allSettled([
          api.getPolicies(),
          api.getAudits(),
          api.getComplianceIssues(),
        ]);

        setPolicies(
          policiesRes.status === 'fulfilled'
            ? policiesRes.value.data.map((p) => ({
                id: p.id,
                title: p.title,
                category: 'Governance',
                version: `v${p.id}.0`,
                updated: p.effective_date,
                content: p.content,
              }))
            : fallbackPolicies
        );

        setAudits(
          auditsRes.status === 'fulfilled'
            ? auditsRes.value.data.map((a) => ({
                id: a.id,
                title: a.title,
                department: a.department_name || `Dept ${a.department_id}`,
                departmentId: a.department_id,
                auditor: a.auditor_name || `Auditor ${a.auditor_id}`,
                date: a.conducted_at?.slice(0, 10) || today(),
                findings: a.findings || 'N/A',
                status: a.status || 'Open',
              }))
            : fallbackAudits
        );

        setComplianceIssues(
          issuesRes.status === 'fulfilled'
            ? issuesRes.value.data.map((i) => ({
                id: i.id,
                issue: i.description || i.title,
                severity: i.severity,
                department: i.department_name || 'Unknown',
                status: i.status,
                auditId: i.audit_id,
              }))
            : fallbackIssues
        );
      } catch {
        setPolicies(fallbackPolicies);
        setAudits(fallbackAudits);
        setComplianceIssues(fallbackIssues);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ---------- Policies ----------
  const addPolicy = useCallback(
    async (policy) => {
      try {
        const { data } = await api.createPolicy({
          title: policy.title,
          content: policy.content?.trim() || 'No summary provided yet.',
          effective_date: today(),
        });
        setPolicies((prev) => [
          ...prev,
          {
            id: data.id,
            title: data.title,
            category: policy.category || 'Governance',
            version: 'v1.0',
            updated: data.effective_date || today(),
            content: data.content,
          },
        ]);
        pushToast(`Policy "${policy.title}" created`, 'success');
      } catch {
        pushToast('Failed to create policy', 'error');
      }
    },
    [pushToast]
  );

  const addPolicyVersion = useCallback(
    async (id) => {
      const policy = policies.find((p) => p.id === id);
      if (!policy) return;
      try {
        await api.updatePolicy(id, { content: policy.content });
      } catch {
        // continue with local update
      }
      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, version: bumpVersion(p.version), updated: today() } : p))
      );
      pushToast(`"${policy.title}" bumped to ${bumpVersion(policy.version)}`, 'success');
    },
    [policies, pushToast]
  );

  // ---------- Policy Acknowledgements ----------
  const acknowledgeEmployee = useCallback(
    async (deptRowId, employeeId) => {
      try {
        // Find the policy from the acknowledgement row
        const row = policyAcknowledgements.find((r) => r.id === deptRowId);
        if (row) {
          const policy = policies.find((p) => p.title === row.policy);
          if (policy) {
            await api.acknowledgePolicy(policy.id);
          }
        }
      } catch {
        // continue with local update
      }
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
    [policyAcknowledgements, policies, pushToast]
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
    async (audit) => {
      try {
        const { data } = await api.createAudit({
          title: audit.title,
          department_id: audit.departmentId || 1,
          auditor_id: 1,
          conducted_at: audit.date || today(),
          findings: 'Not yet started',
          status: 'Open',
        });
        setAudits((prev) => [
          ...prev,
          {
            id: data.id,
            title: data.title,
            department: audit.department,
            auditor: audit.auditor || 'TBD',
            date: data.conducted_at?.slice(0, 10) || today(),
            findings: 'Not yet started',
            status: data.status || 'Open',
          },
        ]);
        pushToast(`Audit "${audit.title}" scheduled`, 'success');
      } catch {
        pushToast('Failed to create audit', 'error');
      }
    },
    [pushToast]
  );

  const advanceAudit = useCallback(
    async (id) => {
      const audit = audits.find((a) => a.id === id);
      if (!audit) return;
      const next = nextAuditStage(audit.status);
      if (!next) return;

      try {
        await api.updateAudit(id, { status: next });
      } catch {
        // continue with local update
      }
      setAudits((prev) => prev.map((a) => (a.id === id ? { ...a, status: next } : a)));
      pushToast(`"${audit.title}" moved to ${next}`, 'success');
    },
    [audits, pushToast]
  );

  // ---------- Compliance Issues ----------
  const raiseIssue = useCallback(
    async (auditId, { issue, severity }) => {
      const audit = audits.find((a) => a.id === auditId);
      if (!audit) return;

      try {
        const { data } = await api.createComplianceIssue({
          audit_id: auditId,
          title: issue.trim(),
          description: issue.trim(),
          severity: severity || 'Medium',
          owner_id: 1,
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        });
        setComplianceIssues((prev) => [
          ...prev,
          {
            id: data.id,
            issue: issue.trim(),
            severity: severity || 'Medium',
            department: audit.department,
            status: 'Open',
            auditId,
          },
        ]);
      } catch {
        setComplianceIssues((prev) => [
          ...prev,
          {
            id: Date.now(),
            issue: issue.trim(),
            severity: severity || 'Medium',
            department: audit.department,
            status: 'Open',
            auditId,
          },
        ]);
      }
      pushToast(`Compliance issue raised from "${audit.title}"`, 'error');
    },
    [audits, pushToast]
  );

  const resolveIssue = useCallback(
    async (id) => {
      try {
        await api.updateComplianceIssue(id, { status: 'Resolved' });
      } catch {
        // continue with local
      }
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
      policies, addPolicy, addPolicyVersion,
      policyAcknowledgements, acknowledgeEmployee, sendReminder,
      audits, addAudit, advanceAudit,
      complianceIssues, raiseIssue, resolveIssue,
      auditById, toasts, dismissToast, loading,
    }),
    [
      policies, addPolicy, addPolicyVersion,
      policyAcknowledgements, acknowledgeEmployee, sendReminder,
      audits, addAudit, advanceAudit,
      complianceIssues, raiseIssue, resolveIssue,
      auditById, toasts, dismissToast, loading,
    ]
  );

  return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>;
}
