// Blood group constants used throughout the app
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const BLOOD_GROUP_INFO = {
  'A+':  { canDonateTo: ['A+', 'AB+'], canReceiveFrom: ['A+', 'A-', 'O+', 'O-'], color: 'bg-red-600' },
  'A-':  { canDonateTo: ['A+', 'A-', 'AB+', 'AB-'], canReceiveFrom: ['A-', 'O-'], color: 'bg-red-700' },
  'B+':  { canDonateTo: ['B+', 'AB+'], canReceiveFrom: ['B+', 'B-', 'O+', 'O-'], color: 'bg-orange-600' },
  'B-':  { canDonateTo: ['B+', 'B-', 'AB+', 'AB-'], canReceiveFrom: ['B-', 'O-'], color: 'bg-orange-700' },
  'AB+': { canDonateTo: ['AB+'], canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], color: 'bg-purple-600' },
  'AB-': { canDonateTo: ['AB+', 'AB-'], canReceiveFrom: ['A-', 'B-', 'AB-', 'O-'], color: 'bg-purple-700' },
  'O+':  { canDonateTo: ['A+', 'B+', 'AB+', 'O+'], canReceiveFrom: ['O+', 'O-'], color: 'bg-green-600' },
  'O-':  { canDonateTo: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], canReceiveFrom: ['O-'], color: 'bg-green-700' },
};

// IMPORTANT: These compatibility rules are for general information only.
// Actual blood transfusion compatibility MUST be determined by qualified medical professionals
// and licensed blood banks through proper crossmatching procedures.
export const COMPATIBILITY_DISCLAIMER =
  'Blood group compatibility shown here is for general information only. ' +
  'Actual transfusion compatibility must be verified by qualified medical professionals and blood banks.';
