import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

interface CSVGuest {
  guestIndex: string;
  fName: string;
  lName: string;
  suffix: string;
  familyId: string;
  familyName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

// Function to parse CSV
function parseCSV(csvContent: string): CSVGuest[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',') as (keyof CSVGuest)[];
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: any = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });
    return row as CSVGuest;
  });
}

// Function to clean data
function cleanData(value: string | null | undefined): string | null {
  if (!value || value === 'FALSE' || value === 'false' || value === '') {
    return null;
  }
  return value.trim();
}

async function resetAndImportGuests() {
  try {
    console.log('Starting fresh import (deleting existing data)...');
    
    // Delete all existing data
    console.log('Deleting existing nicknames...');
    await prisma.nickname.deleteMany();
    
    console.log('Deleting existing guests...');
    await prisma.guest.deleteMany();
    
    console.log('Deleting existing groups...');
    await prisma.group.deleteMany();
    
    console.log('Deleting existing tables...');
    await prisma.table.deleteMany();
    
    console.log('Database cleared successfully!');
    
    // Read the CSV file
    const csvPath = '/Users/ryanarzenti/Downloads/guestListRa.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const guests = parseCSV(csvContent);
    
    console.log(`Found ${guests.length} guests to import`);
    
    // Group guests by familyId to create groups
    const familyGroups: { [key: string]: CSVGuest[] } = {};
    guests.forEach(guest => {
      const familyId = guest.familyId;
      if (familyId && familyId !== '0') {
        if (!familyGroups[familyId]) {
          familyGroups[familyId] = [];
        }
        familyGroups[familyId].push(guest);
      }
    });
    
    console.log(`Creating ${Object.keys(familyGroups).length} family groups...`);
    
    // Create groups and guests
    for (const [familyId, familyMembers] of Object.entries(familyGroups)) {
      const firstMember = familyMembers[0];
      
      // Create the group
      const groupData = {
        name: cleanData(firstMember.familyName),
        street1: cleanData(firstMember.street),
        city: cleanData(firstMember.city),
        state: cleanData(firstMember.state),
        postalCode: cleanData(firstMember.zipCode),
        country: 'USA'
      };
      
      console.log(`Creating group: ${groupData.name || 'Unnamed Group'}`);
      
      const group = await prisma.group.create({
        data: groupData
      });
      
      // Create guests for this group
      for (const guestData of familyMembers) {
        const firstName = cleanData(guestData.fName);
        const lastName = cleanData(guestData.lName);
        
        if (firstName && lastName) {
          const guestRecord = {
            firstName,
            lastName,
            suffix: cleanData(guestData.suffix),
            groupId: group.id,
            rsvpStatus: 'PENDING' as const,
            guestOf: 'RYAN' as const
          };
          
          console.log(`  Adding guest: ${firstName} ${lastName}`);
          
          await prisma.guest.create({
            data: guestRecord
          });
        }
      }
    }
    
    // Handle guests without family groups (familyId = 0 or missing)
    const orphanGuests = guests.filter(g => !g.familyId || g.familyId === '0');
    
    console.log(`Creating ${orphanGuests.length} individual guest records...`);
    
    for (const guestData of orphanGuests) {
      const firstName = cleanData(guestData.fName);
      const lastName = cleanData(guestData.lName);
      
      if (firstName && lastName) {
        // Create individual group for this guest
        const groupData = {
          name: cleanData(guestData.familyName) || `${firstName} ${lastName}`,
          street1: cleanData(guestData.street),
          city: cleanData(guestData.city),
          state: cleanData(guestData.state),
          postalCode: cleanData(guestData.zipCode),
          country: 'USA'
        };
        
        const group = await prisma.group.create({
          data: groupData
        });
        
        const guestRecord = {
          firstName,
          lastName,
          suffix: cleanData(guestData.suffix),
          groupId: group.id,
          rsvpStatus: 'PENDING' as const,
          guestOf: 'RYAN' as const
        };
        
        console.log(`Creating individual guest: ${firstName} ${lastName}`);
        
        await prisma.guest.create({
          data: guestRecord
        });
      }
    }
    
    console.log('Fresh import completed successfully!');
    
    // Print summary
    const totalGuests = await prisma.guest.count();
    const totalGroups = await prisma.group.count();
    
    console.log(`\nSummary:`);
    console.log(`Total guests imported: ${totalGuests}`);
    console.log(`Total groups created: ${totalGroups}`);
    
  } catch (error) {
    console.error('Error during fresh import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fresh import
resetAndImportGuests();
