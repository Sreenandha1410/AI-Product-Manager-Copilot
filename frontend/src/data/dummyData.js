export const dummyFeedback = [
  { id: 1, title: 'App loses my changes sometimes', description: 'When my internet drops, I lose what I typed. Can we have auto save?', category: 'Feature Request', priority: 'High', sentiment: 'Negative', status: 'Reviewed', date: '2023-10-01' },
  { id: 2, title: 'Need dark mode', description: 'Working at night hurts my eyes. Please add a dark theme.', category: 'UI/UX', priority: 'Medium', sentiment: 'Neutral', status: 'New', date: '2023-10-02' },
  { id: 3, title: 'Export to PDF', description: 'I want to export my PRDs to PDF to share with stakeholders.', category: 'Feature Request', priority: 'Low', sentiment: 'Positive', status: 'In Progress', date: '2023-10-03' },
  { id: 4, title: 'Cannot login with SSO', description: 'Getting an error when trying to login using company Okta.', category: 'Authentication', priority: 'Critical', sentiment: 'Negative', status: 'Reviewed', date: '2023-10-04' },
  { id: 5, title: 'Love the new payment flow', description: 'The new Stripe integration is so much faster.', category: 'Payment', priority: 'Low', sentiment: 'Positive', status: 'Closed', date: '2023-10-05' },
  { id: 6, title: 'Dashboard is too slow', description: 'Loading time exceeds 8 seconds on large datasets.', category: 'Performance', priority: 'High', sentiment: 'Negative', status: 'Reviewed', date: '2023-10-06' },
  { id: 7, title: 'Voice upload for feedback', description: 'Would be cool to just speak my feedback into the app.', category: 'Feature Request', priority: 'Low', sentiment: 'Neutral', status: 'New', date: '2023-10-07' },
  { id: 8, title: 'CSV Import fails', description: 'Importing a CSV file with 10k rows crashes the browser.', category: 'Bug', priority: 'Critical', sentiment: 'Negative', status: 'In Progress', date: '2023-10-08' },
];

export const dummyFeatures = [
  { id: 101, title: 'Dark Mode', votes: 342, priority: 'High', businessImpact: 'Medium', status: 'Planned', aiRec: 'Strongly Recommended', effort: 'Medium', aiScore: 92 },
  { id: 102, title: 'Auto Save', votes: 289, priority: 'Critical', businessImpact: 'High', status: 'In Progress', aiRec: 'Mandatory', effort: 'High', aiScore: 98 },
  { id: 103, title: 'Export Feedback to PDF', votes: 215, priority: 'Medium', businessImpact: 'Low', status: 'Under Review', aiRec: 'Recommended', effort: 'Low', aiScore: 75 },
  { id: 104, title: 'CSV Import', votes: 189, priority: 'High', businessImpact: 'High', status: 'Planned', aiRec: 'Strongly Recommended', effort: 'High', aiScore: 88 },
  { id: 105, title: 'Email Notifications', votes: 156, priority: 'Medium', businessImpact: 'Medium', status: 'Backlog', aiRec: 'Neutral', effort: 'Medium', aiScore: 65 },
  { id: 106, title: 'Advanced Search', votes: 134, priority: 'Low', businessImpact: 'High', status: 'Backlog', aiRec: 'Recommended', effort: 'High', aiScore: 81 },
  { id: 107, title: 'Voice Feedback Upload', votes: 98, priority: 'Low', businessImpact: 'Low', status: 'Backlog', aiRec: 'Neutral', effort: 'Medium', aiScore: 45 },
  { id: 108, title: 'AI Release Notes', votes: 312, priority: 'High', businessImpact: 'High', status: 'In Progress', aiRec: 'Strongly Recommended', effort: 'High', aiScore: 95 },
  { id: 109, title: 'Multi-language Support', votes: 245, priority: 'Medium', businessImpact: 'High', status: 'Planned', aiRec: 'Recommended', effort: 'High', aiScore: 86 }
];

export const dummyRoadmap = [
  { id: 'm1', title: 'Authentication & Security', status: 'Completed', progress: 100, quarter: 'Q1' },
  { id: 'm2', title: 'Performance Improvements', status: 'In Progress', progress: 85, quarter: 'Q1' },
  { id: 'm3', title: 'Dark Mode & UI Updates', status: 'In Progress', progress: 65, quarter: 'Q2' },
  { id: 'm4', title: 'AI Release Notes', status: 'In Progress', progress: 30, quarter: 'Q2' },
  { id: 'm5', title: 'Auto Save', status: 'Planned', progress: 0, quarter: 'Q3' },
  { id: 'm6', title: 'Multi-language Support', status: 'Planned', progress: 0, quarter: 'Q3' },
  { id: 'm7', title: 'Advanced Search', status: 'Planned', progress: 0, quarter: 'Q4' },
  { id: 'm8', title: 'Voice Feedback Upload', status: 'Planned', progress: 0, quarter: 'Q4' }
];

export const chartData = {
  feedbackTrend: [
    { name: 'Jan', feedback: 400 },
    { name: 'Feb', feedback: 300 },
    { name: 'Mar', feedback: 550 },
    { name: 'Apr', feedback: 480 },
    { name: 'May', feedback: 600 },
    { name: 'Jun', feedback: 800 }
  ],
  sentimentDistribution: [
    { name: 'Positive', value: 400, color: '#10B981' },
    { name: 'Neutral', value: 300, color: '#F59E0B' },
    { name: 'Negative', value: 300, color: '#EF4444' }
  ]
};
