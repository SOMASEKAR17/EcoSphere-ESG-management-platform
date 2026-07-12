import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Search,
  Calculator,
  BarChart3,
  Target,
  Leaf,
} from 'lucide-react';
import SubTabs from '../components/common/SubTabs';
import ProgressBar from '../components/common/ProgressBar';
import StatusPill from '../components/common/StatusPill';
import KpiCard from '../components/common/KpiCard';
import Modal from '../components/common/Modal';
import ToastStack from '../components/common/Toast';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import useEnvironmental from '../hooks/useEnvironmental';
import * as api from '../api/endpoints';
import { formatKgAsCO2, filterGoals, goalsToCSV, goalsToJSON, downloadTextFile } from '../utils/environmental';

// Fallback data in case API fails
const fallbackEmissionsTrend = [
  { month: 'Jan', value: 85 }, { month: 'Feb', value: 88 }, { month: 'Mar', value: 82 },
  { month: 'Apr', value: 89 }, { month: 'May', value: 94 }, { month: 'Jun', value: 91 }
];

const TABS = ['Emission Factors', 'Product ESG Profiles', 'Carbon Transactions', 'Environmental Goals', 'Environmental Dashboard'];
const ACCENT = 'var(--env-green)';

export default function Environmental() {
  const [tab, setTab] = useTabParam(TABS, 'Environmental Goals');
  const contentRef = useFadeInUp([tab]);
  const { toasts, dismissToast } = useEnvironmental();

  return (
    <div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <SubTabs tabs={TABS} active={tab} onChange={setTab} accent={ACCENT} />

      <div ref={contentRef}>
        {tab === 'Environmental Goals' && <GoalsTable />}
        {tab === 'Emission Factors' && <EmissionFactorsTable />}
        {tab === 'Product ESG Profiles' && <ProductProfilesTable />}
        {tab === 'Carbon Transactions' && <CarbonTransactionsTable />}
        {tab === 'Environmental Dashboard' && <EnvironmentalDashboard />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Emission Factors — real CRUD                                        */
/* ------------------------------------------------------------------ */

const emptyFactor = { category: '', factor: '', unit: '', source: '' };

function EmissionFactorsTable() {
  const { emissionFactors, addFactor, updateFactor, deleteFactor } = useEnvironmental();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyFactor);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyFactor);
    setModalOpen(true);
  };

  const openEdit = (f) => {
    setEditingId(f.id);
    setForm({ category: f.category, factor: f.factor, unit: f.unit, source: f.source });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.category.trim() || !form.factor || !form.unit.trim()) return;
    const payload = { category: form.category.trim(), factor: Number(form.factor), unit: form.unit.trim(), source: form.source.trim() };
    if (editingId != null) {
      updateFactor(editingId, payload);
    } else {
      addFactor(payload);
    }
    setModalOpen(false);
  };

  const handleDelete = (f) => {
    if (window.confirm(`Delete emission factor "${f.category}"?`)) deleteFactor(f.id);
  };

  return (
    <>
      <div className="panel-toolbar">
        <button className="btn btn--primary" onClick={openNew}>
          <Plus size={15} /> New Factor
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Factor</th>
              <th>Unit</th>
              <th>Source</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {emissionFactors.map((f) => (
              <tr key={f.id}>
                <td>{f.category}</td>
                <td className="mono">{f.factor}</td>
                <td>{f.unit}</td>
                <td className="text-secondary">{f.source}</td>
                <td>
                  <div className="row-actions">
                    <button className="row-actions__btn" onClick={() => openEdit(f)} aria-label="Edit factor">
                      <Pencil size={14} />
                    </button>
                    <button
                      className="row-actions__btn row-actions__btn--danger"
                      onClick={() => handleDelete(f)}
                      aria-label="Delete factor"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title={editingId != null ? 'Edit Emission Factor' : 'New Emission Factor'} onClose={() => setModalOpen(false)} accent={ACCENT}>
          <div className="form-field">
            <label>Category</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Diesel Fuel"
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Factor value</label>
              <input
                type="number"
                step="any"
                value={form.factor}
                onChange={(e) => setForm({ ...form, factor: e.target.value })}
                placeholder="2.68"
              />
            </div>
            <div className="form-field">
              <label>Unit</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="kg CO2e / L"
              />
            </div>
          </div>
          <div className="form-field">
            <label>Source</label>
            <input
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="e.g. DEFRA 2026"
            />
          </div>
          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={handleSave}>
              {editingId != null ? 'Save Changes' : 'Add Factor'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Product ESG Profiles — unchanged read-only view                     */
/* ------------------------------------------------------------------ */

function ProductProfilesTable() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const { data } = await api.getProductEsgProfiles();
        setProfiles(data.map(p => ({
          id: p.id,
          product: p.product_name,
          sku: p.product_sku,
          carbonFootprint: `${p.carbon_footprint_per_unit} kg CO2e/unit`,
          recycledContent: 'N/A', // not in DB schema yet
          esgGrade: p.sustainability_rating || 'N/A'
        })));
      } catch {
        // Leave empty
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Carbon Footprint</th>
            <th>ESG Grade</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <tr><td colSpan="4" className="text-secondary text-center py-4">Loading profiles...</td></tr> :
           profiles.length === 0 ? <tr><td colSpan="4" className="text-secondary text-center py-4">No product profiles found.</td></tr> :
           profiles.map((p) => (
            <tr key={p.id}>
              <td>{p.product}</td>
              <td className="mono text-secondary">{p.sku}</td>
              <td className="mono">{p.carbonFootprint}</td>
              <td><span className="pill pill--success">{p.esgGrade}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Carbon Transactions — calculator + department tracking + log        */
/* ------------------------------------------------------------------ */

function useDepartmentOptions() {
  const { carbonTransactions, environmentalGoals } = useEnvironmental();
  return useMemo(() => {
    const set = new Set(['Manufacturing', 'Logistics', 'Corporate']);
    carbonTransactions.forEach((t) => set.add(t.department));
    environmentalGoals.forEach((g) => set.add(g.department));
    return Array.from(set);
  }, [carbonTransactions, environmentalGoals]);
}

function CarbonCalculator() {
  const { emissionFactors, logTransaction } = useEnvironmental();
  const departments = useDepartmentOptions();
  const [factorId, setFactorId] = useState(emissionFactors[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [department, setDepartment] = useState(departments[0] ?? '');

  const selectedFactor = emissionFactors.find((f) => f.id === Number(factorId));
  const numAmount = Number(amount);
  const co2Kg = selectedFactor && Number.isFinite(numAmount) ? numAmount * selectedFactor.factor : 0;

  const handleLog = () => {
    if (!selectedFactor || !amount || numAmount <= 0 || !department) return;
    logTransaction({ factorId: selectedFactor.id, amount: numAmount, department });
    setAmount('');
  };

  return (
    <div className="panel" style={{ marginBottom: 20, border: '1px solid var(--env-green)' }}>
      <div className="panel__title">
        <Calculator size={16} color={ACCENT} /> Carbon Calculator
      </div>

      <div className="form-row" style={{ marginBottom: 0 }}>
        <div className="form-field">
          <label>Emission factor category</label>
          <select value={factorId} onChange={(e) => setFactorId(e.target.value)}>
            {emissionFactors.map((f) => (
              <option key={f.id} value={f.id}>{f.category} ({f.unit})</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-field">
        <label>Activity amount {selectedFactor ? `(${selectedFactor.unit.split('/')[1]?.trim() || 'units'})` : ''}</label>
        <input
          type="number"
          step="any"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 500"
        />
      </div>

      <div className="calc-result">
        <span className="calc-result__value">{formatKgAsCO2(co2Kg)}</span>
        <span className="calc-result__label">CO2e computed</span>
      </div>

      <button className="btn btn--primary" onClick={handleLog} disabled={!amount || numAmount <= 0}>
        <Plus size={15} /> Log Transaction
      </button>
    </div>
  );
}

function CarbonTransactionsTable() {
  const { carbonTransactions, departmentTotals } = useEnvironmental();
  const [deptFilter, setDeptFilter] = useState('All');

  const departments = useMemo(() => ['All', ...departmentTotals.map((d) => d.department)], [departmentTotals]);
  const filtered = deptFilter === 'All' ? carbonTransactions : carbonTransactions.filter((t) => t.department === deptFilter);

  return (
    <>
      <CarbonCalculator />

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel__title">
          <BarChart3 size={16} color={ACCENT} /> CO2e by Department
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentTotals} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="department" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => formatKgAsCO2(value)}
                contentStyle={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="totalKg" fill="var(--env-green)" radius={[6, 6, 3, 3]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dept-pills">
        {departments.map((d) => (
          <button
            key={d}
            className={`dept-pill ${deptFilter === d ? 'dept-pill--active' : ''}`}
            onClick={() => setDeptFilter(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Department</th>
              <th>CO₂</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.source}</td>
                <td>{c.department}</td>
                <td className="mono">{c.co2}</td>
                <td className="mono">{c.date}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-secondary">No transactions for this department yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Environmental Goals — wired-up CRUD, search, export                 */
/* ------------------------------------------------------------------ */

const emptyGoal = { name: '', department: '', target: '', current: '', unit: 't', deadline: '' };

function GoalsTable() {
  const { environmentalGoals, addGoal, updateGoal, deleteGoal } = useEnvironmental();
  const departments = useDepartmentOptions();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyGoal);

  const visibleGoals = filterGoals(environmentalGoals, query);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...emptyGoal, department: departments[0] ?? '' });
    setModalOpen(true);
  };

  const openEdit = (g) => {
    setEditingId(g.id);
    setForm({ name: g.name, department: g.department, target: g.target, current: g.current, unit: g.unit, deadline: g.deadline });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.department || !form.target || !form.deadline) return;
    const payload = {
      name: form.name.trim(),
      department: form.department,
      target: Number(form.target),
      current: Number(form.current) || 0,
      unit: form.unit.trim() || 't',
      deadline: form.deadline,
    };
    if (editingId != null) {
      updateGoal(editingId, payload);
    } else {
      addGoal(payload);
    }
    setModalOpen(false);
  };

  const handleDelete = (g) => {
    if (window.confirm(`Delete goal "${g.name}"?`)) deleteGoal(g.id);
  };

  const handleExportCSV = () => downloadTextFile('environmental-goals.csv', goalsToCSV(environmentalGoals), 'text/csv');
  const handleExportJSON = () => downloadTextFile('environmental-goals.json', goalsToJSON(environmentalGoals), 'application/json');

  return (
    <>
      <div className="panel-toolbar">
        <button className="btn btn--primary" onClick={openNew}>
          <Plus size={15} /> New Goal
        </button>
        <button className="btn btn--ghost" onClick={handleExportCSV}>
          <Download size={15} /> Export CSV
        </button>
        <button className="btn btn--ghost" onClick={handleExportJSON}>
          <Download size={15} /> Export JSON
        </button>
        <div className="panel-toolbar__spacer" />
        <div className="search-input">
          <Search size={14} color="var(--text-tertiary)" />
          <input placeholder="Search goals..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Target CO₂</th>
              <th>Current CO₂</th>
              <th>Progress</th>
              <th>Deadline</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleGoals.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.department}</td>
                <td>{g.target} {g.unit}</td>
                <td>{g.current} {g.unit}</td>
                <td><ProgressBar percent={g.progress} /></td>
                <td className="mono">{g.deadline}</td>
                <td><StatusPill status={g.status} /></td>
                <td>
                  <div className="row-actions">
                    <button className="row-actions__btn" onClick={() => openEdit(g)} aria-label="Edit goal">
                      <Pencil size={14} />
                    </button>
                    <button
                      className="row-actions__btn row-actions__btn--danger"
                      onClick={() => handleDelete(g)}
                      aria-label="Delete goal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visibleGoals.length === 0 && (
              <tr><td colSpan={8} className="text-secondary">No goals match "{query}".</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-secondary" style={{ fontSize: 12, marginTop: 10 }}>
        A goal is auto-marked Completed once its current CO₂ reaches its target. Carbon Transactions auto-generated from Purchase / Manufacturing / Fleet / Expenses.
      </p>

      {modalOpen && (
        <Modal title={editingId != null ? 'Edit Goal' : 'New Goal'} onClose={() => setModalOpen(false)} accent={ACCENT}>
          <div className="form-field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Reduce Fleet Emissions" />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Department</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Unit</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="t" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Target</label>
              <input type="number" step="any" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="500" />
            </div>
            <div className="form-field">
              <label>Current</label>
              <input type="number" step="any" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div className="form-field">
            <label>Deadline</label>
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={handleSave}>
              {editingId != null ? 'Save Changes' : 'Add Goal'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Environmental Dashboard — command center                            */
/* ------------------------------------------------------------------ */

function EnvironmentalDashboard() {
  const { carbonTransactions, departmentTotals, environmentalGoals, emissionFactors } = useEnvironmental();

  const totalCO2Kg = departmentTotals.reduce((sum, d) => sum + d.totalKg, 0);
  const activeGoals = environmentalGoals.filter((g) => g.status !== 'Completed').length;
  const avgProgress = environmentalGoals.length
    ? Math.round(environmentalGoals.reduce((sum, g) => sum + g.progress, 0) / environmentalGoals.length)
    : 0;

  return (
    <div>
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <div className="kpi-card" style={{ '--accent': ACCENT }}>
          <div className="kpi-card__label">Total CO2e Logged</div>
          <div className="kpi-card__value" style={{ fontSize: 24 }}>{formatKgAsCO2(totalCO2Kg)}</div>
        </div>
        <KpiCard label="Active Goals" value={activeGoals} suffix={`/ ${environmentalGoals.length}`} accent={ACCENT} />
        <KpiCard label="Avg. Goal Progress" value={avgProgress} suffix="%" accent={ACCENT} />
        <KpiCard label="Emission Factors Tracked" value={emissionFactors.length} suffix="" accent={ACCENT} />
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="panel">
          <div className="panel__title">
            <BarChart3 size={16} color={ACCENT} /> Emissions Trend (12 mo)
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fallbackEmissionsTrend} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2.5} dot={{ r: 3, fill: 'var(--env-green)' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">
            <Leaf size={16} color={ACCENT} /> CO2e by Department
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentTotals} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="department" stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => formatKgAsCO2(value)}
                  contentStyle={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="totalKg" fill="var(--env-green)" radius={[6, 6, 3, 3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__title">
          <Target size={16} color={ACCENT} /> Goals Snapshot
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {environmentalGoals.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td>{g.department}</td>
                  <td><ProgressBar percent={g.progress} /></td>
                  <td><StatusPill status={g.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-secondary" style={{ fontSize: 12, marginTop: 10 }}>
        Carbon Transactions total ({carbonTransactions.length} logged) roll up into department totals above.
      </p>
    </div>
  );
}
