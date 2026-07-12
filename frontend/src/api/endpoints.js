import apiClient from './client';

/**
 * API endpoint wrappers matching the actual backend router paths.
 * All paths are relative to the apiClient baseURL (/api).
 */

// ---------- Auth ----------
export const login = (payload) => apiClient.post('/auth/login', payload);
export const register = (payload) => apiClient.post('/auth/register', payload);
export const devLogin = () => apiClient.post('/auth/dev-login');
export const getMe = () => apiClient.get('/auth/me');
export const logout = () => apiClient.post('/auth/logout');

// ---------- Scores / Dashboard ----------
export const getDepartmentScores = () => apiClient.get('/scores/departments');
export const getOverallScore = () => apiClient.get('/scores/overall');
export const getScoreTrend = (departmentId) =>
  apiClient.get('/scores/trend', { params: departmentId ? { department_id: departmentId } : {} });

// ---------- Environmental ----------
export const getEmissionFactors = () => apiClient.get('/emission-factors');
export const createEmissionFactor = (payload) => apiClient.post('/emission-factors', payload);
export const updateEmissionFactor = (id, payload) => apiClient.put(`/emission-factors/${id}`, payload);
export const deleteEmissionFactor = (id) => apiClient.delete(`/emission-factors/${id}`);

export const getProductEsgProfiles = () => apiClient.get('/product-esg-profiles');
export const createProductEsgProfile = (payload) => apiClient.post('/product-esg-profiles', payload);

export const getCarbonTransactions = (params) => apiClient.get('/carbon-transactions', { params });
export const createCarbonTransaction = (payload) => apiClient.post('/carbon-transactions', payload);
export const autoGenerateCarbonTransaction = (payload) => apiClient.post('/carbon-transactions/auto-generate', payload);

export const getEnvironmentalGoals = (departmentId) =>
  apiClient.get('/environmental-goals', { params: departmentId ? { department_id: departmentId } : {} });
export const createEnvironmentalGoal = (payload) => apiClient.post('/environmental-goals', payload);
export const updateEnvironmentalGoal = (id, payload) => apiClient.put(`/environmental-goals/${id}`, payload);
export const deleteEnvironmentalGoal = (id) => apiClient.delete(`/environmental-goals/${id}`);

// ---------- Social ----------
export const getCSRActivities = () => apiClient.get('/csr-activities');
export const createCSRActivity = (payload) => apiClient.post('/csr-activities', payload);
export const updateCSRActivity = (id, payload) => apiClient.put(`/csr-activities/${id}`, payload);
export const participateInCSR = (id, proofFile) => {
  if (proofFile) {
    const formData = new FormData();
    formData.append('proof_file', proofFile);
    return apiClient.post(`/csr-activities/${id}/participate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return apiClient.post(`/csr-activities/${id}/participate`);
};

export const getCSRParticipation = (status) =>
  apiClient.get('/csr-participation', { params: status ? { status } : {} });
export const approveParticipation = (id) => apiClient.put(`/csr-participation/${id}/approve`);
export const rejectParticipation = (id, reason) =>
  apiClient.put(`/csr-participation/${id}/reject`, { reason });

export const getDiversityMetrics = (departmentId) =>
  apiClient.get('/diversity-metrics', { params: departmentId ? { department_id: departmentId } : {} });

// ---------- Governance ----------
export const getPolicies = () => apiClient.get('/policies');
export const createPolicy = (payload) => apiClient.post('/policies', payload);
export const updatePolicy = (id, payload) => apiClient.put(`/policies/${id}`, payload);
export const acknowledgePolicy = (policyId) => apiClient.post(`/policies/${policyId}/acknowledge`);
export const getPolicyAcknowledgements = () => apiClient.get('/policy-acknowledgements');

export const getAudits = () => apiClient.get('/audits');
export const createAudit = (payload) => apiClient.post('/audits', payload);
export const updateAudit = (id, payload) => apiClient.put(`/audits/${id}`, payload);

export const getComplianceIssues = () => apiClient.get('/compliance-issues');
export const createComplianceIssue = (payload) => apiClient.post('/compliance-issues', payload);
export const updateComplianceIssue = (id, payload) => apiClient.put(`/compliance-issues/${id}`, payload);

// ---------- Gamification ----------
export const getChallenges = (status) =>
  apiClient.get('/challenges', { params: status ? { status } : {} });
export const createChallenge = (payload) => apiClient.post('/challenges', payload);
export const updateChallenge = (id, payload) => apiClient.put(`/challenges/${id}`, payload);
export const joinChallenge = (id) => apiClient.post(`/challenges/${id}/join`);

export const getChallengeParticipation = (status) =>
  apiClient.get('/challenge-participation', { params: status ? { status } : {} });
export const approveChallengeParticipation = (id) =>
  apiClient.put(`/challenge-participation/${id}/approve`);

export const getBadges = () => apiClient.get('/badges');
export const getMyBadges = () => apiClient.get('/badges/me');

export const getRewards = () => apiClient.get('/rewards');
export const redeemReward = (id) => apiClient.post(`/rewards/${id}/redeem`);
export const getMyRedemptions = () => apiClient.get('/rewards/redemptions/me');

export const getLeaderboard = () => apiClient.get('/leaderboard');

// ---------- Departments & Categories ----------
export const getDepartments = () => apiClient.get('/departments');
export const createDepartment = (payload) => apiClient.post('/departments', payload);
export const updateDepartment = (id, payload) => apiClient.put(`/departments/${id}`, payload);
export const deleteDepartment = (id) => apiClient.delete(`/departments/${id}`);

export const getCategories = (type) =>
  apiClient.get('/categories', { params: type ? { type } : {} });

// ---------- Settings ----------
export const getESGConfig = () => apiClient.get('/settings/config');
export const updateESGConfig = (payload) => apiClient.put('/settings/config', payload);
export const getNotificationPreferences = () => apiClient.get('/settings/notification-preferences');
export const updateNotificationPreferences = (payload) =>
  apiClient.put('/settings/notification-preferences', payload);

// ---------- Employees ----------
export const getEmployees = () => apiClient.get('/employees');

// ---------- Notifications ----------
export const getNotifications = () => apiClient.get('/notifications');
export const markNotificationRead = (id) => apiClient.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => apiClient.put('/notifications/read-all');

// ---------- Admin: Role Management ----------
export const updateEmployeeRole = (employeeId, role) =>
  apiClient.put(`/auth/employees/${employeeId}/role`, { role });
