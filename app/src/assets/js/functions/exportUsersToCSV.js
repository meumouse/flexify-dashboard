import { arrayToCSV } from './parseCSV.js';

/**
 * Export users to CSV file
 * @param {Array} users - Array of user objects
 * @param {Array} customFields - Array of custom field keys to include
 * @param {string} filename - Optional filename (default: 'users-export')
 */
export const exportUsersToCSV = (users, customFields = [], filename = 'users-export') => {
  if (!users || users.length === 0) {
    console.warn('No users to export');
    return;
  }

  // Define standard user fields
  const standardFields = [
    'id',
    'username',
    'email',
    'name',
    'first_name',
    'last_name',
    'url',
    'description',
    'roles',
    'registered',
    'avatar_url',
  ];

  // Combine standard fields with custom fields
  const allFields = [...standardFields, ...customFields];

  // Transform users data for CSV export
  const csvData = users.map((user) => {
    const row = {};
    
    allFields.forEach((field) => {
      if (field === 'roles') {
        // Handle roles array
        row[field] = Array.isArray(user.roles) ? user.roles.join('; ') : user.roles || '';
      } else if (field === 'registered') {
        // Format date
        row[field] = user.registered 
          ? new Date(user.registered).toLocaleDateString() 
          : '';
      } else if (customFields.includes(field)) {
        // Handle custom meta fields
        row[field] = user.meta?.[field] || user[field] || '';
      } else if (field === 'first_name' || field === 'last_name') {
        // Handle first_name and last_name from meta
        row[field] = user.meta?.[field] || user[field] || '';
      } else {
        // Standard field
        row[field] = user[field] || '';
      }
    });
    
    return row;
  });

  // Generate CSV content
  const csvContent = arrayToCSV(csvData, allFields);

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

