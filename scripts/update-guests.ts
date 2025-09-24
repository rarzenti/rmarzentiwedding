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

async function updateGuests() {
  try {
    console.log('Starting guest update...');
    
    // Read the updated CSV file
    const csvPath = '/Users/ryanarzenti/Downloads/guestListRa.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvGuests = parseCSV(csvContent);
    
    console.log(`Found ${csvGuests.length} guests in CSV`);
    
    // Get existing guests and groups from database
    const existingGuests = await prisma.guest.findMany({
      include: {
        group: true
      }
    });
    
    const existingGroups = await prisma.group.findMany();
    
    console.log(`Found ${existingGuests.length} existing guests in database`);
    console.log(`Found ${existingGroups.length} existing groups in database`);
    
    // Create a map of CSV guests by name for easy lookup
    const csvGuestMap = new Map<string, CSVGuest>();
    csvGuests.forEach(guest => {
      const key = `${cleanData(guest.fName)?.toLowerCase()}_${cleanData(guest.lName)?.toLowerCase()}`;
      csvGuestMap.set(key, guest);
    });
    
    let updatedGuests = 0;
    let updatedGroups = 0;
    let createdGuests = 0;
    let createdGroups = 0;
    
    // Group CSV guests by familyId
    const familyGroups: { [key: string]: CSVGuest[] } = {};
    csvGuests.forEach(guest => {
      const familyId = guest.familyId;
      if (familyId && familyId !== '0') {
        if (!familyGroups[familyId]) {
          familyGroups[familyId] = [];
        }
        familyGroups[familyId].push(guest);
      }
    });
    
    // Process each family group
    for (const [familyId, familyMembers] of Object.entries(familyGroups)) {
      const firstMember = familyMembers[0];
      const familyName = cleanData(firstMember.familyName);
      
      if (!familyName) continue;
      
      // Find or create the group
      let group = existingGroups.find(g => 
        g.name === familyName || 
        familyMembers.some(member => 
          existingGuests.some(eg => 
            eg.firstName.toLowerCase() === cleanData(member.fName)?.toLowerCase() &&
            eg.lastName.toLowerCase() === cleanData(member.lName)?.toLowerCase() &&
            eg.groupId === g.id
          )
        )
      );
      
      const newGroupData = {
        name: familyName,
        street1: cleanData(firstMember.street),
        city: cleanData(firstMember.city),
        state: cleanData(firstMember.state),
        postalCode: cleanData(firstMember.zipCode),
        country: 'USA'
      };
      
      if (group) {
        // Update group if data has changed
        const hasGroupChanges = 
          group.name !== newGroupData.name ||
          group.street1 !== newGroupData.street1 ||
          group.city !== newGroupData.city ||
          group.state !== newGroupData.state ||
          group.postalCode !== newGroupData.postalCode;
          
        if (hasGroupChanges) {
          console.log(`Updating group: ${group.name} -> ${newGroupData.name}`);
          await prisma.group.update({
            where: { id: group.id },
            data: newGroupData
          });
          updatedGroups++;
        }
      } else {
        // Create new group
        console.log(`Creating new group: ${newGroupData.name}`);
        group = await prisma.group.create({
          data: newGroupData
        });
        createdGroups++;
      }
      
      // Process each guest in the family
      for (const csvGuest of familyMembers) {
        const firstName = cleanData(csvGuest.fName);
        const lastName = cleanData(csvGuest.lName);
        
        if (!firstName || !lastName) continue;
        
        // Find existing guest
        const existingGuest = existingGuests.find(eg => 
          eg.firstName.toLowerCase() === firstName.toLowerCase() &&
          eg.lastName.toLowerCase() === lastName.toLowerCase()
        );
        
        const newGuestData = {
          firstName,
          lastName,
          suffix: cleanData(csvGuest.suffix),
          groupId: group.id,
          rsvpStatus: 'PENDING' as const
        };
        
        if (existingGuest) {
          // Update guest if data has changed
          const hasGuestChanges =
            existingGuest.firstName !== newGuestData.firstName ||
            existingGuest.lastName !== newGuestData.lastName ||
            existingGuest.suffix !== newGuestData.suffix ||
            existingGuest.groupId !== newGuestData.groupId;
            
          if (hasGuestChanges) {
            console.log(`Updating guest: ${existingGuest.firstName} ${existingGuest.lastName}`);
            await prisma.guest.update({
              where: { id: existingGuest.id },
              data: newGuestData
            });
            updatedGuests++;
          }
        } else {
          // Create new guest
          console.log(`Creating new guest: ${firstName} ${lastName}`);
          await prisma.guest.create({
            data: newGuestData
          });
          createdGuests++;
        }
      }
    }
    
    // Handle guests without family groups (familyId = 0 or missing)
    const orphanGuests = csvGuests.filter(g => !g.familyId || g.familyId === '0');
    
    for (const csvGuest of orphanGuests) {
      const firstName = cleanData(csvGuest.fName);
      const lastName = cleanData(csvGuest.lName);
      
      if (!firstName || !lastName) continue;
      
      // Find existing guest
      const existingGuest = existingGuests.find(eg => 
        eg.firstName.toLowerCase() === firstName.toLowerCase() &&
        eg.lastName.toLowerCase() === lastName.toLowerCase()
      );
      
      if (existingGuest) {
        // Update the guest's group if it has no name or needs updating
        if (!existingGuest.group?.name || existingGuest.group.name.includes('Unnamed')) {
          const newGroupData = {
            name: cleanData(csvGuest.familyName) || `${firstName} ${lastName}`,
            street1: cleanData(csvGuest.street),
            city: cleanData(csvGuest.city),
            state: cleanData(csvGuest.state),
            postalCode: cleanData(csvGuest.zipCode),
            country: 'USA'
          };
          
          console.log(`Updating group for ${firstName} ${lastName}: ${existingGuest.group?.name} -> ${newGroupData.name}`);
          await prisma.group.update({
            where: { id: existingGuest.groupId! },
            data: newGroupData
          });
          updatedGroups++;
        }
        
        // Update guest data if needed
        const newGuestData = {
          suffix: cleanData(csvGuest.suffix)
        };
        
        if (existingGuest.suffix !== newGuestData.suffix) {
          console.log(`Updating guest suffix: ${firstName} ${lastName}`);
          await prisma.guest.update({
            where: { id: existingGuest.id },
            data: newGuestData
          });
          updatedGuests++;
        }
      } else {
        // Create new guest and group
        const groupData = {
          name: cleanData(csvGuest.familyName) || `${firstName} ${lastName}`,
          street1: cleanData(csvGuest.street),
          city: cleanData(csvGuest.city),
          state: cleanData(csvGuest.state),
          postalCode: cleanData(csvGuest.zipCode),
          country: 'USA'
        };
        
        console.log(`Creating new individual group: ${groupData.name}`);
        const group = await prisma.group.create({
          data: groupData
        });
        createdGroups++;
        
        console.log(`Creating new individual guest: ${firstName} ${lastName}`);
        await prisma.guest.create({
          data: {
            firstName,
            lastName,
            suffix: cleanData(csvGuest.suffix),
            groupId: group.id,
            rsvpStatus: 'PENDING'
          }
        });
        createdGuests++;
      }
    }
    
    console.log('\nUpdate completed successfully!');
    
    // Print summary
    const totalGuests = await prisma.guest.count();
    const totalGroups = await prisma.group.count();
    
    console.log(`\nSummary:`);
    console.log(`Guests updated: ${updatedGuests}`);
    console.log(`Guests created: ${createdGuests}`);
    console.log(`Groups updated: ${updatedGroups}`);
    console.log(`Groups created: ${createdGroups}`);
    console.log(`Total guests in database: ${totalGuests}`);
    console.log(`Total groups in database: ${totalGroups}`);
    
  } catch (error) {
    console.error('Error updating guests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateGuests();
