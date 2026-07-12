// Local mock data mirroring the shape of the future API responses.
// Every page reads from here so the UI is fully navigable pre-integration.

export const scores = {
  environmental: 82,
  social: 74,
  governance: 88,
  overall: 81,
};

export const emissionsTrend = [
  { month: 'Aug', value: 42 },
  { month: 'Sep', value: 55 },
  { month: 'Oct', value: 61 },
  { month: 'Nov', value: 48 },
  { month: 'Dec', value: 38 },
  { month: 'Jan', value: 44 },
  { month: 'Feb', value: 57 },
  { month: 'Mar', value: 63 },
  { month: 'Apr', value: 58 },
  { month: 'May', value: 66 },
  { month: 'Jun', value: 60 },
  { month: 'Jul', value: 64 },
];

export const deptRanking = [
  { dept: 'Sale', score: 58 },
  { dept: 'Mfg', score: 88 },
  { dept: 'Logi', score: 62 },
  { dept: 'Corp', score: 94 },
  { dept: 'R&D', score: 70 },
];

export const recentActivity = [
  { id: 1, type: 'success', text: "Priya completed 'Zero Waste Week'" },
  { id: 2, type: 'warning', text: 'New compliance issue in Logistics' },
  { id: 3, type: 'neutral', text: '42 new Carbon Transactions logged' },
  { id: 4, type: 'plum', text: 'R&D acknowledged Anti-Corruption Policy' },
];

export const environmentalGoals = [
  {
    id: 1,
    name: 'Reduce Fleet Emissions',
    department: 'Logistics',
    target: 500,
    current: 390,
    unit: 't',
    progress: 78,
    deadline: '2026-12-31',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Cut Packaging Waste',
    department: 'Manufacturing',
    target: 120,
    current: 98,
    unit: 't',
    progress: 82,
    deadline: '2026-09-30',
    status: 'On Track',
  },
  {
    id: 3,
    name: 'Office Energy Cut',
    department: 'Corporate',
    target: 80,
    current: 80,
    unit: 't',
    progress: 100,
    deadline: '2026-06-30',
    status: 'Completed',
  },
];

export const emissionFactors = [
  { id: 1, category: 'Diesel Fuel', factor: 2.68, unit: 'kg CO2e / L', source: 'DEFRA 2026' },
  { id: 2, category: 'Grid Electricity (IN)', factor: 0.71, unit: 'kg CO2e / kWh', source: 'CEA 2026' },
  { id: 3, category: 'Air Freight', factor: 0.60, unit: 'kg CO2e / tkm', source: 'GHG Protocol' },
  { id: 4, category: 'Cardboard Packaging', factor: 0.94, unit: 'kg CO2e / kg', source: 'Ecoinvent' },
];

export const productESGProfiles = [
  { id: 1, product: 'EcoLine Sofa', carbonFootprint: '128 kg CO2e', recycledContent: '46%', esgGrade: 'A-' },
  { id: 2, product: 'Steel Bracket X2', carbonFootprint: '9.4 kg CO2e', recycledContent: '72%', esgGrade: 'A' },
  { id: 3, product: 'Standard Pallet', carbonFootprint: '22 kg CO2e', recycledContent: '18%', esgGrade: 'C+' },
];

export const carbonTransactions = [
  { id: 1, source: 'Purchase Order #4021', department: 'Manufacturing', co2: '3.2 t', date: '2026-07-08' },
  { id: 2, source: 'Fleet Log — Truck 12', department: 'Logistics', co2: '1.1 t', date: '2026-07-09' },
  { id: 3, source: 'Expense Report #772', department: 'Corporate', co2: '0.3 t', date: '2026-07-10' },
];

export const csrActivities = [
  { id: 1, icon: 'tree', name: 'Tree Plantation', joined: 24, evidenceRequired: true, status: 'Open' },
  { id: 2, icon: 'droplet', name: 'Blood Donation', joined: 18, evidenceRequired: true, status: 'Open' },
  { id: 3, icon: 'beach', name: 'Beach Cleanup', joined: 31, evidenceRequired: false, status: 'Open' },
  { id: 4, icon: 'workshop', name: 'ESG Workshop', joined: 52, evidenceRequired: false, status: 'Open' },
];

export const employeeParticipation = [
  { id: 1, employee: 'Aditi Rao', activity: 'Tree Plantation', proof: 'photo.jpg', points: 50, approval: 'Pending', rejectReason: null },
  { id: 2, employee: 'Karan Shah', activity: 'ESG Workshop', proof: 'cert.pdf', points: 30, approval: 'Approved', rejectReason: null },
  { id: 3, employee: 'Neha Verma', activity: 'Blood Donation', proof: 'photo.jpg', points: 40, approval: 'Pending', rejectReason: null },
];

export const diversityStats = [
  { label: 'Gender Balance', value: '46% W / 54% M' },
  { label: 'Leadership Diversity', value: '38%' },
  { label: 'Pay Equity Ratio', value: '0.97' },
  { label: 'New Hire Diversity', value: '41%' },
];

