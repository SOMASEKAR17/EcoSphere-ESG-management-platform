import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Check, X, GraduationCap, Upload, FileText } from 'lucide-react';
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
import * as api from '../api/endpoints';

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
/* CSR Activities — Join + New Activity with proof upload               */
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
  // Join confirmation modal state
  const [joinTarget, setJoinTarget] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const fileInputRef = useRef(null);

  const openNew = () => {
    setForm(emptyActivity);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    addActivity({ name: form.name.trim(), icon: form.icon, evidenceRequired: form.evidenceRequired });
    setModalOpen(false);
  };

  const openJoin = (activity) => {
    setJoinTarget(activity);
    setProofFile(null);
  };

  const confirmJoin = () => {
    if (!joinTarget) return;
    joinActivity(joinTarget.id, proofFile);
    setJoinTarget(null);
    setProofFile(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
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
              <button className="btn btn--teal btn--sm" onClick={() => openJoin(a)}>Join</button>
            </div>
          );
        })}
      </div>

      {/* New Activity Modal */}
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

      {/* Join Activity Confirmation Modal with Proof Upload */}
      {joinTarget && (
        <Modal title={`Join "${joinTarget.name}"`} onClose={() => setJoinTarget(null)} accent={ACCENT} width={420}>
          <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16, color: 'var(--text-primary)' }}>
            You are about to join <strong>{joinTarget.name}</strong>.
            {joinTarget.evidenceRequired && (
              <span style={{ color: 'var(--warning)', display: 'block', marginTop: 8 }}>
                ⚠ This activity requires proof of participation. Please upload your evidence below.
              </span>
            )}
          </p>

          {joinTarget.evidenceRequired && (
            <div className="form-field">
              <label>Upload Proof</label>
              <div
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--bg-surface)',
                  transition: 'border-color 0.2s ease',
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--social-teal)'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--border)';
                  if (e.dataTransfer.files[0]) setProofFile(e.dataTransfer.files[0]);
                }}
              >
                {proofFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <FileText size={18} color={ACCENT} />
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{proofFile.name}</span>
                    <button
                      className="row-actions__btn row-actions__btn--danger"
                      onClick={(e) => { e.stopPropagation(); setProofFile(null); }}
                      style={{ marginLeft: 4 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={24} color="var(--text-tertiary)" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Click to upload or drag & drop
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      Photos, PDFs, certificates accepted
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setJoinTarget(null)}>Cancel</button>
            <button
              className="btn btn--teal"
              onClick={confirmJoin}
              disabled={joinTarget.evidenceRequired && !proofFile}
              style={{ opacity: (joinTarget.evidenceRequired && !proofFile) ? 0.5 : 1 }}
            >
              Confirm Join
            </button>
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

  const sortedParticipation = useMemo(() => {
    return [...employeeParticipation].sort((a, b) => {
      if (a.approval === 'Pending' && b.approval !== 'Pending') return -1;
      if (a.approval !== 'Pending' && b.approval === 'Pending') return 1;
      return 0;
    });
  }, [employeeParticipation]);

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
            {sortedParticipation.length === 0 ? (
              <tr><td colSpan="6" className="text-secondary" style={{ textAlign: 'center', padding: 20 }}>No participation records found.</td></tr>
            ) : sortedParticipation.map((e) => (
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
/* Diversity Dashboard — works with actual API data format             */
/* ------------------------------------------------------------------ */

function DiversityDashboard() {
  const [stats, setStats] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiversity = async () => {
      setLoading(true);
      try {
        const { data } = await api.getDiversityMetrics();
        if (Array.isArray(data) && data.length > 0) {
          // Group metrics by department_id, build KPI cards from known metric names
          const metricsByDept = {};
          const metricTotals = {};

          data.forEach((d) => {
            const deptKey = d.department_name || `Dept ${d.department_id}`;
            if (!metricsByDept[deptKey]) metricsByDept[deptKey] = {};
            metricsByDept[deptKey][d.metric_name] = Number(d.metric_value);

            if (!metricTotals[d.metric_name]) metricTotals[d.metric_name] = { sum: 0, count: 0 };
            metricTotals[d.metric_name].sum += Number(d.metric_value);
            metricTotals[d.metric_name].count += 1;
          });

          // Build KPI cards from aggregated metrics
          const kpis = [];
          const avg = (name) => {
            const m = metricTotals[name];
            return m ? (m.sum / m.count).toFixed(2) : null;
          };

          const genderRatio = avg('Gender Diversity Ratio');
          if (genderRatio) {
            const wPct = Math.round(parseFloat(genderRatio) * 100);
            kpis.push({ label: 'Gender Balance', value: `${wPct}% W / ${100 - wPct}% M` });
          }

          const trainingCompl = avg('Training Completion %');
          if (trainingCompl) kpis.push({ label: 'Training Completion', value: `${Math.round(parseFloat(trainingCompl))}%` });

          const satisfaction = avg('Employee Satisfaction Index');
          if (satisfaction) kpis.push({ label: 'Satisfaction Index', value: `${parseFloat(satisfaction).toFixed(1)} / 5` });

          const disabilityInc = avg('Disability Inclusion %');
          if (disabilityInc) kpis.push({ label: 'Disability Inclusion', value: `${Math.round(parseFloat(disabilityInc))}%` });

          const turnover = avg('Voluntary Turnover Rate %');
          if (turnover) kpis.push({ label: 'Turnover Rate', value: `${Math.round(parseFloat(turnover))}%` });

          // Ensure at least 4 KPI cards
          if (kpis.length === 0) {
            kpis.push(
              { label: 'Departments Reporting', value: String(Object.keys(metricsByDept).length) },
              { label: 'Total Metrics', value: String(data.length) }
            );
          }
          kpis.push({ label: 'Departments Reporting', value: String(Object.keys(metricsByDept).length) });

          setStats(kpis.slice(0, 4));

          // Build chart: show key metrics per department
          const deptChartData = Object.entries(metricsByDept).map(([dept, metrics]) => ({
            department: dept,
            genderRatio: Math.round((metrics['Gender Diversity Ratio'] || 0) * 100),
            training: Math.round(metrics['Training Completion %'] || 0),
            satisfaction: Math.round((metrics['Employee Satisfaction Index'] || 0) * 20), // scale to 100
          }));
          setChartData(deptChartData);
        } else {
          // Fallback static data
          setStats([
            { label: 'Gender Balance', value: '46% W / 54% M' },
            { label: 'Leadership Diversity', value: '38%' },
            { label: 'Pay Equity Ratio', value: '0.97' },
            { label: 'New Hire Diversity', value: '41%' },
          ]);
          setChartData([
            { department: 'Manufacturing', genderRatio: 28, training: 85, satisfaction: 72 },
            { department: 'Logistics', genderRatio: 33, training: 78, satisfaction: 68 },
            { department: 'Corporate', genderRatio: 54, training: 92, satisfaction: 80 },
            { department: 'R&D', genderRatio: 50, training: 88, satisfaction: 76 },
          ]);
        }
      } catch {
        setStats([
          { label: 'Gender Balance', value: '46% W / 54% M' },
          { label: 'Leadership Diversity', value: '38%' },
          { label: 'Pay Equity Ratio', value: '0.97' },
          { label: 'New Hire Diversity', value: '41%' },
        ]);
        setChartData([
          { department: 'Manufacturing', genderRatio: 28, training: 85, satisfaction: 72 },
          { department: 'Logistics', genderRatio: 33, training: 78, satisfaction: 68 },
          { department: 'Corporate', genderRatio: 54, training: 92, satisfaction: 80 },
          { department: 'R&D', genderRatio: 50, training: 88, satisfaction: 76 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchDiversity();
  }, []);

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {stats.map((s) => (
          <KpiCard key={s.label} label={s.label} value={s.value} suffix="" accent={ACCENT} />
        ))}
      </div>

      <div className="panel">
        <div className="panel__title">Diversity Metrics by Department</div>
        <div style={{ height: 280 }}>
          {loading ? <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="department" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value, name) => [`${value}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="genderRatio" name="Gender Diversity %" fill="var(--social-teal)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="training" name="Training Completion %" fill="var(--plum-light)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="satisfaction" name="Satisfaction (scaled)" fill="var(--gamify-gold)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Training Completion — with Add Training modal                       */
/* ------------------------------------------------------------------ */

const COURSES = [
  'Code of Conduct',
  'Data Privacy Basics',
  'Workplace Safety',
  'Anti-Harassment Training',
  'ESG Fundamentals',
  'Environmental Compliance',
  'Supply Chain Ethics',
  'Cybersecurity Awareness',
];

const DEPARTMENTS = ['Manufacturing', 'Corporate', 'Logistics', 'Procurement', 'R&D'];

const emptyTraining = { course: '', employee: '', department: '', dueDate: '' };

function TrainingCompletion() {
  const { trainings, completeTraining } = useSocial();
  const [localTrainings, setLocalTrainings] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyTraining);

  // Merge context trainings with locally-added ones
  const allTrainings = [...trainings, ...localTrainings];

  const overallCompletion = allTrainings.length
    ? Math.round(allTrainings.reduce((sum, t) => sum + t.completion, 0) / allTrainings.length)
    : 0;
  const overdueCount = allTrainings.filter((t) => t.status === 'Overdue').length;
  const completedCount = allTrainings.filter((t) => t.status === 'Completed').length;

  const openNew = () => {
    setForm({ ...emptyTraining, course: COURSES[0], department: DEPARTMENTS[0] });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.employee.trim() || !form.dueDate) return;
    const newTraining = {
      id: Date.now(),
      course: form.course,
      employee: form.employee.trim(),
      department: form.department,
      completion: 0,
      dueDate: form.dueDate,
      status: 'Not Started',
    };
    setLocalTrainings((prev) => [...prev, newTraining]);
    setModalOpen(false);
  };

  const handleComplete = (id) => {
    // Check if it's a locally-added training
    const localIdx = localTrainings.findIndex((t) => t.id === id);
    if (localIdx !== -1) {
      setLocalTrainings((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'Completed', completion: 100 } : t))
      );
    } else {
      completeTraining(id);
    }
  };

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <KpiCard label="Overall Completion" value={overallCompletion} suffix="%" accent={ACCENT} />
        <KpiCard label="Employees Overdue" value={overdueCount} suffix={`/ ${allTrainings.length}`} accent={ACCENT} />
        <KpiCard label="Completed Trainings" value={completedCount} suffix={`/ ${allTrainings.length}`} accent={ACCENT} />
        <KpiCard label="Courses Tracked" value={new Set(allTrainings.map((t) => t.course)).size} suffix="" accent={ACCENT} />
      </div>

      <div className="panel-toolbar">
        <div className="panel__title" style={{ marginBottom: 0 }}>
          <GraduationCap size={16} color={ACCENT} /> Training Completion
        </div>
        <div className="panel-toolbar__spacer" />
        <button className="btn btn--teal" onClick={openNew}>
          <Plus size={15} /> Assign Training
        </button>
      </div>

      <p className="text-secondary" style={{ fontSize: 12, marginBottom: 12 }}>
        HR administrators assign mandatory ESG and compliance courses to employees. Training must be completed by the due date. Courses include: {COURSES.slice(0, 4).join(', ')}, and more.
      </p>

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
            {allTrainings.map((t) => (
              <tr key={t.id}>
                <td>{t.course}</td>
                <td>{t.employee}</td>
                <td>{t.department}</td>
                <td><ProgressBar percent={t.completion} color={ACCENT} /></td>
                <td className="mono">{t.dueDate}</td>
                <td><StatusPill status={t.status} /></td>
                <td>
                  {t.status !== 'Completed' && (
                    <button className="btn btn--teal btn--sm" onClick={() => handleComplete(t.id)}>
                      Mark Completed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title="Assign Training" onClose={() => setModalOpen(false)} accent={ACCENT}>
          <div className="form-field">
            <label>Course</label>
            <select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
              {COURSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Employee Name</label>
              <input
                value={form.employee}
                onChange={(e) => setForm({ ...form, employee: e.target.value })}
                placeholder="e.g. Aditi Rao"
              />
            </div>
            <div className="form-field">
              <label>Department</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-field">
            <label>Due Date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn--teal" onClick={handleSave}>Assign</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
