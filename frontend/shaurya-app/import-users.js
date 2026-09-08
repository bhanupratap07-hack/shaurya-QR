const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const SUPABASE_URL = 'https://flyisjatbiaaorbobdfu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZseWlzamF0YmlhYW9yYm9iZGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjIyMzUsImV4cCI6MjEwNDA5ODIzNX0.aYwagmueKZYkuxKpGlGQoOGCYi8AlU_L3lDfrF3rzVU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importUsers() {
  const filePath = path.resolve('../participants - Sheet1.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const usersToInsert = [];
  let index = 1;

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      const name = row['Name'];
      let mobile = row['Contact No'];
      const college = row['College'];

      if (!name || name.trim() === '') return; // Skip empty rows

      // If mobile is missing or just special chars, make a dummy one
      if (!mobile || mobile.trim() === '' || !mobile.match(/\d/)) {
        mobile = `DUMMY-${index}`;
      } else {
        // Clean mobile number (remove non-digits, spaces, special chars like lrm)
        mobile = mobile.replace(/\D/g, '');
      }

      // Generate a dummy email since CSV doesn't have it
      const email = `${mobile}@shaurya.iitkgp.ac.in`;

      usersToInsert.push({
        name: name.trim(),
        mobile: mobile,
        college: college ? college.trim() : 'Unknown College',
        email: email,
        status: 'UNASSIGNED'
      });
      
      index++;
    })
    .on('end', async () => {
      console.log(`Parsed ${usersToInsert.length} users. Starting import...`);

      // Filter out duplicate mobiles from the CSV itself to prevent unique constraint errors
      const uniqueUsers = [];
      const mobileSet = new Set();
      for (const user of usersToInsert) {
        if (!mobileSet.has(user.mobile)) {
          mobileSet.add(user.mobile);
          uniqueUsers.push(user);
        }
      }

      console.log(`Found ${uniqueUsers.length} unique users after filtering duplicates.`);

      // Batch insert
      const chunkSize = 100;
      for (let i = 0; i < uniqueUsers.length; i += chunkSize) {
        const chunk = uniqueUsers.slice(i, i + chunkSize);
        const { error } = await supabase.from('users').upsert(chunk, { onConflict: 'mobile' });
        
        if (error) {
          console.error(`Error inserting batch ${i / chunkSize + 1}:`, error.message, error);
        } else {
          console.log(`Successfully inserted batch ${i / chunkSize + 1} (${chunk.length} users)`);
        }
      }

      console.log("User Import Complete!");
    });
}

importUsers();
