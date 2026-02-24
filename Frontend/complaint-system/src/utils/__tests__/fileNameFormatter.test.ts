import { truncateFileName } from '../fileNameFormatter';

/**
 * Manual test cases for filename truncation
 * To run: import this file and call testTruncateFileName()
 */
export const testTruncateFileName = () => {
  const testCases = [
    {
      input: 'LU-AA-FO-33-Volunteer-Sign-Up-Form%20(1).docx',
      expected: 'Should truncate in middle, keep extension',
      maxLength: 30
    },
    {
      input: 'short.pdf',
      expected: 'Should remain unchanged',
      maxLength: 30
    },
    {
      input: 'A-Very-Long-Document-Name-With-Many-Characters-And-Words.pdf',
      expected: 'Should truncate middle, keep .pdf',
      maxLength: 35
    },
    {
      input: 'Another-Long-Filename-Example.docx',
      expected: 'Should truncate middle, keep .docx',
      maxLength: 25
    }
  ];

  console.log('=== Filename Truncation Tests ===\n');
  
  testCases.forEach(({ input, expected, maxLength }) => {
    const result = truncateFileName(input, maxLength);
    console.log(`Input:    ${input}`);
    console.log(`Expected: ${expected}`);
    console.log(`Result:   ${result}`);
    console.log(`Length:   ${result.length} (max: ${maxLength})`);
    console.log('---\n');
  });
};

// Example outputs for reference:
// LU-AA-FO-33-Volunteer-Sign-Up-Form%20(1).docx -> LU-AA-FO-33-Volun...m%20(1).docx
