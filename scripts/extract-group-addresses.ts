import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function extractGroupAddresses() {
  try {
    console.log('Extracting group address data...');
    
    // Get all groups with their address information
    const groups = await prisma.group.findMany({
      select: {
        name: true,
        street1: true,
        city: true,
        state: true,
        postalCode: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`Found ${groups.length} groups`);
    
    // Create CSV header
    const csvHeader = 'Group Name,Street,City,State,Zip\n';
    
    // Convert data to CSV format
    const csvData = groups.map(group => {
      return [
        group.name || '',
        group.street1 || '',
        group.city || '',
        group.state || '',
        group.postalCode || ''
      ].map(field => `"${field.replace(/"/g, '""')}"`) // Escape quotes in CSV
      .join(',');
    }).join('\n');
    
    const fullCsv = csvHeader + csvData;
    
    // Write to file
    const outputPath = '/Users/ryanarzenti/Desktop/rmArzentiWedding/group-addresses.csv';
    fs.writeFileSync(outputPath, fullCsv);
    
    console.log(`\nData exported to: ${outputPath}`);
    
    // Also display the data in console
    console.log('\nGroup Address Data:');
    console.log('==================');
    console.log('Group Name | Street | City | State | Zip');
    console.log('----------------------------------------');
    
    groups.forEach(group => {
      console.log(`${group.name || 'N/A'} | ${group.street1 || 'N/A'} | ${group.city || 'N/A'} | ${group.state || 'N/A'} | ${group.postalCode || 'N/A'}`);
    });
    
    console.log(`\nTotal groups: ${groups.length}`);
    
  } catch (error) {
    console.error('Error extracting group data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the extraction
extractGroupAddresses();
