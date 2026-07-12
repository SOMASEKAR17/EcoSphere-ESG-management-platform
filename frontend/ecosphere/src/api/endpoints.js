import apiClient from './client';

/**
 * These functions are thin wrappers around the Axios instance.
 * Each mirrors a REST resource the real EcoSphere backend is expected to expose.
 * Until the backend is connected, calling components fall back to local mock
 * data (see src/data) so the UI stays fully functional in the meantime.
 */

// ---------- Dashboard ----------
export const getDashboardSummary = () => apiClient.get('/dashboard/summary');

// ---------- Environmental ----------
export const getEmissionFactors = () => apiClient.get('/environmental/emission-factors');
export const getProductESGProfiles = () => apiClient.get('/environmental/product-profiles');
export const getCarbonTransactions = () => apiClient.get('/environmental/carbon-transactions');
export const getEnvironmentalGoals = () => apiClient.get('/environmental/goals');
export const createEnvironmentalGoal = (payload) => apiClient.post('/environmental/goals', payload);
export const updateEnvironmentalGoal = (id, payload) => apiClient.put(`/environmental/goals/${id}`, payload);
export const deleteEnvironmentalGoal = (id) => apiClient.delete(`/environmental/goals/${id}`);

// ---------- Social ----------
export const getCSRActivities = () => apiClient.get('/social/csr-activities');
export const createCSRActivity = (payload) => apiClient.post('/social/csr-activities', payload);
export const getEmployeeParticipation = () => apiClient.get('/social/employee-participation');
export const approveParticipation = (id) => apiClient.post(`/social/employee-participation/${id}/approve`);
export const rejectParticipation = (id) => apiClient.post(`/social/employee-participation/${id}/reject`);
export const getDiversityDashboard = () => apiClient.get('/social/diversity-dashboard');

// ---------- Governance ----------
export const getPolicies = () => apiClient.get('/governance/policies');
export const getPolicyAcknowledgements = () => apiClient.get('/governance/policy-acknowledgements');
export const getAudits = () => apiClient.get('/governance/audits');
export const createAudit = (payload) => apiClient.post('/governance/audits', payload);
export const getComplianceIssues = () => apiClient.get('/governance/compliance-issues');

// ---------- Gamification ----------
export const getChallenges = () => apiClient.get('/gamification/challenges');
export const createChallenge = (payload) => apiClient.post('/gamification/challenges', payload);
export const joinChallenge = (id) => apiClient.post(`/gamification/challenges/${id}/join`);
export const getChallengeParticipation = () => apiClient.get('/gamification/challenge-participation');
export const getBadges = () => apiClient.get('/gamification/badges');
export const getRewards = () => apiClient.get('/gamification/rewards');
export const getLeaderboard = () => apiClient.get('/gamification/leaderboard');

// ---------- Reports ----------
export const generateReport = (type, filters) => apiClient.post(`/reports/${type}/generate`, filters);
export const runCustomReport = (filters) => apiClient.post('/reports/custom/run', filters);
export const exportReport = (type, format, filters) =>
  apiClient.post(`/reports/${type}/export/${format}`, filters, { responseType: 'blob' });

// ---------- Settings ----------
export const getDepartments = () => apiClient.get('/settings/departments');
export const createDepartment = (payload) => apiClient.post('/settings/departments', payload);
export const updateDepartment = (id, payload) => apiClient.put(`/settings/departments/${id}`, payload);
export const deleteDepartment = (id) => apiClient.delete(`/settings/departments/${id}`);
export const getCategories = () => apiClient.get('/settings/categories');
export const getESGConfiguration = () => apiClient.get('/settings/esg-configuration');
export const updateESGConfiguration = (payload) => apiClient.put('/settings/esg-configuration', payload);
export const getNotificationSettings = () => apiClient.get('/settings/notifications');
export const updateNotificationSettings = (payload) => apiClient.put('/settings/notifications', payload);
