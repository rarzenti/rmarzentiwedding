import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateGroupNames() {
  // Get all groups with their guests
  const groups = await prisma.group.findMany({
    include: {
      guests: {
        orderBy: { sortOrder: 'asc' }
      }
    }
  });

  console.log(`Found ${groups.length} groups to process\n`);

  for (const group of groups) {
    const guests = group.guests;
    
    if (guests.length === 0) {
      console.log(`Group ${group.id}: No guests, skipping`);
      continue;
    }

    let newName: string;

    if (guests.length === 1) {
      // Single guest: "FirstName LastName"
      newName = `${guests[0].firstName} ${guests[0].lastName}`;
    } else if (guests.length === 2) {
      // Two guests
      const [guest1, guest2] = guests;
      
      if (guest1.lastName === guest2.lastName) {
        // Same last name: "First1 & First2 LastName"
        newName = `${guest1.firstName} & ${guest2.firstName} ${guest1.lastName}`;
      } else {
        // Different last names: "First1 Last1 & First2 Last2"
        newName = `${guest1.firstName} ${guest1.lastName} & ${guest2.firstName} ${guest2.lastName}`;
      }
    } else {
      // 3+ guests
      const lastNames = [...new Set(guests.map(g => g.lastName))];
      
      if (lastNames.length === 1) {
        // All same last name: "LastName Family"
        newName = `${lastNames[0]} Family`;
      } else {
        // Mixed last names: use the most common last name or first guest's last name
        const lastNameCounts = guests.reduce((acc, g) => {
          acc[g.lastName] = (acc[g.lastName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Find the most common last name
        const mostCommonLastName = Object.entries(lastNameCounts)
          .sort((a, b) => b[1] - a[1])[0][0];
        
        newName = `${mostCommonLastName} Family`;
      }
    }

    // Update the group name
    await prisma.group.update({
      where: { id: group.id },
      data: { name: newName }
    });

    console.log(`Updated: "${group.name || '(no name)'}" → "${newName}"`);
    console.log(`  Guests: ${guests.map(g => `${g.firstName} ${g.lastName}`).join(', ')}`);
    console.log('');
  }

  console.log('\nDone! All group names have been updated.');
}

updateGroupNames()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