// Gender breakdown by department, feeds the Diversity Dashboard chart.
export const diversityGenderByDept = [
  { department: 'Manufacturing', women: 38, men: 96 },
  { department: 'Logistics', women: 19, men: 39 },
  { department: 'Corporate', women: 22, men: 19 },
  { department: 'R&D', women: 24, men: 24 },
];

// Leadership diversity trend over time — alternate chart option for the dashboard.
export const leadershipDiversityTrend = [
  { quarter: 'Q3 \'25', percent: 29 },
  { quarter: 'Q4 \'25', percent: 32 },
  { quarter: 'Q1 \'26', percent: 34 },
  { quarter: 'Q2 \'26', percent: 38 },
];

export const trainings = [
  { id: 1, course: 'Code of Conduct', employee: 'Aditi Rao', department: 'Manufacturing', completion: 100, dueDate: '2026-06-01', status: 'Completed' },
  { id: 2, course: 'Data Privacy Basics', employee: 'Karan Shah', department: 'Corporate', completion: 60, dueDate: '2026-07-20', status: 'In Progress' },
  { id: 3, course: 'Workplace Safety', employee: 'Neha Verma', department: 'Manufacturing', completion: 0, dueDate: '2026-06-15', status: 'Overdue' },
  { id: 4, course: 'Anti-Harassment Training', employee: 'R. Iyer', department: 'Procurement', completion: 0, dueDate: '2026-08-01', status: 'Not Started' },
  { id: 5, course: 'ESG Fundamentals', employee: 'S. Nair', department: 'Manufacturing', completion: 100, dueDate: '2026-05-10', status: 'Completed' },
];

export const policies = [
  {
    id: 1,
    title: 'Anti-Corruption Policy',
    category: 'Governance',
    version: 'v3.1',
    updated: '2026-05-12',
    content: 'Prohibits bribery, facilitation payments, and conflicts of interest across all vendor and government-facing dealings. Requires annual disclosure of gifts and hospitality above ₹5,000.',
  },
  {
    id: 2,
    title: 'Data Privacy Policy',
    category: 'Governance',
    version: 'v2.0',
    updated: '2026-03-01',
    content: 'Sets rules for collecting, storing, and processing employee and customer personal data, including breach-notification timelines and retention limits.',
  },
  {
    id: 3,
    title: 'Supplier Code of Conduct',
    category: 'Procurement',
    version: 'v1.4',
    updated: '2026-01-22',
    content: 'Requires suppliers to meet minimum labor, safety, and environmental standards, and to permit periodic audits of their facilities.',
  },
];

// Per-department acknowledgement drill-downs — the "acknowledged / total" figures
// shown in the table are derived live from each employee's status.
export const policyAcknowledgements = [
  {
    id: 1,
    department: 'R&D',
    policy: 'Anti-Corruption Policy',
    employees: [
      { id: 1, name: 'Meera Iyengar', acknowledged: true },
      { id: 2, name: 'Farhan Khan', acknowledged: true },
      { id: 3, name: 'Divya Menon', acknowledged: true },
    ],
  },
  {
    id: 2,
    department: 'Manufacturing',
    policy: 'Supplier Code of Conduct',
    employees: [
      { id: 1, name: 'S. Nair', acknowledged: true },
      { id: 2, name: 'Aditi Rao', acknowledged: true },
      { id: 3, name: 'Neha Verma', acknowledged: false },
      { id: 4, name: 'Vikram Singh', acknowledged: false },
    ],
  },
  {
    id: 3,
    department: 'Logistics',
    policy: 'Data Privacy Policy',
    employees: [
      { id: 1, name: 'R. Iyer', acknowledged: true },
      { id: 2, name: 'Priya Das', acknowledged: false },
      { id: 3, name: 'Arjun Nambiar', acknowledged: false },
      { id: 4, name: 'Kavya Pillai', acknowledged: false },
    ],
  },
];

export const audits = [
  {
    id: 1,
    title: 'Q2 Waste Audit',
    department: 'Manufacturing',
    auditor: 'S. Nair',
    date: '2026-06-12',
    findings: '3 minor issues',
    status: 'Completed',
  },
  {
    id: 2,
    title: 'Vendor Compliance Check',
    department: 'Procurement',
    auditor: 'R. Iyer',
    date: '2026-07-01',
    findings: '1 open issue',
    status: 'In Progress',
  },
  {
    id: 3,
    title: 'H2 Safety Audit',
    department: 'Manufacturing',
    auditor: 'A. Mehta',
    date: '2026-07-15',
    findings: 'Not yet started',
    status: 'Scheduled',
  },
];

export const complianceIssues = [
  { id: 1, issue: 'Missing MSDS sheets', severity: 'High', department: 'Manufacturing', status: 'Open', auditId: 1 },
  { id: 2, issue: 'Late vendor disclosure', severity: 'Medium', department: 'Procurement', status: 'Resolved', auditId: 2 },
];

