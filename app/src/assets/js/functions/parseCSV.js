/**
 * Parse CSV file content into an array of objects
 * @param {string} csvContent - The CSV file content as a string
 * @param {Object} options - Parsing options
 * @param {string} options.delimiter - CSV delimiter (default: ',')
 * @param {boolean} options.hasHeaders - Whether the CSV has headers (default: true)
 * @returns {Object} Object with headers array and rows array
 */
export const parseCSV = (csvContent, options = {}) => {
  const { delimiter = ',', hasHeaders = true } = options;
  
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse CSV line handling quoted values
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  };

  const headers = hasHeaders ? parseCSVLine(lines[0]) : [];
  const rows = [];

  // Start from line 1 if headers exist, otherwise from line 0
  const startIndex = hasHeaders ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (hasHeaders) {
      // Create object with headers as keys
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    } else {
      // Return as array
      rows.push(values);
    }
  }

  return { headers, rows };
};

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Optional array of headers (if not provided, uses object keys)
 * @returns {string} CSV string
 */
export const arrayToCSV = (data, headers = null) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Escape CSV value
  const escapeCSVValue = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // Handle arrays and objects
    if (typeof value === 'object' && !Array.isArray(value)) {
      return JSON.stringify(value);
    }
    
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    const escaped = stringValue.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
      return `"${escaped}"`;
    }
    
    return escaped;
  };

  // Create CSV rows
  const csvRows = [
    csvHeaders.map(escapeCSVValue).join(','),
    ...data.map(row => 
      csvHeaders.map(header => escapeCSVValue(row[header])).join(',')
    )
  ];

  return csvRows.join('\n');
};

