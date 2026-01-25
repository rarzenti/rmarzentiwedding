import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface CSVGuest {
  Title: string;
  'Guest fName': string;
  'Guest lName': string;
  'Group Name': string;
  Street: string;
  Apt: string;
  City: string;
  State: string;
  Zip: string;
  Country: string;
}

// Function to parse CSV (handles quoted fields with commas)
function parseCSV(csvContent: string): CSVGuest[] {
  const lines = csvContent.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });
    return row as unknown as CSVGuest;
  });
}

// Parse a CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

// Function to clean data
function cleanData(value: string | null | undefined): string | null {
  if (!value || value === 'FALSE' || value === 'false' || value === '' || value === 'UPDATE' || value === 'UPDATE ADDRESS') {
    return null;
  }
  return value.trim();
}

// Function to generate group name based on guests
function generateGroupName(guests: CSVGuest[]): string {
  if (guests.length === 0) return 'Unknown Group';
  
  const guestNames = guests.map(g => ({
    firstName: g['Guest fName'],
    lastName: g['Guest lName']
  })).filter(g => g.firstName && g.lastName && !g.firstName.includes('?') && !g.lastName.includes('?'));
  
  if (guestNames.length === 0) return 'Unknown Group';
  
  // Get unique last names
  const lastNames = [...new Set(guestNames.map(g => g.lastName))];
  
  if (guestNames.length === 1) {
    // Single guest: "FirstName LastName"
    return `${guestNames[0].firstName} ${guestNames[0].lastName}`;
  } else if (guestNames.length === 2) {
    if (lastNames.length === 1) {
      // Same last name: "First1 & First2 LastName"
      return `${guestNames[0].firstName} & ${guestNames[1].firstName} ${lastNames[0]}`;
    } else {
      // Different last names: "First1 Last1 & First2 Last2"
      return `${guestNames[0].firstName} ${guestNames[0].lastName} & ${guestNames[1].firstName} ${guestNames[1].lastName}`;
    }
  } else {
    // 3+ guests: "LastName Family"
    // Find the most common last name
    const lastNameCounts: Record<string, number> = {};
    guestNames.forEach(g => {
      lastNameCounts[g.lastName] = (lastNameCounts[g.lastName] || 0) + 1;
    });
    const mostCommonLastName = Object.entries(lastNameCounts).sort((a, b) => b[1] - a[1])[0][0];
    return `${mostCommonLastName} Family`;
  }
}

async function importMarshaGuests() {
  try {
    console.log('Starting Marsha guest import...');
    
    // Read the CSV file
    const csvPath = path.join(__dirname, '../marshaGuestImportData/Wedding Planning - MarshaGuests .csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const guests = parseCSV(csvContent);
    
    console.log(`Found ${guests.length} guests to import`);
    
    // Group guests by Group Name
    const groupMap: Map<string, CSVGuest[]> = new Map();
    guests.forEach(guest => {
      const groupName = guest['Group Name'];
      if (groupName) {
        if (!groupMap.has(groupName)) {
          groupMap.set(groupName, []);
        }
        groupMap.get(groupName)!.push(guest);
      }
    });
    
    console.log(`Creating ${groupMap.size} groups...`);
    
    let groupsCreated = 0;
    let guestsCreated = 0;
    
    // Create groups and guests
    for (const [originalGroupName, groupMembers] of groupMap) {
      const firstMember = groupMembers[0];
      
      // Generate the proper group name
      const generatedName = generateGroupName(groupMembers);
      
      // Build address - combine Street and Apt
      let street1 = cleanData(firstMember.Street);
      const street2 = cleanData(firstMember.Apt);
      
      // Create the group
      const groupData = {
        name: generatedName,
        street1: street1,
        street2: street2,
        city: cleanData(firstMember.City),
        state: cleanData(firstMember.State),
        postalCode: cleanData(firstMember.Zip),
        country: cleanData(firstMember.Country) || 'USA'
      };
      
      console.log(`\nCreating group: "${generatedName}" (was: "${originalGroupName}")`);
      if (groupData.street1) {
        console.log(`  Address: ${groupData.street1}${groupData.street2 ? ', ' + groupData.street2 : ''}, ${groupData.city}, ${groupData.state} ${groupData.postalCode}`);
      }
      
      const group = await prisma.group.create({
        data: groupData
      });
      groupsCreated++;
      
      // Create guests for this group
      let sortOrder = 0;
      for (const guestData of groupMembers) {
        const firstName = cleanData(guestData['Guest fName']);
        const lastName = cleanData(guestData['Guest lName']);
        
        // Import all guests as typed (don't skip any)
        if (!firstName || !lastName) {
          console.log(`  Skipping guest with missing name: ${firstName} ${lastName}`);
          continue;
        }
        
        const title = cleanData(guestData.Title);
        
        const guestRecord = {
          firstName,
          lastName,
          title: title,
          groupId: group.id,
          guestOf: 'MARSHA' as const,
          rsvpStatus: 'PENDING' as const,
          sortOrder: sortOrder++
        };
        
        await prisma.guest.create({
          data: guestRecord
        });
        
        console.log(`  Created guest: ${title ? title + ' ' : ''}${firstName} ${lastName}`);
        guestsCreated++;
      }
    }
    
    console.log(`\n========================================`);
    console.log(`Import complete!`);
    console.log(`Groups created: ${groupsCreated}`);
    console.log(`Guests created: ${guestsCreated}`);
    console.log(`========================================`);
    
  } catch (error) {
    console.error('Error importing guests:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importMarshaGuests();