export const challenges = [
  {
    id: 1,
    icon: 'bike',
    name: 'Sustainability Sprint',
    xp: 200,
    difficulty: 'Hard',
    deadline: '07/20',
    status: 'Active',
  },
  {
    id: 2,
    icon: 'recycle',
    name: 'Recycle Challenge',
    xp: 80,
    difficulty: 'Easy',
    deadline: '07/15',
    status: 'Under Review',
  },
  {
    id: 3,
    icon: 'tram',
    name: 'Commute Green Week',
    xp: 120,
    difficulty: 'Medium',
    deadline: '07/25',
    status: 'Draft',
  },
  {
    id: 4,
    icon: 'recycle',
    name: 'Zero Waste Week',
    xp: 150,
    difficulty: 'Medium',
    deadline: '06/30',
    status: 'Completed',
  },
  {
    id: 5,
    icon: 'bike',
    name: 'Paper Cut Drive',
    xp: 60,
    difficulty: 'Easy',
    deadline: '06/10',
    status: 'Archived',
  },
];

// Starting XP wallet for the demo's "current user" — mirrors the XP already
// earned from the one challenge above that's seeded as Completed (#4).
export const initialUserStats = {
  totalXP: 150,
  completedChallenges: 1,
};

export const badges = [
  { id: 1, name: 'Green Beginner', icon: 'seedling', unlockRule: { type: 'xp', threshold: 100 } },
  { id: 2, name: 'Carbon Saver', icon: 'earth', unlockRule: { type: 'xp', threshold: 500 } },
  { id: 3, name: 'Sustainability Champion', icon: 'trophy', unlockRule: { type: 'challengesCompleted', threshold: 5 } },
  { id: 4, name: 'Team Player', icon: 'star', unlockRule: { type: 'challengesCompleted', threshold: 2 } },
];

export const rewards = [
  {
    id: 1,
    icon: 'bottle',
    name: 'Reusable Water Bottle',
    description: 'Insulated EcoSphere-branded steel bottle.',
    xpCost: 50,
  },
  {
    id: 2,
    icon: 'tree',
    name: 'Plant a Tree in Your Name',
    description: 'We plant a tree with a reforestation partner and send you the certificate.',
    xpCost: 80,
  },
  {
    id: 3,
    icon: 'bag',
    name: 'EcoSphere Tote Bag',
    description: 'Organic cotton tote made from recycled fibers.',
    xpCost: 120,
  },
  {
    id: 4,
    icon: 'gift',
    name: '$25 Gift Card',
    description: 'Redeemable at any partner retailer.',
    xpCost: 250,
  },
  {
    id: 5,
    icon: 'parking',
    name: 'Premium Parking Spot',
    description: 'Reserved spot near the main entrance for one month.',
    xpCost: 300,
  },
  {
    id: 6,
    icon: 'calendar',
    name: 'Extra Day Off',
    description: 'One additional paid day off, redeemable any time this quarter.',
    xpCost: 400,
  },
];

// Individual leaderboard. "You" is the demo's current user and is kept in
// sync with the live XP wallet rather than a static number.
export const leaderboardIndividual = [
  { rank: 1, name: 'Aditi Rao', xp: 3910 },
  { rank: 2, name: 'Karan Shah', xp: 2870 },
  { rank: 3, name: 'You', xp: null, isCurrentUser: true },
  { rank: 4, name: 'Neha Verma', xp: 1180 },
  { rank: 5, name: 'S. Nair', xp: 940 },
];

export const leaderboardDepartment = [
  { rank: 1, name: 'Manufacturing Dept', xp: 4820 },
  { rank: 2, name: 'Corporate Dept', xp: 3505 },
  { rank: 3, name: 'Logistics Dept', xp: 2760 },
  { rank: 4, name: 'R&D Dept', xp: 1990 },
];

// Kept for backwards compatibility with anything still importing the
// original combined array.
export const leaderboard = leaderboardIndividual;

export const departments = [
  { id: 1, name: 'Manufacturing', code: 'MFG', head: 'S. Nair', parent: '—', employees: 134, status: 'Active' },
  { id: 2, name: 'Logistics', code: 'LOG', head: 'R. Iyer', parent: 'Manufacturing', employees: 58, status: 'Active' },
  { id: 3, name: 'Corporate', code: 'COR', head: 'A. Mehta', parent: '—', employees: 41, status: 'Active' },
];

export const esgConfigToggles = [
  { id: 'autoEmission', label: 'Enable auto emission calculation', enabled: true },
  { id: 'requireEvidence', label: 'Require evidence for all CSR activities', enabled: true },
  { id: 'autoBadges', label: 'Auto-award badges on challenge completion', enabled: false },
  { id: 'emailAlerts', label: 'Email alerts for new compliance issues', enabled: true },
];
