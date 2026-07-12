import { Plus, Pencil, Trash2, Download, Search } from 'lucide-react';
import SubTabs from '../components/common/SubTabs';
import ProgressBar from '../components/common/ProgressBar';
import StatusPill from '../components/common/StatusPill';
import useFadeInUp from '../hooks/useFadeInUp';
import useTabParam from '../hooks/useTabParam';
import {
  environmentalGoals,
  emissionFactors,
  productESGProfiles,
  carbonTransactions,
} from '../data/mockData';

const TABS = ['Emission Factors', 'Product ESG Profiles', 'Carbon Transactions', 'Environmental Goals'];

export default function Environmental() {
  const [tab, setTab] = useTabParam(TABS, 'Environmental Goals');
  const contentRef = useFadeInUp([tab]);

  return (
    <div>
      <SubTabs tabs={TABS} active={tab} onChange={setTab} accent="var(--env-green)" />

      <div ref={contentRef}>
        {tab === 'Environmental Goals' && <GoalsTable />}
        {tab === 'Emission Factors' && <EmissionFactorsTable />}
        {tab === 'Product ESG Profiles' && <ProductProfilesTable />}
        {tab === 'Carbon Transactions' && <CarbonTransactionsTable />}
      </div>
    </div>
  );
}

function GoalsTable() {
  return (
    <>
      <div className="panel-toolbar">
        <button className="btn btn--primary">
          <Plus size={15} /> New Goal
        </button>
        <button className="btn" style={{ background: '#8a5a10', color: '#fff' }}>
          <Pencil size={15} /> Edit
        </button>
        <button className="btn btn--danger">
          <Trash2 size={15} /> Delete
        </button>
        <button className="btn btn--ghost">
          <Download size={15} /> Export
        </button>
        <div className="panel-toolbar__spacer" />
        <div className="search-input">
          <Search size={14} color="var(--text-tertiary)" />
          <input placeholder="Search goals..." />
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
            </tr>
          </thead>
          <tbody>
            {environmentalGoals.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.department}</td>
                <td>{g.target} {g.unit}</td>
                <td>{g.current} {g.unit}</td>
                <td><ProgressBar percent={g.progress} /></td>
                <td className="mono">{g.deadline}</td>
                <td><StatusPill status={g.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-secondary" style={{ fontSize: 12, marginTop: 10 }}>
        Row actions: View · Edit · Delete &nbsp;·&nbsp; Carbon Transactions auto-generated from Purchase / Manufacturing / Fleet / Expenses
      </p>
    </>
  );
}

function EmissionFactorsTable() {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Factor</th>
            <th>Unit</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {emissionFactors.map((f) => (
            <tr key={f.id}>
              <td>{f.category}</td>
              <td className="mono">{f.factor}</td>
              <td>{f.unit}</td>
              <td className="text-secondary">{f.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductProfilesTable() {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Carbon Footprint</th>
            <th>Recycled Content</th>
            <th>ESG Grade</th>
          </tr>
        </thead>
        <tbody>
          {productESGProfiles.map((p) => (
            <tr key={p.id}>
              <td>{p.product}</td>
              <td className="mono">{p.carbonFootprint}</td>
              <td>{p.recycledContent}</td>
              <td><span className="pill pill--success">{p.esgGrade}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CarbonTransactionsTable() {
  return (
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
          {carbonTransactions.map((c) => (
            <tr key={c.id}>
              <td>{c.source}</td>
              <td>{c.department}</td>
              <td className="mono">{c.co2}</td>
              <td className="mono">{c.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
