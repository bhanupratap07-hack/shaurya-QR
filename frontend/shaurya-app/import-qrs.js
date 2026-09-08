const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Replace with your actual credentials from .env.local
const SUPABASE_URL = 'https://flyisjatbiaaorbobdfu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZseWlzamF0YmlhYW9yYm9iZGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjIyMzUsImV4cCI6MjEwNDA5ODIzNX0.aYwagmueKZYkuxKpGlGQoOGCYi8AlU_L3lDfrF3rzVU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importQRs() {
  console.log("Reading QR codes JSON...");
  const filePath = path.resolve('../shaurya-qr-codes/qr_codes_db_import.json');
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  const qrData = JSON.parse(rawData);

  console.log(`Found ${qrData.length} QR codes. Starting import...`);

  // We only need the unique_token for the database
  const formattedData = qrData.map(qr => ({
    unique_token: qr.unique_token,
    status: 'AVAILABLE'
  }));

  // Batch insert in chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < formattedData.length; i += chunkSize) {
    const chunk = formattedData.slice(i, i + chunkSize);
    const { error } = await supabase.from('qr_codes').insert(chunk);
    
    if (error) {
      console.error(`Error inserting batch ${i / chunkSize + 1}:`, error.message);
    } else {
      console.log(`Successfully inserted batch ${i / chunkSize + 1} (${chunk.length} codes)`);
    }
  }

  console.log("Import Complete!");
}

importQRs();
