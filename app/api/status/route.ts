import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  // აქ ჩასვი ის ბმული, რომელიც Publish-ის შემდეგ მიიღე
  const SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0-yqc2AoRKGkRKpATKYYfLYliAsKa8D3i2wwumGG4MtLYQEyoaj8cfnDUQEQmNKn5QhVoJdP0TR5U/pub?output=csv";

  try {
    // cache: 'no-store' აუცილებელია, რომ ყოველთვის ახალი მონაცემი წამოიღოს
    const response = await fetch(SHEETS_CSV_URL, { cache: 'no-store' });
    const csvData = await response.text();
    
    // CSV ტექსტის დაყოფა ხაზებად
    const rows = csvData.split('\n').map(row => row.split(','));
    
    // ვეძებთ სტატუსს ID-ის მიხედვით
    const deviceRow = rows.find(row => row[0].trim() === id);
    
    // თუ იპოვა - აბრუნებს სტატუსს, თუ არა - აბრუნებს "active"
    const status = deviceRow ? deviceRow[1].trim().toLowerCase() : "active";

    return NextResponse.json({ status: status });
  } catch (error) {
    console.error("Error fetching sheets:", error);
    return NextResponse.json({ status: "active" });
  }
}