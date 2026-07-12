import { useState } from 'react';
import { Plus, Check, X, GraduationCap } from 'lucide-react';
import { FaTree, FaDroplet, FaUmbrellaBeach, FaChalkboardUser } from 'react-icons/fa6';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import SubTabs from '../components/common/SubTabs';
import StatusPill from '../components/common/StatusPill';
import KpiCard from '../components/common/KpiCard';
import ProgressBar from '../components/common/ProgressBar';
import Modal from '../components/common/Modal';
import ToastStack from '../components/common/Toast';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import useSocial from '../hooks/useSocial';
import { diversityStats, diversityGenderByDept } from '../data/mockData';

const TABS = ['CSR Activities', 'Employee Participation', 'Diversity Dashboard', 'Training Completion'];
const ACCENT = 'var(--social-teal)';

const CSR_ICONS = {
  tree: FaTree,
  droplet: FaDroplet,
  beach: FaUmbrellaBeach,
  workshop: FaChalkboardUser,
};

export default function Social() {
  const [tab, setTab] = useTabParam(TABS, 'CSR Activities');
  const contentRef = useFadeInUp([tab]);
  const { toasts, dismissToast } = useSocial();

  return (
    <div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />
      <div ref={contentRef}>
        {tab === 'CSR Activities' && <CSRActivities />}
        {tab === 'Employee Participation' && <EmployeeParticipation />}
        {tab === 'Diversity Dashboard' && <DiversityDashboard />}
        {tab === 'Training Completion' && <TrainingCompletion />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CSR Activities — Join + New Activity wired to real state             */
/* ------------------------------------------------------------------ */

const ICON_OPTIONS = [
  { value: 'tree', label: 'Tree' },
  { value: 'droplet', label: 'Droplet' },
  { value: 'beach', label: 'Beach' },
  { value: 'workshop', label: 'Workshop' },
];

const emptyActivity = { name: '', icon: 'tree', evidenceRequired: true };

function CSRActivities() {
  const { csrActivities, joinActivity, addActivity } = useSocial();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyActivity);

  const openNew = () => {
    setForm(emptyActivity);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    addActivity({ name: form.name.trim(), icon: form.icon, evidenceRequired: form.evidenceRequired });
    setModalOpen(false);
  };

  return (
    <>
      <button className="btn btn--teal" style={{ marginBottom: 18 }} onClick={openNew}>
        <Plus size={15} /> New Activity
      </button>
      <div className="grid-4">
        {csrActivities.map((a) => {
          const Icon = CSR_ICONS[a.icon] || FaTree;
          return (
            <div key={a.id} className="panel" style={{ '--accent': ACCENT }}>
              <Icon size={22} color={ACCENT} style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{a.name}</div>
              <div className="text-secondary" style={{ fontSize: 12, marginBottom: 4 }}>{a.joined} joined</div>
              <div className="text-secondary" style={{ fontSize: 12, marginBottom: 14 }}>
                {a.evidenceRequired ? 'Evidence Required' : 'Open'}
              </div>
              <button className="btn btn--teal btn--sm" onClick={() => joinActivity(a.id)}>Join</button>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <Modal title="New CSR Activity" onClose={() => setModalOpen(false)} accent={ACCENT}>
          <div className="form-field">
            <label>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. E-Waste Collection Drive"
            />
          </div>
          <div className="form-field">
            <label>Icon</label>
            <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {ICON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-field form-field--checkbox">
            <input
              type="checkbox"
              id="evidenceRequired"
              checked={form.evidenceRequired}
              onChange={(e) => setForm({ ...form, evidenceRequired: e.target.checked })}
            />
            <label htmlFor="evidenceRequired" style={{ textTransform: 'none', letterSpacing: 0 }}>Evidence required to join</label>
          </div>
          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn--teal" onClick={handleSave}>Create Activity</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Employee Participation — per-row approval queue, ties into XP        */
/* ------------------------------------------------------------------ */

function EmployeeParticipation() {
  const { employeeParticipation, approveParticipation, rejectParticipation } = useSocial();
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');

  const openReject = (id) => {
    setRejectingId(id);
    setReason('');
  };

  const confirmReject = () => {
    rejectParticipation(rejectingId, reason);
    setRejectingId(null);
  };

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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employeeParticipation.map((e) => (
              <tr key={e.id}>
                <td>{e.employee}</td>
                <td>{e.activity}</td>
                <td className="mono text-secondary">{e.proof}</td>
                <td>{e.points}</td>
                <td>
                  <StatusPill status={e.approval} />
                  {e.approval === 'Rejected' && e.rejectReason && (
                    <div className="text-secondary" style={{ fontSize: 11, marginTop: 4 }}>{e.rejectReason}</div>
                  )}
                </td>
                <td>
                  {e.approval === 'Pending' && (
                    <div className="row-actions">
                      <button
                        className="row-actions__btn"
                        onClick={() => approveParticipation(e.id)}
                        aria-label="Approve"
                        title="Approve"
                      >
                        <Check size={14} color="var(--success)" />
                      </button>
                      <button
                        className="row-actions__btn row-actions__btn--danger"
                        onClick={() => openReject(e.id)}
                        aria-label="Reject"
                        title="Reject"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rejectingId != null && (
        <Modal title="Reject Participation" onClose={() => setRejectingId(null)} accent={ACCENT} width={380}>
          <div className="form-field">
            <label>Reason</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Evidence photo missing or unclear"
            />
          </div>
          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setRejectingId(null)}>Cancel</button>
            <button className="btn btn--danger" onClick={confirmReject}>Reject</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Diversity Dashboard — KPIs + real breakdown chart                    */
/* ------------------------------------------------------------------ */

function DiversityDashboard() {
  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {diversityStats.map((s) => (
          <KpiCard key={s.label} label={s.label} value={s.value} suffix="" accent={ACCENT} />
        ))}
      </div>

      <div className="panel">
        <div className="panel__title">Gender Balance by Department</div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={diversityGenderByDept} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="department" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="women" name="Women" stackId="gender" fill="var(--social-teal)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="men" name="Men" stackId="gender" fill="var(--plum-light)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Training Completion — built from scratch                            */
/* ------------------------------------------------------------------ */

function TrainingCompletion() {
  const { trainings, completeTraining } = useSocial();

  const overallCompletion = trainings.length
    ? Math.round(trainings.reduce((sum, t) => sum + t.completion, 0) / trainings.length)
    : 0;
  const overdueCount = trainings.filter((t) => t.status === 'Overdue').length;
  const completedCount = trainings.filter((t) => t.status === 'Completed').length;

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <KpiCard label="Overall Completion" value={overallCompletion} suffix="%" accent={ACCENT} />
        <KpiCard label="Employees Overdue" value={overdueCount} suffix={`/ ${trainings.length}`} accent={ACCENT} />
        <KpiCard label="Completed Trainings" value={completedCount} suffix={`/ ${trainings.length}`} accent={ACCENT} />
        <KpiCard label="Courses Tracked" value={new Set(trainings.map((t) => t.course)).size} suffix="" accent={ACCENT} />
      </div>

      <div className="panel__title" style={{ marginBottom: 12 }}>
        <GraduationCap size={16} color={ACCENT} /> Training Completion
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Employee</th>
              <th>Department</th>
              <th>Completion</th>
              <th>Due Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {trainings.map((t) => (
              <tr key={t.id}>
                <td>{t.course}</td>
                <td>{t.employee}</td>
                <td>{t.department}</td>
                <td><ProgressBar percent={t.completion} /></td>
                <td className="mono">{t.dueDate}</td>
                <td><StatusPill status={t.status} /></td>
                <td>
                  {t.status !== 'Completed' && (
                    <button className="btn btn--teal btn--sm" onClick={() => completeTraining(t.id)}>
                      Mark Completed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
